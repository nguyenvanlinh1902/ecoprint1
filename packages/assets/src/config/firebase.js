import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

// Cấu hình Firebase cứng (hardcoded)
const hardcodedConfig = {
  apiKey: "AIzaSyAEkrwAAQ5iuqOkWNqlReRon_59lTnLKf8",
  authDomain: "ecoprint1-3cd5c.firebaseapp.com",
  projectId: "ecoprint1-3cd5c",
  storageBucket: "ecoprint1-3cd5c.firebasestorage.app",
  messagingSenderId: "643722203154",
  appId: "1:643722203154:web:7a89c317be9292cc5688cb",
  measurementId: "G-T98N3N4HGY"
};

const isConfigValid = 
  hardcodedConfig.apiKey && 
  hardcodedConfig.projectId && 
  hardcodedConfig.storageBucket;

if (!isConfigValid) {
  console.error("Firebase configuration is incomplete:", {
    hasApiKey: !!hardcodedConfig.apiKey,
    hasProjectId: !!hardcodedConfig.projectId,
    hasStorageBucket: !!hardcodedConfig.storageBucket
  });
}

let firebaseApp;
let firebaseStorage;

try {
  if (isConfigValid) {
    firebaseApp = initializeApp(hardcodedConfig);
    firebaseStorage = getStorage(firebaseApp);
    console.log("Firebase initialized successfully with storage bucket:", hardcodedConfig.storageBucket);
  } else {
    console.error("Firebase initialization skipped due to invalid configuration");
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
}

export { firebaseApp, firebaseStorage }; 