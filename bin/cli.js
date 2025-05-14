#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// For ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packagePath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Load environment variables
dotenv.config();

program
  .name('mcp-gemini-image')
  .description('MCP server for Google Gemini image generation')
  .version(packageJson.version)
  .option('-k, --api-key <key>', 'Google Gemini API key')
  .option('-o, --output-dir <path>', 'Output directory for generated images')
  .option('-m, --model <model>', 'Default model name')
  .action(async (options) => {
    try {
      // Set environment variables from options if provided
      if (options.apiKey) {
        process.env.GEMINI_API_KEY = options.apiKey;
      }
      
      if (options.outputDir) {
        process.env.OUTPUT_DIR = options.outputDir;
      }
      
      if (options.model) {
        process.env.DEFAULT_MODEL = options.model;
      }
      
      console.log(chalk.green('Starting Gemini Image Generation MCP server...'));
      
      // Import the server after setting environment variables
      await import('../dist/index.js');
      
      console.log(chalk.green('Server is running. Press Ctrl+C to stop.'));
    } catch (error) {
      console.error(chalk.red('Error starting server:'), error);
      process.exit(1);
    }
  });

program.parse(process.argv);