import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs-extra';
// Load environment variables
dotenv.config();
// Default configuration
export const DEFAULT_CONFIG = {
    apiKey: process.env.GEMINI_API_KEY || '',
    outputDir: process.env.OUTPUT_DIR || './output',
    defaultModel: process.env.DEFAULT_MODEL || 'gemini-2.0-flash-preview-image-generation',
};
// Ensure output directory exists
export const ensureOutputDir = async (outputDir = DEFAULT_CONFIG.outputDir) => {
    const absolutePath = path.resolve(outputDir);
    await fs.ensureDir(absolutePath);
    return absolutePath;
};
// Set custom output directory
export const setCustomOutputDir = (newPath) => {
    if (newPath && typeof newPath === 'string') {
        DEFAULT_CONFIG.outputDir = newPath;
    }
};
