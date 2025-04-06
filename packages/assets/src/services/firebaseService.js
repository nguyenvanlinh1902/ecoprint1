import { ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import { storage, getFirebaseInfo } from '@assets/helpers';

/**
 * Upload file to Firebase Storage
 * @param {File} file - The file to upload
 * @param {string} path - Storage path (default: 'images')
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export async function uploadToFirebase(file, path = 'images') {
  try {
    // Debug Firebase configuration
    const firebaseInfo = getFirebaseInfo();
    console.log('Firebase configuration check before upload:', firebaseInfo);
    
    if (!storage) {
      console.error('Firebase storage is not initialized');
      return { 
        success: false, 
        error: 'Firebase storage is not properly initialized' 
      };
    }
    
    // Kiểm tra bucket
    if (!firebaseInfo.options.storageBucket) {
      console.error('Firebase storage bucket is not configured');
      
      // Check environment variables directly
      const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
      console.error('Environment variable check: VITE_FIREBASE_STORAGE_BUCKET =', 
        storageBucket ? storageBucket : 'not set');
      
      return {
        success: false,
        error: 'Storage bucket is not configured. Please check your environment variables.'
      };
    }
    
    console.log('Starting upload to Firebase Storage:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      path: path,
      storageBucket: firebaseInfo.options.storageBucket
    });
    
    // Create unique path with timestamp to avoid duplicates
    const timestamp = new Date().getTime();
    const fileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const fullPath = `${path}/${timestamp}_${fileName}`;
    
    console.log(`Creating storage reference for path: ${fullPath}`);
    const storageRef = ref(storage, fullPath);
    
    // Prepare metadata
    const metadata = {
      contentType: file.type,
      customMetadata: {
        uploadedAt: new Date().toISOString()
      }
    };
    
    // Tạo Blob URL trực tiếp từ file
    const blobUrl = URL.createObjectURL(file);
    console.log('Created blob URL:', blobUrl);
    
    // Phương pháp 1: Upload thông qua uploadBytes
    try {
      console.log('Trying upload method 1: uploadBytes...');
      const snapshot = await uploadBytes(storageRef, file, metadata);
      console.log('Upload completed using uploadBytes:', snapshot);
      
      // Get download URL
      console.log('Getting download URL...');
      const url = await getDownloadURL(snapshot.ref);
      console.log('File uploaded successfully, URL:', url);
      
      return { success: true, url };
    } catch (uploadError) {
      console.warn('Upload method 1 failed:', uploadError);
      
      // Phương pháp 2: Convert to base64 và sử dụng uploadString
      try {
        console.log('Trying upload method 2: uploadString with base64...');
        return await uploadAsBase64(file, path);
      } catch (base64Error) {
        console.error('All upload methods failed:', base64Error);
        throw new Error('Multiple upload methods failed: ' + base64Error.message);
      }
    }
  } catch (e) {
    console.error('Firebase upload error:', e);
    
    // More detailed error info
    let errorMessage = e.message;
    if (e.code) {
      switch (e.code) {
        case 'storage/unauthorized':
          errorMessage = 'User is not authorized to upload to this storage bucket';
          break;
        case 'storage/canceled':
          errorMessage = 'Upload was canceled';
          break;
        case 'storage/quota-exceeded':
          errorMessage = 'Storage quota exceeded';
          break;
        case 'storage/unauthenticated':
          errorMessage = 'User is not authenticated';
          break;
        default:
          errorMessage = `Firebase error: ${e.code} - ${e.message}`;
      }
    }
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Phương pháp thay thế: Upload file bằng base64
 */
async function uploadAsBase64(file, path) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64Data = event.target.result;
        console.log('File converted to base64, length:', base64Data.length);
        
        const timestamp = new Date().getTime();
        const fileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const fullPath = `${path}/${timestamp}_${fileName}`;
        
        const storageRef = ref(storage, fullPath);
        
        // Upload base64 data
        const snapshot = await uploadString(storageRef, base64Data, 'data_url');
        console.log('Upload completed using base64:', snapshot);
        
        // Get URL
        const url = await getDownloadURL(snapshot.ref);
        console.log('File uploaded successfully using base64, URL:', url);
        
        resolve({ success: true, url });
      } catch (error) {
        console.error('Base64 upload failed:', error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      console.error('Error reading file as base64:', error);
      reject(error);
    };
    
    reader.readAsDataURL(file);
  });
} 