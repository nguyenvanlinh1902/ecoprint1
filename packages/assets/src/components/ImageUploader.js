import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  Alert
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

/**
 * Component for handling image preview with delayed upload
 * @param {Object} props Component props
 * @param {string} props.imageUrl Current image URL
 * @param {Function} props.onImageChange Callback when image changes (returns file and preview URL)
 * @param {string} props.path Storage path category
 * @param {number} props.height Height of the container
 * @param {boolean} props.disabled Whether the uploader is disabled
 */
const ImageUploader = ({
  onImageChange,
  imageUrl,
  path = 'products',
  height = 200,
  disabled = false
}) => {
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState(imageUrl);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  
  // Maximum file size: 5MB
  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  const handleButtonClick = () => {
    if (disabled) return;
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileChange = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Reset error state
    setError('');

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
      setError(`File quá lớn: ${fileSizeMB}MB (tối đa ${maxSizeMB}MB)`);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
    
    setLoading(true);
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setPreviewUrl(previewUrl);
    
    // Call onChange with file data
    console.log(`[ImageUploader] File selected: ${file.name}, size: ${(file.size / 1024).toFixed(2)}KB`);
    onImageChange({
      file,
      previewUrl,
      path
    });
    
    setLoading(false);
  }, [onImageChange, path]);
  
  const handleRemoveImage = () => {
    setPreviewUrl('');
    setError('');
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    onImageChange({
      file: null,
      previewUrl: '',
      path
    });
  };
  
  // Display either the remote URL or the local preview URL
  const displayImageUrl = previewUrl || imageUrl;
  
  return (
    <Box sx={{ width: '100%', mb: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box
        sx={{
          width: '100%', 
          height,
          border: '1px dashed #ccc',
          borderRadius: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          position: 'relative',
          backgroundImage: displayImageUrl ? `url(${displayImageUrl})` : 'none',
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          cursor: disabled ? 'not-allowed' : 'pointer',
          backgroundColor: '#f9f9f9',
          '&:hover': {
            borderColor: disabled ? '#ccc' : 'primary.main',
          },
        }}
        onClick={disabled ? undefined : handleButtonClick}
      >
        {!displayImageUrl && !loading && (
          <Box sx={{ textAlign: 'center', p: 2 }}>
            <UploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body1">
              Kéo thả hoặc nhấn để chọn hình ảnh
            </Typography>
            <Typography variant="caption" color="text.secondary">
              PNG, JPG tối đa 5MB
            </Typography>
          </Box>
        )}
        
        {loading && (
          <Box 
            sx={{ 
              position: 'absolute',
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.7)'
            }}
          >
            <CircularProgress />
          </Box>
        )}
        
        {displayImageUrl && !loading && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              zIndex: 2
            }}
          >
            <Button
              variant="contained"
              size="small"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveImage();
              }}
              disabled={disabled}
            >
              Xóa
            </Button>
          </Box>
        )}
        
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={disabled || loading}
          ref={fileInputRef}
          style={{ display: 'none' }}
        />
      </Box>
    </Box>
  );
};

export default ImageUploader; 