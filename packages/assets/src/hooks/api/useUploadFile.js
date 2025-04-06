import {useState, useCallback} from 'react';
import {useStore} from '../../reducers/storeReducer';
import {setToast} from '../../actions/storeActions';
import {handleError} from '../../services/errorService';
import {apiClient} from '../../helpers';

/**
 * Hook for handling file uploads through the backend API
 * @param {Object} options Upload options
 * @param {string} options.path Storage path category (products, profiles, etc.)
 * @param {boolean} options.fullResp Whether to return the full response or just success flag
 * @param {string} options.successMsg Success message
 * @param {string} options.errorMsg Error message
 * @returns {{handleUpload: Function, uploading: boolean}}
 */
export default function useUploadFile({
  path = 'products',
  fullResp = false,
  successMsg = 'Saved successfully',
  errorMsg = 'Failed to save'
}) {
  const {dispatch} = useStore();
  const [uploading, setUploading] = useState(false);
  
  const handleUpload = useCallback(async file => {
    try {
      setUploading(true);
      
      // Create FormData object
      const formData = new FormData();
      formData.append('image', file);
      formData.append('path', path);
      
      // Upload using backend API
      const response = await apiClient.post('/products/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const result = response.data;
      
      if (result.success) {
        setToast(dispatch, successMsg);
        return fullResp 
          ? { 
              success: true, 
              data: { url: result.imageUrl }, 
              error: null 
            } 
          : true;
      } else {
        const errorMessage = result.message || result.error || errorMsg;
        setToast(dispatch, errorMessage, true);
        return fullResp 
          ? { 
              success: false, 
              data: null, 
              error: errorMessage 
            } 
          : false;
      }
    } catch (e) {
      handleError(e);
      const errorMessage = e.response?.data?.message || e.message || errorMsg;
      setToast(dispatch, errorMessage, true);
      return fullResp ? {success: false, error: errorMessage} : false;
    } finally {
      setUploading(false);
    }
  }, [path, dispatch, fullResp, successMsg, errorMsg]);

  return {uploading, handleUpload};
} 