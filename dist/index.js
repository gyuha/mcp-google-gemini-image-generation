import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs-extra';
import http from 'http';
import url from 'url';
import readline from 'readline';
import { generateImage } from './gemini-client.js';
import { ensureDirectoryExists } from './image-utils.js';
// Load environment variables from .env and .env.local
dotenv.config();
// Check if .env.local exists and load it (will override .env values)
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
    const envLocal = dotenv.parse(fs.readFileSync(envLocalPath));
    for (const key in envLocal) {
        process.env[key] = envLocal[key];
    }
}
// Default settings
const DEFAULT_PORT = parseInt(process.env.PORT || '23032');
const DEFAULT_HOST = process.env.HOST || 'localhost';
const DEFAULT_OUTPUT_DIR = path.resolve(process.env.DEFAULT_OUTPUT_DIR || './generated-images');
// Ensure output directory exists
ensureDirectoryExists(DEFAULT_OUTPUT_DIR);
// Define the Gemini image generation provider
const geminiImageProvider = {
    id: 'gemini-image-generator',
    displayName: 'Gemini Image Generator',
    description: 'Generate images using Google Gemini API',
    // Available models
    models: [
        {
            id: 'gemini-2.0-flash-preview-image-generation',
            displayName: 'Gemini 2.0 Flash',
            description: 'Fast image generation model',
            contextWindow: 4096,
        },
        {
            id: 'gemini-2.0-pro-001',
            displayName: 'Gemini 2.0 Pro',
            description: 'High quality image generation model',
            contextWindow: 4096,
        },
        {
            id: 'gemini-1.5-pro-latest',
            displayName: 'Gemini 1.5 Pro',
            description: 'Gemini 1.5 Pro image generation capability',
            contextWindow: 4096,
        }
    ],
    // Capabilities
    capabilities: {
        imageGeneration: true
    }
};
/**
 * Parse JSON request body from a HTTP request
 */
async function parseRequestBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => {
            chunks.push(chunk);
        });
        req.on('end', () => {
            try {
                const data = Buffer.concat(chunks).toString();
                const json = JSON.parse(data);
                resolve(json);
            }
            catch (error) {
                reject(new Error('Invalid JSON request body'));
            }
        });
        req.on('error', reject);
    });
}
/**
 * Handle MCP requests for image generation
 */
async function handleMCPRequest(req, res) {
    try {
        console.log('📢[index.ts:93]: req: ', req);
        const requestBody = await parseRequestBody(req);
        const parsedUrl = url.parse(req.url || '', true);
        const pathSegments = parsedUrl.pathname?.split('/').filter(Boolean) || [];
        // MCP API versioning
        if (pathSegments[0] === 'v1') {
            // Handle provider information request
            if (pathSegments[1] === 'providers' && pathSegments[2] === geminiImageProvider.id && !pathSegments[3]) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(geminiImageProvider));
                return;
            }
            // Handle generation request
            if (pathSegments[1] === 'providers' && pathSegments[2] === geminiImageProvider.id && pathSegments[3] === 'generations') {
                const context = requestBody.context || {};
                // Extract parameters
                const prompt = context.prompt || '';
                if (!prompt) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        error: 'A prompt is required for image generation'
                    }));
                    return;
                }
                const model = context.model || 'gemini-2.0-flash-preview-image-generation';
                const width = context.width || 1024;
                const height = context.height || 1024;
                const outputDir = context.outputDir || DEFAULT_OUTPUT_DIR;
                // Generate the image
                const result = await generateImage(prompt, model, width, height, outputDir);
                if (!result.success || !result.imagePath) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        error: result.error || 'Failed to generate image'
                    }));
                    return;
                }
                // Return successful response
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    content: `Image generated successfully: ${result.imagePath}`,
                    metadata: {
                        imagePath: result.imagePath,
                        prompt,
                        width,
                        height,
                        model
                    }
                }));
                return;
            }
        }
        // Handle invalid endpoints
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
    catch (error) {
        console.error('Error handling request:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        }));
    }
}
/**
 * Handle stdio communication for VSCode MCP integration
 */
