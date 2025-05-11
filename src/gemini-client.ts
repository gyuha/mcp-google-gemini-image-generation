import { GoogleGenerativeAI } from '@google/generative-ai';
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

    // Initialize the Gemini API client with the API key
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    // Create a model instance for text-only generation
    const geminiModel = genAI.getGenerativeModel({ model });
    
    // Prepare the prompt with appropriate instructions for image generation
    const enhancedPrompt = `Generate an image of: ${prompt}. The image should have dimensions of ${width}x${height} pixels.`;
    
    console.log(`Sending request to Gemini API with enhanced prompt: "${enhancedPrompt}"`);
    
    // Use a simple text request to avoid specifying problematic response formats
    const result = await geminiModel.generateContent(enhancedPrompt);
    const response = await result.response;
    
    console.log("Response received from Gemini API");
    
    // Extract image data from response parts
    const parts = response.candidates?.[0]?.content?.parts || [];
    console.log(`Found ${parts.length} parts in response`);
    
    // Find the part containing image data (if any)
    const imagePart = parts.find(part => 
      part.inlineData && 
      part.inlineData.mimeType && 
      part.inlineData.mimeType.startsWith('image/')
    );
    
    if (!imagePart || !imagePart.inlineData || !imagePart.inlineData.data) {
      console.log("No image data found in response parts");
      // If no image part is found, the response might be text describing why image generation failed
      const textParts = parts.filter(part => part.text).map(part => part.text).join("\n");
      throw new Error(`Failed to generate image. API response: ${textParts || "No explanation provided by the API"}`);
    }
    
    console.log(`Image data found with MIME type: ${imagePart.inlineData.mimeType}`);
    
    // Save the image
    const filename = generateUniqueFilename(prompt);
    const imagePath = saveBase64Image(imagePart.inlineData.data, outputDir, filename);
    
    console.log(`Image saved successfully at: ${imagePath}`);
    
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