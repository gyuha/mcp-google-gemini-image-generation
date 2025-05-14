#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import path from "path";
import { ImageGenerator } from './utils/imageGenerator.js';
import { DEFAULT_CONFIG, setCustomOutputDir } from './utils/config.js';
import { GenerateImageParams } from './types/index.js';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  throw new Error("GEMINI_API_KEY 환경 변수가 필요합니다");
}

class GeminiImageServer {
  private server: Server;
  private imageGenerator: ImageGenerator;

  constructor() {
    this.server = new Server({
      name: "gemini-image-generation",
      version: "1.0.0",
      description: "Generate images using Google Gemini API"
    }, {
      capabilities: {
        resources: {},
        tools: {}
      }
    });

    // Create image generator instance
    this.imageGenerator = new ImageGenerator(
      DEFAULT_CONFIG.apiKey,
      DEFAULT_CONFIG.outputDir,
      DEFAULT_CONFIG.defaultModel
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(
      ListToolsRequestSchema,
      async () => ({
        tools: [
          {
            name: "generate_image",
            description: "Generate an image using Google Gemini API",
            inputSchema: {
              type: "object",
              properties: {
                prompt: {
                  type: "string",
                  description: "The prompt to generate an image from"
                },
                model: {
                  type: "string",
                  description: "The model to use for image generation (default: gemini-2.0-flash-preview-image-generation)"
                },
                outputPath: {
                  type: "string",
                  description: "Directory to save the generated image to"
                },
                outputFilename: {
                  type: "string",
                  description: "Filename to save the generated image as"
                }
              },
              required: ["prompt"]
            }
          },
          {
            name: "set_output_directory",
            description: "Set the default output directory for saving generated images",
            inputSchema: {
              type: "object",
              properties: {
                path: {
                  type: "string",
                  description: "The directory path where images will be saved"
                }
              },
              required: ["path"]
            }
          },
          {
            name: "sequential_thinking",
            description: "Process complex image generation in sequential steps",
            inputSchema: {
              type: "object",
              properties: {
                thought: {
                  type: "string",
                  description: "Current thinking step"
                },
                nextThoughtNeeded: {
                  type: "boolean",
                  description: "Whether another thought step is needed"
                },
                thoughtNumber: {
                  type: "integer",
                  description: "Current thought number",
                  minimum: 1
                },
                totalThoughts: {
                  type: "integer",
                  description: "Estimated total thoughts needed",
                  minimum: 1
                },
                isRevision: {
                  type: "boolean",
                  description: "Whether this revises previous thinking"
                },
                revisesThought: {
                  type: "integer",
                  description: "Which thought is being reconsidered",
                  minimum: 1
                },
                branchFromThought: {
                  type: "integer",
                  description: "Branching point thought number",
                  minimum: 1
                },
                branchId: {
                  type: "string",
                  description: "Branch identifier"
                },
                needsMoreThoughts: {
                  type: "boolean",
                  description: "If more thoughts are needed"
                }
              },
              required: ["thought", "nextThoughtNeeded", "thoughtNumber", "totalThoughts"]
            }
          }
        ]
      })
    );

    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request) => {
        if (request.params.name === "generate_image") {
          const params = request.params.arguments as GenerateImageParams;
          
          if (!params?.prompt) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "Prompt is required to generate an image"
            );
          }

          console.log(`Generating image with prompt: ${params.prompt}`);
          try {
            const result = await this.imageGenerator.generateImage(params);

            if (result.error) {
              return {
                content: [{
                  type: "text",
                  text: `Error generating image: ${result.error}`
                }],
                isError: true
              };
            }

            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  text: result.text || 'Image generated successfully',
                  imagePath: result.imagePath,
                  model: params.model || DEFAULT_CONFIG.defaultModel
                }, null, 2)
              }]
            };
          } catch (error) {
            return {
              content: [{
                type: "text",
                text: `Error generating image: ${error instanceof Error ? error.message : 'Unknown error'}`
              }],
              isError: true
            };
          }
        } else if (request.params.name === "set_output_directory") {
          const { path: outputPath } = request.params.arguments as { path: string };
          
          if (!outputPath) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "Output path is required"
            );
          }

          try {
            setCustomOutputDir(outputPath);
            // Update the image generator with new output directory
            this.imageGenerator.setOutputDir(outputPath);
            
            return {
              content: [{
                type: "text",
                text: `Output directory successfully set to: ${outputPath}`
              }]
            };
          } catch (error) {
            return {
              content: [{
                type: "text",
                text: `Error setting output directory: ${error instanceof Error ? error.message : 'Unknown error'}`
              }],
              isError: true
            };
          }
        } else if (request.params.name === "sequential_thinking") {
          // Just return the parameters for sequential thinking
          return {
            content: [{
              type: "text",
              text: JSON.stringify(request.params.arguments, null, 2)
            }]
          };
        } else {
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
        }
      }
    );

    // Handle context-based requests
    this.server.onrequest = async (request) => {
      // If it's not a tool request and has context, process as context-based request
      if (!ListToolsRequestSchema.is(request) && !CallToolRequestSchema.is(request) && request.context) {
        const { prompt, model, outputPath, outputFilename } = request.context;

        if (!prompt) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            'Prompt is required to generate an image'
          );
        }

        // If outputPath is provided in context, set it as the default
        if (outputPath) {
          setCustomOutputDir(outputPath);
          this.imageGenerator.setOutputDir(outputPath);
        }

        console.log(`Generating image from context with prompt: ${prompt}`);
        try {
          const result = await this.imageGenerator.generateImage({
            prompt,
            model,
            outputPath,
            outputFilename
          });

          if (result.error) {
            throw new McpError(
              ErrorCode.ExecutionError,
              result.error
            );
          }

          return {
            text: result.text || 'Image generated successfully',
            imagePath: result.imagePath,
            model: model || DEFAULT_CONFIG.defaultModel
          };
        } catch (error) {
          if (error instanceof McpError) {
            throw error;
          }
          
          throw new McpError(
            ErrorCode.ExecutionError,
            error instanceof Error ? error.message : 'Unknown error occurred'
          );
        }
      }
      
      return undefined;
    };

    // Define context schema
    this.server.defineContextSchema({
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "The prompt to generate an image from"
        },
        model: {
          type: "string",
          description: "The model to use for image generation"
        },
        outputPath: {
          type: "string",
          description: "Directory to save the generated image to"
        },
        outputFilename: {
          type: "string",
          description: "Filename to save the generated image as"
        }
      },
      required: ["prompt"]
    });
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log("Gemini Image Generation MCP server running on stdio");
  }
}

async function main() {
  try {
    const server = new GeminiImageServer();
    await server.run();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Start the server
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});