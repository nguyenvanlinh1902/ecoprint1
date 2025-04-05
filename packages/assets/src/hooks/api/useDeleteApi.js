import {useState, useCallback} from 'react';
import {api} from '../../helpers';
import {useStore} from '../../reducers/storeReducer';
import {setToast} from '../../actions/storeActions';
import {handleError} from '../../services/errorService';

/**
 * @param url
 * @returns {{deleting: boolean, handleDelete}}
 */
export default function useDeleteApi({url}) {
  const {dispatch} = useStore();
  const [deleting, setDeleting] = useState(false);

  /**
   * @param data
   * @returns {Promise<boolean>}
   */
  const handleDelete = useCallback(async data => {
    try {
      setDeleting(true);
      const resp = await api(url, {body: {data}, method: 'DELETE'});
      if (resp.success) {
        setToast(dispatch, resp.message || 'Deleted successfully');
        return true;
      }
      if (resp.error) {
        setToast(dispatch, resp.error, true);
      }
      return false;
    } catch (e) {
      handleError(e);
      setToast(dispatch, 'Failed to delete', true);
      return false;
    } finally {
      setDeleting(false);
    }
  }, [url, dispatch]);

  return {deleting, handleDelete};
}