function handleStdioMode() {
    console.log('Starting MCP server in stdio mode for VSCode/Cursor integration');
    // Create readline interface for stdin/stdout
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });
    // Listen for messages from VSCode
    rl.on('line', async (line) => {
        console.log('📢 Received request through stdio:', line);
        try {
            if (!line.trim())
                return;
            // Parse incoming message
            const message = JSON.parse(line);
            // Handle JSON-RPC initialization
            if (message.jsonrpc === '2.0' && message.method === 'initialize') {
                console.log('📢 Handling initialize request');
                const response = {
                    jsonrpc: '2.0',
                    id: message.id,
                    result: {
                        capabilities: {}
                    }
                };
                console.log(JSON.stringify(response));
                return;
            }
            // Handle MCP lookup request
            if (message.lookup === 'properties') {
                console.log('📢 Handling properties lookup');
                const response = {
                    result: geminiImageProvider
                };
                console.log(JSON.stringify(response));
                return;
            }
            // Handle MCP image generation request
            if (message.call && message.call.context) {
                console.log('📢 Handling image generation request:', message.call);
                const context = message.call.context;
                const prompt = context.prompt || message.call.user_input || '';
                if (!prompt) {
                    console.log(JSON.stringify({
                        result: {
                            success: false,
                            error: 'A prompt is required for image generation'
                        }
                    }));
                    return;
                }
                const model = context.model || 'gemini-2.0-flash-preview-image-generation';
                const width = context.width || 1024;
                const height = context.height || 1024;
                const outputDir = context.outputDir || DEFAULT_OUTPUT_DIR;
                try {
                    const result = await generateImage(prompt, model, width, height, outputDir);
                    if (!result.success) {
                        console.log(JSON.stringify({
                            result: {
                                success: false,
                                error: result.error || 'Failed to generate image'
                            }
                        }));
                        return;
                    }
                    console.log(JSON.stringify({
                        result: {
                            success: true,
                            message: 'Image generated successfully',
                            imagePath: result.imagePath
                        }
                    }));
                }
                catch (error) {
                    console.error('Error generating image:', error);
                    console.log(JSON.stringify({
                        result: {
                            success: false,
                            error: error instanceof Error ? error.message : 'Unknown error occurred'
                        }
                    }));
                }
                return;
            }
            console.log(`Unknown message type: ${JSON.stringify(message)}`);
        }
        catch (error) {
            console.error('Error processing message:', error);
        }
    });
    // Handle process termination
    process.on('SIGINT', () => {
        console.log('MCP server terminating');
        process.exit(0);
    });
    // Log to stderr instead of stdout to avoid interfering with protocol
    console.log = console.error;
}
/**
 * Start the MCP server
 */
export function startServer(port = DEFAULT_PORT, host = DEFAULT_HOST) {
    // Create HTTP server for MCP
    const server = http.createServer(async (req, res) => {
        const parsedUrl = url.parse(req.url || '', true);
        // Set CORS headers for all responses
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        // Handle preflight OPTIONS request
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }
        // Process MCP request
        if (req.method === 'POST' || req.method === 'GET') {
            await handleMCPRequest(req, res);
        }
        else {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
    });
    // Start server
    server.listen(port, host, () => {
        console.log(`MCP Gemini Image Generator server running at http://${host}:${port}/`);
        console.log(`Images will be saved to: ${DEFAULT_OUTPUT_DIR}`);
        // Check if API key is set
        console.log('📢[index.ts:201]: process.env.GOOGLE_API_KEY: ', process.env.GOOGLE_API_KEY);
        if (!process.env.GOOGLE_API_KEY) {
            console.warn('⚠️  Warning: GOOGLE_API_KEY is not set in environment variables');
            console.warn('Please set your API key in .env or .env.local file');
        }
    });
    return server;
}
// Start the server when this file is executed directly
if (import.meta.url.endsWith('/index.js') || import.meta.url.endsWith('/index.ts')) {
    // Check if we're running in stdio mode
    if (process.argv.includes('--stdio')) {
        handleStdioMode();
    }
    else {
        startServer();
    }
}
export default { startServer, handleStdioMode };
