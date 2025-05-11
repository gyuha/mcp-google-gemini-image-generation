import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
/**
 * Ensures the specified directory exists
 */
export function ensureDirectoryExists(directory) {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
        console.log(`Directory created: ${directory}`);
    }
}
/**
 * Generates a unique filename based on the prompt and timestamp
 */
export function generateUniqueFilename(prompt, format = 'png') {
    // Create a hash from the prompt for uniqueness
    const hash = crypto.createHash('md5').update(prompt).digest('hex').slice(0, 10);
    // Add timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    // Clean the prompt text for filename use (take first 20 chars)
    const cleanPrompt = prompt
        .slice(0, 20)
        .trim()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, '_');
    return `${cleanPrompt}_${hash}_${timestamp}.${format}`;
}
/**
 * Saves base64 image data to a file
 */
export function saveBase64Image(base64Data, outputDir, filename) {
    ensureDirectoryExists(outputDir);
    const filePath = path.join(outputDir, filename);
    // Remove data URL prefix if present
    const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(filePath, Buffer.from(base64Image, 'base64'));
    console.log(`Image saved: ${filePath}`);
    return filePath;
}
