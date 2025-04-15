import React, { useState } from 'react';
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
      onClose();
    }
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
    
    try {
      const formData = new FormData();
      formData.append('receipt', file);
      
      await api.transactions.uploadReceipt(transaction.id, formData);
      
      setSuccess(true);
      
      // Notify parent component of success
      if (onSuccess) {
        onSuccess();
      }
      
      // Auto-close after success
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (error) {
      console.error('Receipt upload error:', error);
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
                  {file.name}
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