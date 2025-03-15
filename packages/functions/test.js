import { onRequest } from 'firebase-functions/v2/https';

export const test = onRequest((req, res) => {
  res.send("Hello from Firebase Functions!");
}); 