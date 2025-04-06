#!/usr/bin/env node

/**
 * This script validates Firebase configuration to ensure:
 * 1. Storage bucket uses the correct format (project-id.appspot.com)
 * 2. Required configuration keys are present
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as chalkLib from 'chalk';

// When using as ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fallback for chalk if not available
const chalk = chalkLib?.default || { 
  red: text => `\x1b[31m${text}\x1b[0m`, 
  green: text => `\x1b[32m${text}\x1b[0m`, 
  yellow: text => `\x1b[33m${text}\x1b[0m` 
};

// Required configuration keys
const REQUIRED_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

// Get project root directory
const projectRoot = path.resolve(__dirname, '..');

// Paths to check
const ENV_PATHS = [
  path.join(projectRoot, '.env'),
  path.join(projectRoot, '.env.local'),
  path.join(projectRoot, '.env.development'),
  path.join(projectRoot, '.env.production')
];

// Check client-side configuration
const CLIENT_CONFIG_PATHS = [
  path.join(projectRoot, 'packages/assets/src/firebase-config.js'),
  path.join(projectRoot, 'packages/assets/src/helpers.js')
];

console.log('Validating Firebase configuration...');

let allValid = true;
let envFound = false;

// Validate environment files
ENV_PATHS.forEach(envPath => {
  if (fs.existsSync(envPath)) {
    envFound = true;
    console.log(`Checking ${path.basename(envPath)}...`);
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = parseEnvFile(envContent);
    
    // Check required keys
    const missingKeys = REQUIRED_KEYS.filter(key => !envVars[key]);
    if (missingKeys.length > 0) {
      console.log(chalk.yellow(`Missing required keys in ${path.basename(envPath)}: ${missingKeys.join(', ')}`));
      allValid = false;
    }
    
    // Check storage bucket format
    if (envVars['VITE_FIREBASE_STORAGE_BUCKET']) {
      const storageBucket = envVars['VITE_FIREBASE_STORAGE_BUCKET'];
      if (!storageBucket.endsWith('.appspot.com')) {
        console.log(chalk.red(`Invalid storage bucket format in ${path.basename(envPath)}: ${storageBucket}`));
        console.log(chalk.yellow(`  Storage bucket should end with '.appspot.com', not '.firebasestorage.app'`));
        allValid = false;
      } else {
        console.log(chalk.green(`  Storage bucket format is valid: ${storageBucket}`));
      }
    }
    
    // Check for APP_ variables as well
    if (envVars['APP_STORAGE_BUCKET']) {
      const storageBucket = envVars['APP_STORAGE_BUCKET'];
      if (!storageBucket.endsWith('.appspot.com')) {
        console.log(chalk.red(`Invalid APP_STORAGE_BUCKET format in ${path.basename(envPath)}: ${storageBucket}`));
        console.log(chalk.yellow(`  Storage bucket should end with '.appspot.com', not '.firebasestorage.app'`));
        allValid = false;
      } else {
        console.log(chalk.green(`  APP_STORAGE_BUCKET format is valid: ${storageBucket}`));
      }
    }
  }
});

// Check client-side configuration files
CLIENT_CONFIG_PATHS.forEach(configPath => {
  if (fs.existsSync(configPath)) {
    console.log(`Checking ${path.basename(configPath)}...`);
    
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    // Check if it contains firebasestorage.app
    if (configContent.includes('.firebasestorage.app')) {
      console.log(chalk.red(`Found invalid storage bucket format in ${path.basename(configPath)}`));
      console.log(chalk.yellow(`  Storage bucket should end with '.appspot.com', not '.firebasestorage.app'`));
      allValid = false;
    } else if (configContent.includes('storageBucket') && configContent.includes('.appspot.com')) {
      console.log(chalk.green(`  Storage bucket format appears valid in ${path.basename(configPath)}`));
    }
  }
});

if (!envFound) {
  console.log(chalk.yellow('Warning: No .env file found. Make sure to set up your Firebase configuration.'));
}

if (allValid) {
  console.log(chalk.green('✓ Firebase configuration validation passed!'));
} else {
  console.log(chalk.red('✗ Firebase configuration validation failed! Please correct the issues above.'));
  console.log(chalk.yellow('  Hint: Firebase Storage bucket URL must use the format: "your-project-id.appspot.com"'));
}

/**
 * Parse environment file content into an object
 * @param {string} content - Environment file content
 * @returns {Object} - Environment variables
 */
function parseEnvFile(content) {
  const result = {};
  const lines = content.split('\n');
  
  lines.forEach(line => {
    // Skip comments and empty lines
    if (line.startsWith('#') || !line.trim()) {
      return;
    }
    
    // Split by first = sign
    const equalSignIndex = line.indexOf('=');
    if (equalSignIndex > 0) {
      const key = line.substring(0, equalSignIndex).trim();
      let value = line.substring(equalSignIndex + 1).trim();
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      
      result[key] = value;
    }
  });
  
  return result;
} 