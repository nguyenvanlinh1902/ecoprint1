#!/usr/bin/env node

/**
 * Test Firebase Storage connectivity
 * This script tests the connection to Firebase Storage using the correct bucket name
 */

import admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Check for service account file
const serviceAccountPath = path.join(projectRoot, 'serviceAccount.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service account file not found at:', serviceAccountPath);
  process.exit(1);
}

// Project ID and bucket name
const projectId = 'ecoprint1-3cd5c'; 
const correctBucketName = `${projectId}.firebasestorage.app`;
const incorrectBucketName = `${projectId}.appspot.com`;

console.log('Testing Firebase Storage connectivity...');
console.log('Correct bucket name format:', correctBucketName);
console.log('Incorrect bucket name format:', incorrectBucketName);
console.log('\n===== Test 1: Initializing with correct bucket name =====');

try {
  // Initialize Firebase Admin with correct bucket
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  const app1 = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: correctBucketName
  }, 'correct-app');
  
  const storage1 = getStorage(app1);
  const bucket1 = storage1.bucket();
  
  console.log('✅ Successfully initialized Firebase Storage with correct bucket name');
  console.log('Bucket name:', bucket1.name);
  console.log('Bucket exists:', await bucket1.exists().then(data => data[0]));
  
  // List some files
  console.log('\nListing files:');
  const [files] = await bucket1.getFiles({ maxResults: 5 });
  if (files.length > 0) {
    files.forEach((file, i) => {
      console.log(`${i+1}. ${file.name} (${file.metadata.size} bytes)`);
    });
  } else {
    console.log('No files found in bucket');
  }
} catch (error) {
  console.error('❌ Error with correct bucket name:', error.message);
}

console.log('\n===== Test 2: Initializing with incorrect bucket name =====');

try {
  // Initialize Firebase Admin with incorrect bucket
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  const app2 = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: incorrectBucketName
  }, 'incorrect-app');
  
  const storage2 = getStorage(app2);
  const bucket2 = storage2.bucket();
  
  console.log('Initialized with incorrect bucket name (this should fail)');
  console.log('Bucket name:', bucket2.name);
  
  // This will likely fail with the incorrect bucket
  console.log('Testing if bucket exists:');
  const exists = await bucket2.exists().then(data => data[0]);
  console.log('Bucket exists:', exists);
  
  if (!exists) {
    console.log('❌ Failed to access bucket with incorrect name format');
  } else {
    console.log('⚠️ Unexpectedly succeeded with incorrect bucket name');
  }
} catch (error) {
  console.log('✅ Expected error with incorrect bucket name:', error.message);
}

console.log('\n===== Storage Test Complete =====');
console.log('Always use the correct bucket name format: PROJECT_ID.firebasestorage.app');