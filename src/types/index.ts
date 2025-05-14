export interface GeminiConfig {
  apiKey: string;
  outputDir: string;
  defaultModel: string;
}

export interface GenerateImageParams {
  prompt: string;
  model?: string;
  outputPath?: string;
  outputFilename?: string;
}

export interface GenerateImageResponse {
  text?: string;
  imagePath?: string;
  error?: string;
}