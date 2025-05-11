import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { saveBase64Image, generateUniqueFilename } from './image-utils.js';
// Load environment variables
dotenv.config();
// Get API key from environment variables
const API_KEY = process.env.GOOGLE_API_KEY;
// Default output directory
const DEFAULT_OUTPUT_DIR = process.env.DEFAULT_OUTPUT_DIR || './generated-images';
/**
 * Generates an image using Google's Gemini API
 */
export async function generateImage(prompt, model = 'gemini-2.0-flash-001', width = 1024, height = 1024, outputDir = DEFAULT_OUTPUT_DIR) {
    try {
        if (!API_KEY) {
            throw new Error('GOOGLE_API_KEY is not set in environment variables');
        }
        console.log(`Generating image with prompt: "${prompt}"`);
        console.log(`Using model: ${model}, dimensions: ${width}x${height}`);
        // Initialize the Gemini API client
        const genAI = new GoogleGenerativeAI(API_KEY);
        const geminiModel = genAI.getGenerativeModel({
            model,
            generationConfig: {
                responseMimeType: 'image/png',
            }
        });
        // Generate the image
        const result = await geminiModel.generateContent({
            contents: [{
                    role: 'user',
                    parts: [{
                            text: `Generate an image with dimensions ${width}x${height}: ${prompt}`
                        }]
                }]
        });
        const response = await result.response;
        // Check if we have any parts in the response
        if (!response.candidates?.[0]?.content?.parts || response.candidates[0].content.parts.length === 0) {
            throw new Error('No content received from Gemini API');
        }
        // Find the part containing image data
        const part = response.candidates[0].content.parts.find(part => part.inlineData?.mimeType?.startsWith('image/'));
        if (!part || !part.inlineData) {
            throw new Error('No image data found in response');
        }
        // Save the image
        const filename = generateUniqueFilename(prompt);
        const imagePath = saveBase64Image(part.inlineData.data, outputDir, filename);
        return {
            success: true,
            imagePath
        };
    }
    catch (error) {
        console.error('Error generating image:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}
