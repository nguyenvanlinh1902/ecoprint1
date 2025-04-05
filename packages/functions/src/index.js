import * as functions from 'firebase-functions';
import apiHandler from './handlers/api.js';

export const api = functions.https.onRequest(apiHandler.callback());
