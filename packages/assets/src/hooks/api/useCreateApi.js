import {useState, useCallback} from 'react';
import {api} from '../../helpers';
import {useStore} from '../../reducers/storeReducer';
import {setToast} from '../../actions/storeActions';
import {handleError} from '../../services/errorService';

/**
 * @param url
 * @param method
 * @param fullResp
 * @param successMsg
 * @param errorMsg
 * @returns {{creating: boolean, handleCreate}}
 */
export default function useCreateApi({
  url,
  method = 'POST',
  fullResp = false,
  successMsg = 'Saved successfully',
  errorMsg = 'Failed to save'
}) {
  const {dispatch} = useStore();
  const [creating, setCreating] = useState(false);

  /**
   * @param data
   * @returns {Promise<{success: boolean, error}>}
   */
  const handleCreate = useCallback(async data => {
    try {
      setCreating(true);
      const resp = await api(url, {body: data, method});
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
      setCreating(false);
    }
  }, [url, method, dispatch, fullResp, successMsg, errorMsg]);

  return {creating, handleCreate};
}
