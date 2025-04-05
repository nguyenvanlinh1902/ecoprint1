#!/usr/bin/env node

/**
 * Connectivity Test Script
 * 
 * This script tests connectivity between frontend and backend services.
 * It helps diagnose "No response from server" errors by checking:
 * 1. Frontend dev server accessibility
 * 2. Backend API accessibility
 * 3. Network connectivity between services
 * 4. CORS configuration
 */

import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables
const loadEnv = (mode) => {
  try {
    const envPath = path.resolve(rootDir, 'packages/assets/.env' + (mode ? `.${mode}` : ''));
    if (fs.existsSync(envPath)) {
      const fileContent = fs.readFileSync(envPath, 'utf8');
      const envVars = {};
      
      fileContent.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1);
          }
          
          envVars[key] = value;
        }
      });
      
      return envVars;
    }
    return {};
  } catch (error) {
    console.error(`Error loading environment variables: ${error.message}`);
    return {};
  }
};

// Default environments to test
const environments = process.argv.slice(2).length ? process.argv.slice(2) : ['', 'staging', 'production'];
console.log(`Testing connectivity for environments: ${environments.join(', ') || 'default'}`);

// Function to make HTTP requests
const makeRequest = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const req = client.get(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(5000, () => {
      req.abort();
      reject(new Error('Request timed out'));
    });
  });
};

// Test a specific URL
const testUrl = async (url, description) => {
  try {
    console.log(`Testing ${description}: ${url}`);
    const response = await makeRequest(url);
    console.log(`✅ ${description} is accessible (${response.statusCode})`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} is NOT accessible: ${error.message}`);
    return false;
  }
};

// Test CORS configuration
const testCors = async (url, origin) => {
  try {
    console.log(`Testing CORS for ${url} with origin: ${origin}`);
    const response = await makeRequest(url, {
      headers: {
        'Origin': origin,
        'Access-Control-Request-Method': 'GET'
      }
    });
    
    const corsHeaders = {
      'access-control-allow-origin': response.headers['access-control-allow-origin'],
      'access-control-allow-methods': response.headers['access-control-allow-methods'],
      'access-control-allow-headers': response.headers['access-control-allow-headers']
    };
    
    if (corsHeaders['access-control-allow-origin']) {
      console.log(`✅ CORS is properly configured for ${url}`);
      console.log(`   Access-Control-Allow-Origin: ${corsHeaders['access-control-allow-origin']}`);
      return true;
    } else {
      console.error(`❌ CORS is NOT properly configured for ${url}`);
      console.error(`   Missing Access-Control-Allow-Origin header`);
      return false;
    }
  } catch (error) {
    console.error(`❌ CORS test failed for ${url}: ${error.message}`);
    return false;
  }
};

// Main function to run the tests
const runTests = async () => {
  for (const env of environments) {
    const envVars = loadEnv(env);
    const envName = env || 'default';
    
    console.log(`\n====== Testing environment: ${envName} ======\n`);
    
    // Get API URL
    const apiUrl = envVars.VITE_API_BASE_URL || 
      (env === 'production' ? 'https://us-central1-ecoprint1-3cd5c.cloudfunctions.net/api' : 
        (env === 'staging' ? 'https://us-central1-ecoprint1-3cd5c.cloudfunctions.net/api' : 
          'http://localhost:5001/ecoprint1-3cd5c/us-central1/api'));
    
    // Get frontend URL
    const frontendUrl = env === 'production' ? 'https://ecoprint1-3cd5c.web.app' : 
      (env === 'staging' ? 'https://ecoprint1-3cd5c.web.app' : 'http://localhost:3001');
    
    // Test frontend
    const frontendOk = await testUrl(frontendUrl, 'Frontend');
    
    // Test backend health endpoint
    const backendHealthOk = await testUrl(`${apiUrl}/health`, 'Backend health endpoint');
    
    // Test CORS if both servers are running
    if (frontendOk && backendHealthOk) {
      await testCors(`${apiUrl}/health`, frontendUrl);
    }
    
    console.log(`\n====== Results for ${envName} environment ======`);
    console.log(`Frontend: ${frontendOk ? '✅ OK' : '❌ Failed'}`);
    console.log(`Backend: ${backendHealthOk ? '✅ OK' : '❌ Failed'}`);
    
    if (!frontendOk || !backendHealthOk) {
      console.log(`\nTroubleshooting steps for ${envName}:`);
      
      if (!frontendOk) {
        console.log(`- Check if the frontend server is running for ${envName}`);
        console.log(`- Run "npm run dev:assets${env ? ':' + env : ''}" to start the frontend`);
      }
      
      if (!backendHealthOk) {
        console.log(`- Check if the backend server is running for ${envName}`);
        console.log(`- Run "npm run dev:functions" to start the backend`);
        console.log(`- Verify the Firebase emulators are running: "npm run emulators"`);
        console.log(`- Check the VITE_API_BASE_URL in .env${env ? '.' + env : ''} file`);
      }
    }
  }
};

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
}); 