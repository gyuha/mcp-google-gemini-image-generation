// Define our custom context interface for Gemini image generation
export interface GeminiImageGenerationContext {
  prompt: string;             // Required text prompt for image generation
  model?: string;             // Optional model selection (defaults to gemini-2.0-flash-preview-image-generation)
  width?: number;             // Optional image width (default will be set)
  height?: number;            // Optional image height (default will be set)
  outputDir?: string;         // Optional custom output directory
  format?: 'png' | 'jpeg';    // Optional output format
}

// Response structure for image generation
export interface ImageGenerationResult {
  success: boolean;
  imagePath?: string;         // Path to the generated image if successful
  error?: string;             // Error message if any
}

// MCP protocol interfaces
export interface MCPLLMCallContext {
  prompt?: string;
  model?: string;
  width?: number;
  height?: number;
  outputDir?: string;
  format?: string;
  [key: string]: any;
}

export interface MCPLLMCallResult {
  result: {
    success: boolean;
    message?: string;
    imagePath?: string;
    error?: string;
    [key: string]: any;
  };
}

export interface MCPLLMDefinition {
  name: string;
  properties: {
    description: string;
    models: string[];
    features: string[];
    [key: string]: any;
  };
  call: (params: { context: MCPLLMCallContext; user_input: string }) => Promise<MCPLLMCallResult>;
}