# MCP Google Gemini Image Generation

A Model Context Protocol (MCP) server that uses Google's Gemini API to generate images from text prompts.

## Features

- Generate images using Google's Gemini AI models
- Select from different Gemini models (default: `gemini-2.0-flash-preview-image-generation`)
- Customize image dimensions
- Save generated images to a specified directory
- Access via MCP protocol
- Easy to run with NPX
- Handles API rate limits gracefully with automatic retries

## Installation

You can run this package directly with npx:

```bash
npx mcp-google-gemini-image-generation
```

Or install it globally:

```bash
npm install -g mcp-google-gemini-image-generation
mcp-gemini-image
```

## Prerequisites

- Node.js 16 or higher
- Google API key with access to Gemini API

## Configuration

Set your Google API key using one of these methods:

1. Environment variable:
```bash
export GOOGLE_API_KEY=your_google_api_key_here
```

2. Create a .env file:
```
GOOGLE_API_KEY=your_google_api_key_here
```

3. Pass as a command line argument:
```bash
npx mcp-google-gemini-image-generation --api-key=your_google_api_key_here
```

## Command Line Options

```
Options:
  -V, --version           output the version number
  -p, --port <number>     Port number for the MCP server (default: "23032")
  -h, --host <host>       Host for the MCP server (default: "localhost")
  -o, --output <directory> Directory for saving generated images (default: "./generated-images")
  -k, --api-key <key>     Google API key (or set GOOGLE_API_KEY env variable)
  --help                  display help for command
```

## API Rate Limits

Google Gemini API has certain rate limits that you should be aware of:

1. **Free Tier Limits**:
   - Limited requests per minute and per day
   - Limited input tokens per minute
   - Limited generated content per day

2. **Handling Rate Limits**:
   - The server automatically implements exponential backoff for retries
   - Default retry attempts: 3 times with increasing delay
   - Consider upgrading to a paid tier for higher quotas if you frequently hit limits

3. **Error Handling**:
   - Rate limit errors (HTTP 429) are properly handled
   - Descriptive error messages help diagnose quota issues

For more information on Gemini API rate limits, visit: https://ai.google.dev/gemini-api/docs/rate-limits

## Using with VSCode GitHub Copilot or Cursor

To use this MCP server with VSCode GitHub Copilot or Cursor, follow these steps:

### 1. Create the `.vscode` directory in your project

```bash
mkdir -p .vscode
```

### 2. Create a `mcp.json` file in the `.vscode` directory

Create a file at `.vscode/mcp.json` with the following content:

```json
{
  "servers": {
    "GeminiImageGeneration": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "mcp-google-gemini-image-generation",
        "--api-key",
        "YOUR_GOOGLE_API_KEY_HERE"
      ]
    }
  }
}
```

Alternatively, if running locally from the cloned repository:

```json
{
  "servers": {
    "GeminiImageGeneration": {
      "type": "stdio",
      "command": "node",
      "args": [
        "./dist/index.js"
      ],
      "env": {
        "GOOGLE_API_KEY": "YOUR_GOOGLE_API_KEY_HERE"
      }
    }
  }
}
```

### 3. Add mcp configuration in VSCode settings

In VSCode, you can add the following to your settings.json file (Ctrl+Shift+P, then "Preferences: Open Settings (JSON)"):

```json
"github.copilot.chat.locales": {
  "mcp": {
    "GeminiImageGeneration": "gemini-image-generator"
  }
}
```

### 4. Using in Copilot or Cursor

You can then use the MCP server in Copilot or Cursor by prompting it to generate images. For example:

```
Generate an image of a mountain landscape with a lake using Gemini
```

The AI will use your configured MCP server to generate the image based on your prompt.

### 5. Accessing Generated Images

The images will be saved in the configured output directory (default: `./generated-images`). You can access them directly from your filesystem.

## MCP Protocol Usage

Send MCP requests to the server's HTTP endpoint:

### Get Model Properties

```json
{
  "lookup": "properties"
}
```

### Generate an Image

```json
{
  "call": {
    "context": {
      "prompt": "a beautiful landscape with mountains and a lake",
      "model": "gemini-2.0-flash-preview-image-generation",
      "width": 1024,
      "height": 1024
    }
  }
}
```

### Available Context Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| prompt | string | *required* | Text prompt describing the image to generate |
| model | string | "gemini-2.0-flash-preview-image-generation" | Gemini model to use |
| width | number | 1024 | Image width in pixels |
| height | number | 1024 | Image height in pixels |
| outputDir | string | "./generated-images" | Directory to save images |

## Example Usage with cURL

```bash
# Get model properties
curl -X POST http://localhost:23032 \
  -H "Content-Type: application/json" \
  -d '{"lookup": "properties"}'

# Generate an image
curl -X POST http://localhost:23032 \
  -H "Content-Type: application/json" \
  -d '{"call": {"context": {"prompt": "a beautiful landscape with mountains and a lake"}}}'

# Generate an image with HTTP endpoint
curl -X POST http://localhost:23032/v1/providers/gemini-image-generator/generations \
  -H "Content-Type: application/json" \
  -d '{"context": {"prompt": "a beautiful landscape with mountains and a lake"}}'
```

## Response Format

A successful image generation request will return:

```json
{
  "result": {
    "success": true,
    "message": "Image generated successfully",
    "imagePath": "/path/to/generated/image.png"
  }
}
```

An error response will return:

```json
{
  "result": {
    "success": false,
    "error": "Error message details"
  }
}
```

## Common Issues and Solutions

### API Rate Limit Errors

If you encounter a "429 Too Many Requests" error:

1. Wait a few minutes before retrying
2. Consider using a different model 
3. Upgrade to a paid Google API plan for higher quotas

### Image Generation Failures

If images are not being generated:

1. Ensure your API key has access to the Gemini image generation features
2. Check that you're using a supported model for image generation
3. Try simplifying your prompt or reducing image dimensions

## License

ISC