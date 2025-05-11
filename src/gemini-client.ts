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

// 타입 정의 추가
interface InlineData {
  mimeType: string;
  data: string;
}

interface Part {
  text?: string;
  inlineData?: InlineData;
}

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

    // 이미지 생성을 위한 Fetch 직접 사용 (Google Generative AI SDK는 이미지 생성에 문제가 있음)
    const apiVersion = 'v1beta';
    const baseUrl = 'https://generativelanguage.googleapis.com';
    
    // 모델 이름에서 버전 정보 추출 (e.g., gemini-1.5-pro-latest → gemini-1.5-pro)
    const modelBase = model.split('-latest')[0]; // latest가 있을 경우 제거
    
    console.log(`Using API endpoint: ${baseUrl}/${apiVersion}/models/${model}:generateContent`);
    
    // generateContent 엔드포인트 직접 호출
    const response = await fetch(`${baseUrl}/${apiVersion}/models/${model}:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Generate an image of: ${prompt}. The image should have dimensions of ${width}x${height} pixels.`
          }]
        }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 8192,
        }
      })
    });

    console.log(`API response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error response:', errorText);
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    // 응답 구문 분석
    const responseData = await response.json();
    console.log('API response received');

    const candidates = responseData.candidates || [];
    if (candidates.length === 0) {
      const finishReason = responseData.promptFeedback?.blockReason || 'unknown';
      throw new Error(`No candidates returned. Finish reason: ${finishReason}`);
    }
    
    const parts = candidates[0]?.content?.parts || [];
    console.log(`Found ${parts.length} parts in response`);
    
    // 이미지 데이터 검색
    const imagePart = parts.find((part: Part) => 
      part.inlineData && 
      part.inlineData.mimeType && 
      part.inlineData.mimeType.startsWith('image/')
    );
    
    if (!imagePart || !imagePart.inlineData || !imagePart.inlineData.data) {
      // 텍스트 응답 찾기
      const textParts = parts.filter((part: Part) => part.text).map((part: Part) => part.text as string).join("\n");
      console.log('Text response from API:', textParts);
      
      // 오류 응답 확인
      if (responseData.promptFeedback) {
        console.log('Prompt feedback:', responseData.promptFeedback);
      }
      
      throw new Error(`Failed to generate image. API response: ${textParts || JSON.stringify(responseData)}`);
    }
    
    console.log(`Image data found with MIME type: ${imagePart.inlineData.mimeType}`);
    
    // 이미지 저장
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