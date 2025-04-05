import {useState, useCallback} from 'react';
import {api} from '../../helpers';
import {useStore} from '../../reducers/storeReducer';
import {setToast} from '../../actions/storeActions';
import {handleError} from '../../services/errorService';

/**
 * @param url
 * @param defaultState
 * @param fullResp
 * @param useToast
 * @param successMsg
 * @param errorMsg
 * @returns {{editing: boolean, handleEdit}}
 */
export default function useEditApi({
  url,
  defaultState = false,
  fullResp = false,
  useToast = true,
  successMsg = 'Saved successfully',
  errorMsg = 'Failed to save'
}) {
  const {dispatch} = useStore();
  const [editing, setEditing] = useState(defaultState);

  /**
   * @param data
   * @param newEditing
   * @returns {Promise<boolean>}
   */
  const handleEdit = useCallback(async (data, newEditing = true) => {
    try {
      setEditing(prev =>
        typeof newEditing === 'boolean' ? newEditing : {...prev, [newEditing]: true}
      );
      const resp = await api(url, {body: {data}, method: 'PUT'});
      if (resp.success && useToast) {
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
      setEditing(prev =>
        typeof newEditing === 'boolean' ? false : {...prev, [newEditing]: false}
      );
    }
  }, [url, dispatch, fullResp, useToast, successMsg, errorMsg]);

  return {editing, handleEdit};
}
