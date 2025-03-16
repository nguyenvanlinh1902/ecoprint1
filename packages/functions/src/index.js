import * as functions from 'firebase-functions';
import { initializeApp, getApps } from 'firebase-admin/app';
import apiHandler from './handlers/api.js';
import authHandler from './handlers/auth.js';

if (getApps().length === 0) {
  initializeApp();
}

// API endpoints