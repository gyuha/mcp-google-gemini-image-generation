import dotenv from 'dotenv';
import fs from 'fs-extra';
import path from 'path';
import { saveBase64Image, generateUniqueFilename } from './image-utils.js';
import { ImageGenerationResult } from './types.js';

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

// Get API key from environment variables
const API_KEY = process.env.GOOGLE_API_KEY;
// Default output directory
const DEFAULT_OUTPUT_DIR = process.env.DEFAULT_OUTPUT_DIR || './generated-images';

/**
 * Generates an image using Google's Gemini API
 */
export async function generateImage(
  prompt: string,
  model: string = 'gemini-2.0-flash-001', 
  width: number = 1024,
  height: number = 1024,
  outputDir: string = DEFAULT_OUTPUT_DIR
): Promise<ImageGenerationResult> {
  try {
    const API_KEY = process.env.GOOGLE_API_KEY;
    if (!API_KEY) {
      throw new Error('GOOGLE_API_KEY is not set in environment variables');
    }

    console.log(`Generating image with prompt: "${prompt}"`);
    console.log(`Using model: ${model}, dimensions: ${width}x${height}`);
    
    // Use REST API directly without SDK to avoid MIME type issues
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
    
    // Prepare request body without any problematic MIME type settings
    const requestBody = {
      contents: [
        {
          parts: [
            { text: `Create an image of ${prompt}. Make it ${width}x${height} pixels.` }
          ]
        }
      ]
    };
    
    console.log(`Sending request to ${apiUrl}`);
    
    // Make direct API call
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    // Check for API errors
    if (!response.ok) {
      const errorData = await response.text();
      console.error(`API Error (${response.status}): ${errorData}`);
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }
    
    // Parse response
    const responseData = await response.json();
    console.log(`Response received with status code: ${response.status}`);
    
    // Log response structure for debugging (limited to avoid huge logs)
    const responsePreview = JSON.stringify(responseData).substring(0, 300);
    console.log(`Response preview: ${responsePreview}...`);
    
    // Extract image data from response
    const candidates = responseData.candidates || [];
    if (candidates.length === 0) {
      throw new Error('No candidates returned from API');
    }
    
    const parts = candidates[0]?.content?.parts || [];
    console.log(`Found ${parts.length} parts in response`);
    
    // Find image data in parts
    const imagePart = parts.find((part: any) => 
      part.inlineData && 
      part.inlineData.mimeType && 
      part.inlineData.mimeType.startsWith('image/')
    );
    
    if (!imagePart || !imagePart.inlineData) {
      // If no image found, check for text response that might explain why
      const textParts = parts
        .filter((part: any) => part.text)
        .map((part: any) => part.text)
        .join('\n');
      
      console.log(`No image found. Text response: ${textParts || 'None'}`);
      
      if (responseData.promptFeedback) {
        console.log(`Prompt feedback: ${JSON.stringify(responseData.promptFeedback)}`);
      }
      
      throw new Error('No image data found in API response');
    }
    
    // Image found, save it
    console.log(`Image found with MIME type: ${imagePart.inlineData.mimeType}`);
    const filename = generateUniqueFilename(prompt);
    const imagePath = saveBase64Image(imagePart.inlineData.data, outputDir, filename);
    
    console.log(`Image saved to: ${imagePath}`);
    
    return {
      success: true,
      imagePath
    };
  } catch (error) {
    console.error('Error generating image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}