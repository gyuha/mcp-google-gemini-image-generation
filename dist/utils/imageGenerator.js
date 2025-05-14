import { GoogleGenAI, Modality } from "@google/genai";
import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_CONFIG, ensureOutputDir } from './config.js';
export class ImageGenerator {
    constructor(apiKey = DEFAULT_CONFIG.apiKey, outputDir = DEFAULT_CONFIG.outputDir, defaultModel = DEFAULT_CONFIG.defaultModel) {
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is required');
        }
        this.genAI = new GoogleGenAI({ apiKey });
        this.outputDir = outputDir;
        this.defaultModel = defaultModel;
    }
    // Method to change output directory
    setOutputDir(outputDir) {
        if (outputDir) {
            this.outputDir = outputDir;
        }
    }
    async generateImage({ prompt, model = this.defaultModel, outputPath = this.outputDir, outputFilename }) {
        try {
            // Ensure output directory exists
            const outputDirectory = await ensureOutputDir(outputPath);
            // Generate the image
            const response = await this.genAI.models.generateContent({
                model,
                contents: prompt,
                config: {
                    // 중요 변경: 이미지만 받도록 설정
                    responseModalities: [Modality.IMAGE],
                },
            });
            // Default filename if none provided
            const filename = outputFilename || `gemini-image-${uuidv4().substring(0, 8)}.png`;
            const imagePath = path.join(outputDirectory, filename);
            let textResponse = '';
            let imageSaved = false;
            // Process the response
            if (response.candidates &&
                response.candidates.length > 0 &&
                response.candidates[0].content &&
                response.candidates[0].content.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.text) {
                        textResponse = part.text;
                    }
                    else if (part.inlineData && part.inlineData.data && !imageSaved) {
                        // 첫 번째 이미지만 저장
                        const imageData = part.inlineData.data;
                        const buffer = Buffer.from(imageData, 'base64');
                        await fs.writeFile(imagePath, buffer);
                        imageSaved = true;
                        console.log(`Image saved to: ${imagePath}`);
                    }
                }
                return {
                    text: textResponse,
                    imagePath
                };
            }
            else {
                return {
                    error: 'Invalid response from Gemini API'
                };
            }
        }
        catch (error) {
            console.error('Error generating image:', error);
            return {
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
}
