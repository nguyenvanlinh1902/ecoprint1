import {useCallback} from 'react';
import useCrudApi from './useCrudApi';

/**
 * Hook for editing resources via API
 * @param {Object} options Options for the API call
 * @param {string} options.url API endpoint
 * @param {boolean} options.defaultState Initial editing state
 * @param {boolean} options.fullResp Whether to return full response
 * @param {boolean} options.useToast Whether to show toast notifications
 * @param {string} options.successMsg Success message
 * @param {string} options.errorMsg Error message
 * @returns {Object} Hook state and methods
 */
export default function useEditApi({
  url,
  defaultState = false,
  fullResp = false,
  useToast = true,
  successMsg = 'Saved successfully',
  errorMsg = 'Failed to save'
}) {
  // Use the new useCrudApi hook
  const { updating, updateData } = useCrudApi({
    baseUrl: url,
    fullResp,
    updateSuccessMsg: successMsg,
    updateErrorMsg: errorMsg,
    initLoad: false // Don't load data on mount
  });

  // Maintain the original API
  const handleEdit = useCallback(async (data, id) => {
    return updateData(data, id);
  }, [updateData]);

  return { editing: updating, handleEdit };
}
