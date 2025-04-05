/**
 * Repository for file uploads
 */
import { v4 as uuidv4 } from 'uuid';
import { adminStorage } from '../config/firebaseAdmin.js';
import path from 'path';
import os from 'os';
import fs from 'fs';

/**
 * Upload transaction receipt
 * @param {string} userId - User ID
 * @param {string} transactionId - Transaction ID
 * @param {Object} fileData - File data (buffer or other formats)
 * @returns {Promise<Object>} Result object with success and fileUrl
 */
const uploadTransactionReceipt = async (userId, transactionId, fileData) => {
  try {
    if (!fileData) {
      return { success: false, error: 'No file data provided' };
    }
    
    let fileBuffer;
    let fileName;
    let contentType;
    
    // Extract file info based on fileData type
    if (Buffer.isBuffer(fileData)) {
      // Already a buffer
      fileBuffer = fileData;
      fileName = `${Date.now()}-receipt.jpg`;
      contentType = 'image/jpeg';
    } else if (fileData.buffer && Buffer.isBuffer(fileData.buffer)) {
      // Multer-style file object
      fileBuffer = fileData.buffer;
      fileName = fileData.originalname || `${Date.now()}-receipt.jpg`;
      contentType = fileData.mimetype || 'image/jpeg';
    } else if (typeof fileData === 'string') {
      // Base64 data
      if (fileData.startsWith('data:')) {
        // Data URL format
        const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          contentType = matches[1];
          fileBuffer = Buffer.from(matches[2], 'base64');
          
          // Get file extension from mimetype
          const ext = contentType.split('/')[1] || 'jpg';
          fileName = `${Date.now()}-receipt.${ext}`;
        } else {
          return { success: false, error: 'Invalid data URL format' };
        }
      } else {
        // Assume plain base64
        fileBuffer = Buffer.from(fileData, 'base64');
        fileName = `${Date.now()}-receipt.jpg`;
        contentType = 'image/jpeg';
      }
    } else if (fileData.data && Buffer.isBuffer(fileData.data)) {
      // Busboy-style file object
      fileBuffer = fileData.data;
      fileName = fileData.name || `${Date.now()}-receipt.jpg`;
      contentType = fileData.mimetype || 'image/jpeg';
    } else {
      return { 
        success: false, 
        error: 'Unsupported file data format',
        debugInfo: { type: typeof fileData, keys: Object.keys(fileData) }
      };
    }
    
    // Create a temporary file
    const tempFilePath = path.join(os.tmpdir(), fileName);
    await fs.promises.writeFile(tempFilePath, fileBuffer);
    
    // Set the destination in Firebase Storage
    const destination = `receipts/${userId}/${transactionId}/${fileName}`;
    
    // Upload to Firebase Storage
    await adminStorage.upload(tempFilePath, {
      destination,
      metadata: {
        contentType,
        metadata: {
          firebaseStorageDownloadTokens: uuidv4()
        }
      }
    });
    
    // Remove the temporary file
    await fs.promises.unlink(tempFilePath);
    
    // Get public URL
    const fileUrl = `https://storage.googleapis.com/${adminStorage.name}/${destination}`;
    
    return {
      success: true,
      fileUrl
    };
  } catch (error) {
    console.error('Error uploading transaction receipt:', error);
    return {
      success: false,
      error: error.message || 'Error uploading file'
    };
  }
};

/**
 * Upload product image
 * @param {string} productId - Product ID
 * @param {Object} fileData - File data
 * @returns {Promise<Object>} Result object with success and fileUrl
 */
const uploadProductImage = async (productId, fileData) => {
  try {
    if (!fileData) {
      return { success: false, error: 'No file data provided' };
    }
    
    let fileBuffer;
    let fileName;
    let contentType;
    
    // Extract file info based on fileData type
    if (Buffer.isBuffer(fileData)) {
      fileBuffer = fileData;
      fileName = `${Date.now()}-product.jpg`;
      contentType = 'image/jpeg';
    } else if (fileData.buffer && Buffer.isBuffer(fileData.buffer)) {
      fileBuffer = fileData.buffer;
      fileName = fileData.originalname || `${Date.now()}-product.jpg`;
      contentType = fileData.mimetype || 'image/jpeg';
    } else if (typeof fileData === 'string') {
      if (fileData.startsWith('data:')) {
        const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          contentType = matches[1];
          fileBuffer = Buffer.from(matches[2], 'base64');
          const ext = contentType.split('/')[1] || 'jpg';
          fileName = `${Date.now()}-product.${ext}`;
        } else {
          return { success: false, error: 'Invalid data URL format' };
        }
      } else {
        fileBuffer = Buffer.from(fileData, 'base64');
        fileName = `${Date.now()}-product.jpg`;
        contentType = 'image/jpeg';
      }
    } else if (fileData.data && Buffer.isBuffer(fileData.data)) {
      fileBuffer = fileData.data;
      fileName = fileData.name || `${Date.now()}-product.jpg`;
      contentType = fileData.mimetype || 'image/jpeg';
    } else {
      return { success: false, error: 'Unsupported file data format' };
    }
    
    // Create a temporary file
    const tempFilePath = path.join(os.tmpdir(), fileName);
    await fs.promises.writeFile(tempFilePath, fileBuffer);
    
    // Set the destination in Firebase Storage
    const destination = `products/${productId}/${fileName}`;
    
    // Upload to Firebase Storage
    await adminStorage.upload(tempFilePath, {
      destination,
      metadata: {
        contentType,
        metadata: {
          firebaseStorageDownloadTokens: uuidv4()
        }
      }
    });
    
    // Remove the temporary file
    await fs.promises.unlink(tempFilePath);
    
    // Get public URL
    const fileUrl = `https://storage.googleapis.com/${adminStorage.name}/${destination}`;
    
    return {
      success: true,
      fileUrl
    };
  } catch (error) {
    console.error('Error uploading product image:', error);
    return {
      success: false,
      error: error.message || 'Error uploading file'
    };
  }
};

export default {
  uploadTransactionReceipt,
  uploadProductImage
}; 