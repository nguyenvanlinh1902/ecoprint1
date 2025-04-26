import {useCallback} from 'react';
import useCrudApi from './useCrudApi';

/**
 * Hook for creating resources via API
 * @param {Object} options Options for the API call
 * @param {string} options.url API endpoint
 * @param {string} options.method HTTP method (default: POST)
 * @param {boolean} options.fullResp Whether to return full response
 * @param {string} options.successMsg Success message
 * @param {string} options.errorMsg Error message
 * @returns {Object} Hook state and methods
 */
export default function useCreateApi({
  url,
  method = 'POST',
  fullResp = false,
  successMsg = 'Saved successfully',
  errorMsg = 'Failed to save'
}) {
  // Use the new useCrudApi hook
  const { creating, createData } = useCrudApi({
    baseUrl: url,
    fullResp,
    createSuccessMsg: successMsg,
    createErrorMsg: errorMsg,
    initLoad: false // Don't load data on mount
  });

  // Maintain the original API
  const handleCreate = useCallback(async (data) => {
    return createData(data);
  }, [createData]);

  return { creating, handleCreate };
}
