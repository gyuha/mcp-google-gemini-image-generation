# MCP Google Gemini Image Generation

MCP server for generating images using Google's Gemini API with Context7 integration.

## Features

- Generate images from text prompts using Google Gemini API
- Save generated images to a specified directory
- Configure different Gemini models for image generation
- Context7 integration with sequential thinking capability
- Supports both programmatic use and CLI interface

## Installation

```bash
npm install -g mcp-google-gemini-image-generation
```

Or use it directly with npx:

```bash
npx mcp-google-gemini-image-generation
```

## Configuration

Create a `.env` file in your project directory (you can copy from `.env.example`):

```bash
# Google Gemini API Key
GEMINI_API_KEY=your_api_key_here

# Output directory for images
OUTPUT_DIR=./output

# Default model for image generation
DEFAULT_MODEL=gemini-2.0-flash-preview-image-generation
```

## Usage

### Using in VS Code with MCP Extension

1. Make sure you have the MCP Extension installed in VS Code
2. Add the server to your MCP configuration:

```json
{
  "servers": {
    "gemini-image-generation": {
      "command": "npx",
      "args": ["-y", "mcp-google-gemini-image-generation"]
    }
  }
}
```

3. Use it in VS Code by providing context:

```
prompt: "Create an image of a dragon flying over a magical forest"
outputPath: "./images"
outputFilename: "dragon.png"
model: "gemini-2.0-flash-preview-image-generation"
```

### Using with CLI

```bash
npx mcp-google-gemini-image-generation --api-key YOUR_API_KEY --output-dir ./images --model gemini-2.0-flash-preview-image-generation
```

### Using Sequential Thinking

This MCP server includes a sequential thinking tool that helps break down complex image generation tasks:

```json
{
  "thoughtNumber": 1,
  "totalThoughts": 3,
  "thought": "First, let's consider the key elements needed in this fantasy scene...",
  "nextThoughtNeeded": true
}
```

## API Reference

### Context Parameters

| Parameter | Description | Required | Default |
|-----------|-------------|----------|---------|
| prompt | The text prompt to generate an image from | Yes | - |
| model | The Gemini model to use | No | gemini-2.0-flash-preview-image-generation |
| outputPath | Directory to save the generated image | No | ./output |
| outputFilename | Filename for the generated image | No | gemini-image-[uuid].png |

### Tools

#### generate-image

Generates an image based on text prompt.

Parameters:
- `prompt` (required): Text description of the image to generate
- `model`: Name of the Gemini model to use
- `outputPath`: Directory to save the image
- `outputFilename`: Custom filename for the generated image

#### sequential-thinking

Enables step-by-step complex reasoning for image generation tasks.

Parameters:
- `thought` (required): Current thinking step
- `nextThoughtNeeded` (required): Whether another thought step is needed
- `thoughtNumber` (required): Current thought number
- `totalThoughts` (required): Estimated total thoughts needed
- `isRevision`: Whether this revises previous thinking
- `revisesThought`: Which thought is being reconsidered
- `branchFromThought`: Branching point thought number
- `branchId`: Branch identifier
- `needsMoreThoughts`: If more thoughts are needed

## License

ISC