import {useState, useCallback} from 'react';
import {useStore} from '../../reducers/storeReducer';
import {api} from '../../helpers';
import {setToast} from '../../actions/storeActions';
import {handleError} from '../../services/errorService';
import queryString from 'query-string';

/**
 *
 * @param url
 * @param fullResp
 * @param successMsg
 * @param errorMsg
 * @returns {{handleUpload: ((function(*): Promise<*|{success: boolean, error: *}|boolean>)|*), uploading: boolean}}
 */
export default function useUploadFile({
  url,
  fullResp = false,
  successMsg = 'Saved successfully',
  errorMsg = 'Failed to save'
}) {
  const {dispatch} = useStore();
  const [uploading, setUploading] = useState(false);
  
  const handleUpload = useCallback(async file => {
    try {
      setUploading(true);
      const formData = new FormData();
      const {name, type} = file;
      formData.append('file', file);
      
      const queryParams = queryString.stringify({
        fileName: name,
        mimeType: type.replace('image/', '')
      });
      
      const resp = await api(
        `${url}?${queryParams}`,
        {
          body: formData,
          method: 'POST'
        }
      );
      
      if (resp.success) {
        setToast(dispatch, resp.message || successMsg);
      }
      if (resp.error) {
        setToast(dispatch, resp.error, true);
      }
      return fullResp ? resp : resp.success;
    } catch (e) {
      handleError(e);
      setToast(dispatch, errorMsg, true);
      return fullResp ? {success: false, error: e.message} : false;
    } finally {
      setUploading(false);
    }
  }, [url, dispatch, fullResp, successMsg, errorMsg]);

  return {uploading, handleUpload};
} 