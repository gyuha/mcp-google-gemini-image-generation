import http from 'http';
import url from 'url';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs-extra';
import { generateImage } from './gemini-client.js';
import { MCPLLMDefinition, MCPLLMCallResult, MCPLLMCallContext } from './types.js';
import { ensureDirectoryExists } from './image-utils.js';

// Load environment variables
dotenv.config();

// Default settings
const DEFAULT_PORT = parseInt(process.env.PORT || '23032');
const DEFAULT_HOST = process.env.HOST || 'localhost';
const DEFAULT_OUTPUT_DIR = path.resolve(process.env.DEFAULT_OUTPUT_DIR || './generated-images');

// Ensure output directory exists
ensureDirectoryExists(DEFAULT_OUTPUT_DIR);

// Define MCP LLM for Gemini image generation
const geminiImageGenerator: MCPLLMDefinition = {
  name: 'gemini-image-generator',
  properties: {
    description: 'MCP server for generating images using Google Gemini API',
    models: ['gemini-2.0-flash-001', 'gemini-2.0-pro-001', 'gemini-1.5-pro-latest'],
    features: ['image-generation', 'text-to-image'],
  },
  
  // Main call handler
  async call({ context, user_input }): Promise<MCPLLMCallResult> {
    console.log('Received MCP request:', { context, user_input });
    
    try {
      // Extract parameters from context
      const prompt = context.prompt || user_input;
      const model = context.model || 'gemini-2.0-flash-001';
      const width = context.width || 1024;
      const height = context.height || 1024;
      const outputDir = context.outputDir || DEFAULT_OUTPUT_DIR;
      
      // Validate prompt
      if (!prompt) {
        return {
          result: {
            success: false,
            error: 'A prompt is required for image generation'
          }
        };
      }
      
      // Generate the image using Gemini API
      const result = await generateImage(prompt, model, width, height, outputDir);
      
      if (result.success && result.imagePath) {
        return {
          result: {
            success: true,
            message: 'Image generated successfully',
            imagePath: result.imagePath
          }
        };
      } else {
        return {
          result: {
            success: false,
            error: result.error || 'Unknown error occurred during image generation'
          }
        };
      }
      
    } catch (error) {
      console.error('Error in MCP call handler:', error);
      return {
        result: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        }
      };
    }
  }
};

/**
 * Parse JSON request body from a HTTP request
 */
async function parseRequestBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    
    req.on('data', (chunk) => {
      chunks.push(chunk);
    });
    
    req.on('end', () => {
      try {
        const data = Buffer.concat(chunks).toString();
        const json = JSON.parse(data);
        resolve(json);
      } catch (error) {
        reject(new Error('Invalid JSON request body'));
      }
    });
    
    req.on('error', reject);
  });
}

/**
 * Process MCP request
 */
async function handleMCPRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  try {
    const requestBody = await parseRequestBody(req);
    
    // Process based on MCP protocol
    if (requestBody.lookup === 'properties') {
      // Return model properties
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ result: geminiImageGenerator.properties }));
    } else if (requestBody.call) {
      // Handle LLM call
      const result = await geminiImageGenerator.call({
        context: requestBody.call.context || {},
        user_input: requestBody.call.user_input || ''
      });
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } else {
      // Unknown request
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Invalid MCP request. Expected "lookup" or "call" property.' 
      }));
    }
  } catch (error) {
    console.error('Error handling request:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error' 
    }));
  }
}

/**
 * Start the MCP server
 */
export function startServer(port: number = DEFAULT_PORT, host: string = DEFAULT_HOST): http.Server {
  // Create HTTP server for MCP
  const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url || '', true);
    
    // Set CORS headers for all responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    
    // Only accept POST requests to root path
    if (req.method === 'POST' && parsedUrl.pathname === '/') {
      await handleMCPRequest(req, res);
    } else {
      // Not found
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });
  
  // Start server
  server.listen(port, host, () => {
    console.log(`MCP Gemini Image Generator server running at http://${host}:${port}/`);
    console.log(`Images will be saved to: ${DEFAULT_OUTPUT_DIR}`);
  });
  
  return server;
}

// Start the server when this file is executed directly
if (import.meta.url === url.pathToFileURL(process.argv[1]).href) {
  startServer();
}

export default { startServer };