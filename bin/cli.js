#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get package information
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
);

// Create CLI program
const program = new Command();

program
  .name('mcp-gemini-image')
  .description(packageJson.description)
  .version(packageJson.version)
  .option('-p, --port <number>', 'Port number for the MCP server', '3000')
  .option('-h, --host <host>', 'Host for the MCP server', 'localhost')
  .option('-o, --output <directory>', 'Directory for saving generated images', './generated-images')
  .option('-k, --api-key <key>', 'Google API key (or set GOOGLE_API_KEY env variable)')
  .action(async (options) => {
    try {
      // Set environment variables from options
      if (options.apiKey) {
        process.env.GOOGLE_API_KEY = options.apiKey;
      }
      
      if (options.output) {
        process.env.DEFAULT_OUTPUT_DIR = options.output;
      }
      
      // Import and start server
      const { default: server } = await import('../dist/index.js');
      server.startServer(parseInt(options.port), options.host);
      
      console.log(chalk.green('✨ MCP Gemini Image Generator is ready!'));
      console.log(chalk.blue('Example MCP call:'));
      console.log(chalk.gray(`
{
  "call": {
    "context": {
      "prompt": "a beautiful landscape with mountains and a lake",
      "model": "gemini-2.0-flash-001",
      "width": 1024,
      "height": 1024
    }
  }
}
      `));
      
      // Check if API key is set
      if (!process.env.GOOGLE_API_KEY) {
        console.log(chalk.yellow('⚠️  Warning: GOOGLE_API_KEY is not set!'));
        console.log(chalk.yellow('Please set your API key using the --api-key option or GOOGLE_API_KEY environment variable'));
      }
    } catch (error) {
      console.error(chalk.red('Error starting server:'), error);
      process.exit(1);
    }
  });

program.parse();