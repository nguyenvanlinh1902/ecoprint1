import { useCallback } from 'react';
import useCrudApi from './useCrudApi';

/**
 * Hook for deleting resources via API
 * @param {Object} options Options for the API call
 * @param {string} options.url API endpoint
 * @param {string} options.successMsg Success message
 * @param {string} options.errorMsg Error message
 * @returns {Object} Hook state and methods
 */
export default function useDeleteApi({
  url,
  successMsg = 'Deleted successfully',
  errorMsg = 'Failed to delete'
}) {
  // Use the new useCrudApi hook
  const { deleting, deleteData } = useCrudApi({
    baseUrl: url,
    deleteSuccessMsg: successMsg,
    deleteErrorMsg: errorMsg,
    initLoad: false // Don't load data on mount
  });

  // Maintain the original API
  const handleDelete = useCallback(async (id = null) => {
    return deleteData(id);
  }, [deleteData]);

  return { deleting, handleDelete };
}
