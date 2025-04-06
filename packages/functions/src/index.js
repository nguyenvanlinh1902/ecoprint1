import * as functions from 'firebase-functions';
import apiHandler from './handlers/api.js';

// Api function - đúng cấu hình với koa
export const api = functions.https.onRequest((req, res) => {
  apiHandler.callback()(req, res);
});
