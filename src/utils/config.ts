import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs-extra';
import { GeminiConfig } from '../types/index.js';

// Load environment variables
dotenv.config();

// Default configuration
export const DEFAULT_CONFIG: GeminiConfig = {
  apiKey: process.env.GEMINI_API_KEY || '',
  outputDir: process.env.OUTPUT_DIR || './output',
  defaultModel: process.env.DEFAULT_MODEL || 'gemini-2.0-flash-preview-image-generation',
};

// Ensure output directory exists
export const ensureOutputDir = async (outputDir: string = DEFAULT_CONFIG.outputDir): Promise<string> => {
  const absolutePath = path.resolve(outputDir);
  await fs.ensureDir(absolutePath);
  return absolutePath;
};