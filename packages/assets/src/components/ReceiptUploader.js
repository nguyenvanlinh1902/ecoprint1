import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';
import { uploadToFirebase } from '../services/firebaseService';
import { getImageUrlFromFile } from './ImageFallback';

/**
 * Component for uploading receipts directly to Firebase Storage
 * @param {Object} props - Component props
 * @param {Function} props.onUploadSuccess - Callback when upload succeeds with the file URL
 * @param {Function} props.onUploadError - Callback when upload fails with the error
 * @param {string} props.transactionId - ID of the transaction
 * @param {boolean} props.disabled - Whether the uploader is disabled
 */
const ReceiptUploader = ({ 
  onUploadSuccess, 
  onUploadError, 
  transactionId, 
  disabled = false 
}) => {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [filePreview, setFilePreview] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  // ID duy nhất cho input file
  const inputId = `file-upload-${transactionId || 'default'}`;
  
  // Cleanup blob URL khi component unmount
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);
  
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      console.log('File selected:', {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size
      });
      
      // Reset states
      setError('');
      setUploadSuccess(false);
      
      // Validate file size (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File size exceeds 5MB limit');
        return;
      }
      
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(selectedFile.type)) {
        setError('File type not supported. Please upload JPG, PNG or PDF');
        return;
      }
      
      // Create file preview if it's an image
      if (selectedFile.type.startsWith('image/')) {
        // Tạo blob URL (giải pháp thay thế nhanh)
        const url = URL.createObjectURL(selectedFile);
        setBlobUrl(url);
        
        // Tạo base64 data URL (giải pháp dự phòng)
        const reader = new FileReader();
        reader.onload = (e) => {
          setFilePreview(e.target.result);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setBlobUrl(null);
        setFilePreview(null);
      }
      
      setFile(selectedFile);
    }
  };
  
  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }
    
    const pathPrefix = transactionId ? `receipts/${transactionId}` : 'receipts/temp';
    
    setUploading(true);
    setError('');
    
    try {
      console.log('Starting upload process for file:', file.name);
      
      // Chuẩn bị URL dự phòng trước
      const fallback = await getImageUrlFromFile(file);
      console.log('Created fallback URL:', fallback);
      
      // Giải pháp 1: Upload qua Firebase service
      try {
        const result = await uploadToFirebase(file, pathPrefix);
        
        if (result.success) {
          console.log('Receipt uploaded successfully to Firebase:', result.url);
          setUploadSuccess(true);
          
          if (onUploadSuccess) {
            onUploadSuccess(result.url);
          }
          
          // Thành công với Firebase - không dùng fallback
          return;
        }
        
        // Nếu Firebase thất bại, dùng fallback
        console.error('Firebase upload failed, switching to fallback:', result.error);
      } catch (firebaseError) {
        console.error('Firebase upload threw exception:', firebaseError);
      }
      
      // Dùng fallback URL từ bước chuẩn bị
      console.log('Using fallback URL:', fallback.url);
      setUploadSuccess(true);
      
      if (onUploadSuccess) {
        onUploadSuccess(fallback.url);
      }
    } catch (err) {
      console.error('All upload methods failed:', err);
      setError(err.message || 'An unexpected error occurred');
      
      if (onUploadError) {
        onUploadError(err.message);
      }
    } finally {
      setUploading(false);
    }
  };
  
  // Reset the uploader
  const handleReset = () => {
    setFile(null);
    setFilePreview(null);
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }
    setError('');
    setUploadSuccess(false);
  };
  
  return (
    <Box sx={{ width: '100%' }} role="region" aria-label="Receipt upload section">
      <Typography variant="subtitle2" gutterBottom>
        Payment Receipt
      </Typography>
      
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: 2
      }}>
        {/* Show preview */}
        {(blobUrl || filePreview) && (
          <Box 
            sx={{ 
              width: '100%', 
              height: 150, 
              backgroundImage: `url(${blobUrl || filePreview})`,
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              border: '1px solid #eee',
              borderRadius: 1
            }}
            role="img"
            aria-label="Receipt preview image"
          />
        )}
        
        {/* Buttons for file selection or uploaded status */}
        {!uploadSuccess ? (
          <>
            <Button
              variant="outlined"
              component="label"
              htmlFor={inputId}
              startIcon={<UploadIcon />}
              disabled={disabled || uploading}
              fullWidth
              aria-describedby="file-upload-help"
              aria-busy={uploading}
            >
              {file ? file.name : 'Select Receipt'}
              <input
                id={inputId}
                type="file"
                hidden
                accept="image/*, application/pdf"
                onChange={handleFileChange}
                aria-label="Upload receipt file"
              />
            </Button>
            
            {file && (
              <Button
                variant="contained"
                onClick={handleUpload}
                disabled={disabled || uploading}
                fullWidth
                aria-busy={uploading}
                aria-live="polite"
              >
                {uploading ? <CircularProgress size={24} aria-hidden="true" /> : 'Upload Receipt'}
              </Button>
            )}
          </>
        ) : (
          <Alert severity="success" aria-live="polite">
            Receipt uploaded successfully!{' '}
            <Button size="small" onClick={handleReset}>Upload Another</Button>
          </Alert>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mt: 1 }} aria-live="assertive">
            {error}
          </Alert>
        )}
        
        <Typography variant="caption" color="text.secondary" id="file-upload-help">
          Upload a screenshot or PDF of your payment confirmation. Supported formats: JPG, PNG, PDF.
          Maximum file size: 5MB.
        </Typography>
      </Box>
    </Box>
  );
};

export default ReceiptUploader; 