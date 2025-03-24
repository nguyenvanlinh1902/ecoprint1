import { admin } from '../config/firebase.js';

/**
 * Service for handling file uploads to Firebase Storage
 */

/**
 * Process file data from various sources (multer, base64, etc.)
 * @param {Object} fileData - File data from request
 * @returns {Object} Processed file object with buffer and metadata
 */
export const processFileData = (fileData) => {
  // Start with null values
  let file = null;
  let fileBuffer = null;
  
  // Handle different file formats
  if (!fileData) {
    console.log('processFileData: No file data provided');
    return { success: false, error: 'No file data provided' };
  }
  
  try {
    console.log('Processing file data of type:', typeof fileData);
    if (typeof fileData === 'object') {
      console.log('File object keys:', Object.keys(fileData));
    }
    
    if (fileData.buffer) {
      console.log('Processing file from multer buffer');
      file = {
        originalname: fileData.originalname || 'unnamed-file',
        mimetype: fileData.mimetype || 'application/octet-stream',
        size: fileData.size || 0
      };
      fileBuffer = fileData.buffer;
    } 
    // Case 2: File is from multer with @koa/multer (ctx.req.files.fieldname)
    else if (fileData.data) {
      console.log('Processing file from @koa/multer data');
      file = {
        originalname: fileData.name || 'unnamed-file',
        mimetype: fileData.mimetype || 'application/octet-stream',
        size: fileData.size || 0
      };
      fileBuffer = fileData.data;
    }
    // Case 3: Handle base64 encoded data in string format
    else if (typeof fileData === 'string' || fileData instanceof String) {
      console.log('Processing file from base64 string');
      
      // Handle both string and base64 data URI
      const base64Data = fileData.includes('base64,') 
        ? fileData.split('base64,')[1] 
        : fileData;
      
      try {
        fileBuffer = Buffer.from(base64Data, 'base64');
        
        // Create a file-like object
        file = {
          originalname: 'file-from-base64.jpg',
          mimetype: 'image/jpeg', // Default for base64
          size: fileBuffer.length
        };
      } catch (base64Error) {
        console.error('Failed to decode base64 data:', base64Error);
        return { 
          success: false, 
          error: 'Invalid base64 data: ' + base64Error.message 
        };
      }
    }
    // Case 4: Handle object with base64 receipt/image property
    else if (fileData.receipt || fileData.image) {
      const base64Field = fileData.receipt || fileData.image;
      const fieldName = fileData.receipt ? 'receipt' : 'image';
      
      console.log(`Processing file from ${fieldName} object property`);
      
      // Check if it's already a valid file object
      if (base64Field && typeof base64Field === 'object' && base64Field.buffer) {
        console.log(`Using ${fieldName} buffer directly`);
        file = {
          originalname: base64Field.originalname || `${fieldName}.jpg`,
          mimetype: base64Field.mimetype || 'image/jpeg',
          size: base64Field.size || 0
        };
        fileBuffer = base64Field.buffer;
      }
      // Process as base64
      else if (typeof base64Field === 'string' && base64Field.length > 0) {
        console.log(`Processing ${fieldName} as base64 string`);
        try {
          const base64Data = base64Field.includes('base64,') 
            ? base64Field.split('base64,')[1] 
            : base64Field;
          
          fileBuffer = Buffer.from(base64Data, 'base64');
          
          file = {
            originalname: fileData.name || `${fieldName}.jpg`,
            mimetype: fileData.mimeType || 'image/jpeg',
            size: fileBuffer.length
          };
        } catch (base64Error) {
          console.error(`Failed to decode ${fieldName} base64 data:`, base64Error);
          return { 
            success: false, 
            error: `Invalid ${fieldName} base64 data: ` + base64Error.message 
          };
        }
      } else {
        console.error(`Invalid ${fieldName} format`);
        return {
          success: false,
          error: `Invalid ${fieldName} format`
        };
      }
    }
    // Case 5: Handle file object directly passed from middleware
    else if (fileData.originalname && typeof fileData.originalname === 'string') {
      console.log('Processing direct file object');
      file = {
        originalname: fileData.originalname,
        mimetype: fileData.mimetype || 'application/octet-stream',
        size: fileData.size || 0
      };
      
      // Try to find buffer in various properties
      if (fileData.buffer) {
        fileBuffer = fileData.buffer;
      } else if (fileData.data) {
        fileBuffer = fileData.data;
      } else {
        console.error('File object has no buffer or data property');
        return {
          success: false,
          error: 'File object has no buffer data'
        };
      }
    }
    // Case 6: Unknown format - log detailed info for debugging
    else {
      console.error('Unknown file data format', {
        type: typeof fileData,
        isArray: Array.isArray(fileData),
        keys: typeof fileData === 'object' ? Object.keys(fileData) : 'N/A'
      });
      
      return { 
        success: false, 
        error: 'Unsupported file data format' 
      };
    }
    
    // Validate we have both file metadata and buffer
    if (!file || !fileBuffer) {
      console.error('Failed to process file data: Missing file or buffer');
      return { 
        success: false, 
        error: 'Invalid file format or corrupted file' 
      };
    }
    
    // Validate buffer content
    if (!fileBuffer.length || fileBuffer.length <= 0) {
      console.error('Empty file buffer, length:', fileBuffer.length);
      return {
        success: false,
        error: 'Empty file buffer'
      };
    }
    
    console.log('Successfully processed file:', file.originalname, 'size:', fileBuffer.length);
    
    return {
      success: true,
      file,
      buffer: fileBuffer
    };
    
  } catch (error) {
    console.error('Error processing file data:', error);
    return {
      success: false,
      error: `File processing error: ${error.message}`
    };
  }
};

