import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import api from '@/api';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { firebaseStorage } from '@/config/firebase';

// Hàm nén ảnh
const compressImage = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    // Chỉ nén với file ảnh
    if (!file.type.startsWith('image/')) {
      return resolve(file);
    }
    
    // Đọc file
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      
      img.onload = () => {
        // Tạo canvas để resize
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Tính toán kích thước mới giữ tỉ lệ
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round(height * (maxWidth / width));
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round(width * (maxHeight / height));
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Vẽ ảnh vào canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas to Blob failed'));
              return;
            }
            
            // Tạo file từ blob
            const newFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            
            resolve(newFile);
          },
          file.type,
          quality
        );
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
  });
};

/**
 * Receipt Uploader Component
 * Used to upload receipts for existing transactions
 */
const ReceiptUploader = ({ 
  open, 
  transaction, 
  onClose, 
  onSuccess 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Handle file selection
  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Create preview for image files
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          setPreview(reader.result);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        // Reset preview if not an image
        setPreview(null);
      }
    }
  };

  // Handle dialog close
  const handleClose = () => {
    // Reset state
    if (!loading) {
      setFile(null);
      setPreview(null);
      setError('');
      setSuccess(false);
      setUploadProgress(0);
      onClose();
    }
  };

  // Upload file directly to Firebase Storage
  const uploadToFirebaseStorage = async (file) => {
    // Kiểm tra chi tiết về firebaseStorage
    console.log("Checking Firebase Storage initialization:", {
      hasFirebaseStorage: !!firebaseStorage,
      storageType: typeof firebaseStorage
    });

    if (!firebaseStorage) {
      console.error("Firebase Storage not initialized. Please check your Firebase configuration.");
      throw new Error("Kết nối với hệ thống lưu trữ thất bại. Vui lòng thử phương thức thay thế.");
    }
    
    // Create storage reference
    const timestamp = Date.now();
    const storageRef = ref(firebaseStorage, `receipts/${transaction.id}_${timestamp}_${file.name}`);
    
    // Upload file
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    // Listen for state changes
    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed', 
        (snapshot) => {
          // Get task progress
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(progress);
        },
        (error) => {
          // Handle errors
          console.error("Upload error:", error);
          reject(error);
        },
        async () => {
          // Upload completed successfully, get download URL
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  };

  // Handle upload submit
  const handleSubmit = async () => {
    if (!file) {
      setError('Please select a receipt file');
      return;
    }

    if (!transaction?.id) {
      setError('Invalid transaction data');
      return;
    }

    setLoading(true);
    setError('');
    setUploadProgress(0);
    
    try {
      // Nén ảnh trước khi upload
      let fileToUpload = file;
      
      if (file.type.startsWith('image/')) {
        fileToUpload = await compressImage(file);
        console.log('Image compressed:', {
          originalSize: file.size,
          compressedSize: fileToUpload.size,
          reduction: ((file.size - fileToUpload.size) / file.size * 100).toFixed(2) + '%'
        });
      }
      
      // Upload trực tiếp lên Firebase Storage
      console.log("Starting direct upload to Firebase Storage");
      try {
        const downloadUrl = await uploadToFirebaseStorage(fileToUpload);
        console.log("Upload successful, URL:", downloadUrl);
        
        // Cập nhật transaction với URL đã upload
        try {
          console.log("Updating transaction with receipt URL");
          await api.transactions.updateReceipt(transaction.id, downloadUrl);
        } catch (updateError) {
          // Ngay cả khi cập nhật thất bại, ảnh vẫn đã được upload thành công
          console.error("Error updating transaction, but upload was successful:", updateError);
        }
        
        setSuccess(true);
        
        // Notify parent component of success
        if (onSuccess) {
          onSuccess();
        }
        
        // Auto-close after success
        setTimeout(() => {
          handleClose();
        }, 1500);
      } catch (uploadError) {
        console.error("Firebase upload error:", uploadError);
        setError(uploadError.message || "Failed to upload using Firebase Storage. Please try the alternative method.");
      }
    } catch (error) {
      console.error('Receipt upload error:', error);
      setError(error.message || 'Failed to upload receipt. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fallback option if direct upload fails
  const handleFallbackUpload = async () => {
    try {
      setError('');
      setUploadProgress(0);
      
      // Nén ảnh trước khi upload
      let fileToUpload = file;
      
      if (file.type.startsWith('image/')) {
        fileToUpload = await compressImage(file);
      }
      
      const formData = new FormData();
      formData.append('receipt', fileToUpload);
      formData.append('optimize', 'true');
      
      await api.transactions.uploadReceipt(transaction.id, formData, (progress) => {
        setUploadProgress(progress);
      });
      
      setSuccess(true);
      
      if (onSuccess) {
        onSuccess();
      }
      
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (error) {
      console.error('Fallback upload error:', error);
      setError(error.message || 'Failed to upload receipt. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Upload Receipt</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Receipt uploaded successfully!
          </Alert>
        )}
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Please upload a receipt for Transaction #{transaction?.id?.substring(0, 8) || 'N/A'}
          </Typography>
          
          <Box sx={{ 
            border: '1px dashed #ccc', 
            borderRadius: 1, 
            p: 2, 
            textAlign: 'center',
            backgroundColor: '#f9f9f9',
            my: 2
          }}>
            <Button
              variant="outlined"
              component="label"
              disabled={loading || success}
              startIcon={<CloudUploadIcon />}
              fullWidth
            >
              Select Receipt File
              <input
                type="file"
                hidden
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/jpg, application/pdf"
              />
            </Button>
            
            {file && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="primary">
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </Typography>
              </Box>
            )}
            
            {preview && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <img 
                  src={preview} 
                  alt="Receipt preview" 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '200px', 
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }} 
                />
              </Box>
            )}
            
            {loading && uploadProgress > 0 && (
              <Box sx={{ width: '100%', mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Uploading: {uploadProgress}%
                </Typography>
                <Box
                  sx={{
                    height: 10,
                    bgcolor: '#e0e0e0',
                    borderRadius: 5,
                    mt: 1,
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${uploadProgress}%`,
                      bgcolor: 'primary.main',
                      position: 'absolute',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={handleClose} 
          disabled={loading}
        >
          Cancel
        </Button>
        {error && (
          <Button
            onClick={handleFallbackUpload}
            color="secondary"
            disabled={!file || loading || success}
          >
            Try Alternative Method
          </Button>
        )}
        <Button 
          onClick={handleSubmit} 
          variant="contained"
          color="primary"
          disabled={!file || loading || success}
        >
          {loading ? <CircularProgress size={24} /> : 'Upload Receipt'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReceiptUploader; 