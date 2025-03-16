import * as functions from 'firebase-functions';
import { initializeApp, getApps } from 'firebase-admin/app';
import apiHandler from './src/handlers/api.js';
import authHandler from './src/handlers/auth.js';

if (getApps().length === 0) {
  initializeApp();
}

// API endpoints
export const api = functions.https.onRequest(apiHandler.callback());
export const auth = functions.https.onRequest(authHandler.callback());