/**
 * Upload file to Firebase Storage
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {Object} options - Upload options
 * @param {string} options.fileName - File name in storage
 * @param {string} options.contentType - File content type
 * @param {boolean} options.makePublic - Whether to make the file public
 * @returns {Object} Upload result with URL if successful
 */
export const uploadToStorage = async (fileBuffer, options) => {
  const { 
    fileName, 
    contentType = 'application/octet-stream',
    makePublic = true 
  } = options;
  
  try {
    console.log(`Uploading file to Firebase Storage: ${fileName}`);
    
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('Empty file buffer');
    }
    
    const bucket = admin.storage().bucket();
    const fileUpload = bucket.file(fileName);
    
    // Upload the file
    await fileUpload.save(fileBuffer, {
      metadata: {
        contentType: contentType
      }
    });
    
    // Make the file public if requested
    let fileUrl = '';
    if (makePublic) {
      await fileUpload.makePublic();
      fileUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    } else {
      // Get signed URL if not public
      const [url] = await fileUpload.getSignedUrl({
        action: 'read',
        expires: '03-01-2500' // Far future expiration
      });
      fileUrl = url;
    }
    
    console.log('File uploaded successfully, URL:', fileUrl);
    
    return {
      success: true,
      fileUrl,
      fileName,
      contentType
    };
  } catch (error) {
    console.error('Firebase Storage upload error:', error);
    return {
      success: false,
      error: `Storage upload failed: ${error.message}`
    };
  }
};

/**
 * Upload receipt for a transaction
 * @param {string} userId - User ID
 * @param {string} transactionId - Transaction ID
 * @param {Object|string} fileData - File data from request
 * @returns {Object} Upload result
 */
export const uploadTransactionReceipt = async (userId, transactionId, fileData) => {
  try {
    // Process the file data
    const processResult = processFileData(fileData);
    
    if (!processResult.success) {
      return processResult;
    }
    
    const { file, buffer } = processResult;
    
    // Create a unique filename
    const fileName = `receipts/${userId}/${transactionId}_${Date.now()}_${file.originalname}`;
    
    // Upload to storage
    const uploadResult = await uploadToStorage(buffer, {
      fileName,
      contentType: file.mimetype,
      makePublic: true
    });
    
    return uploadResult;
  } catch (error) {
    console.error('Transaction receipt upload error:', error);
    return {
      success: false,
      error: `Receipt upload failed: ${error.message}`
    };
  }
};

/**
 * Upload product image
 * @param {string} productId - Product ID
 * @param {Object|string} fileData - File data from request
 * @returns {Object} Upload result
 */
export const uploadProductImage = async (productId, fileData) => {
  try {
    // Process the file data
    const processResult = processFileData(fileData);
    
    if (!processResult.success) {
      return processResult;
    }
    
    const { file, buffer } = processResult;
    
    // Create a unique filename
    const fileName = `products/${productId}/${Date.now()}_${file.originalname}`;
    
    // Upload to storage
    const uploadResult = await uploadToStorage(buffer, {
      fileName,
      contentType: file.mimetype,
      makePublic: true
    });
    
    return uploadResult;
  } catch (error) {
    console.error('Product image upload error:', error);
    return {
      success: false,
      error: `Product image upload failed: ${error.message}`
    };
  }
};

/**
 * Upload user profile image
 * @param {string} userId - User ID
 * @param {Object|string} fileData - File data from request
 * @returns {Object} Upload result
 */
export const uploadProfileImage = async (userId, fileData) => {
  try {
    // Process the file data
    const processResult = processFileData(fileData);
    
    if (!processResult.success) {
      return processResult;
    }
    
    const { file, buffer } = processResult;
    
    // Create a unique filename
    const fileName = `profiles/${userId}/${Date.now()}_${file.originalname}`;
    
    // Upload to storage
    const uploadResult = await uploadToStorage(buffer, {
      fileName,
      contentType: file.mimetype,
      makePublic: true
    });
    
    return uploadResult;
  } catch (error) {
    console.error('Profile image upload error:', error);
    return {
      success: false,
      error: `Profile image upload failed: ${error.message}`
    };
  }
}; 