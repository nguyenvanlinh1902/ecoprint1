import * as functions from 'firebase-functions';
import apiHandler from './handlers/api.js';
import adminHandler from './handlers/admin.js';

export const api = functions.https.onRequest((req, res) => {
  apiHandler.callback()(req, res);
});

export const admin = functions.https.onRequest((req, res) => {
  adminHandler.callback()(req, res);
});

