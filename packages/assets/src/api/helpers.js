// Import axios since we can't directly import apiClient due to circular dependencies
import axios from 'axios';

// Get the base URL from environment
const API_URL = import.meta.env.VITE_API_URL || 'https://us-central1-ecoprint1-3cd5c.cloudfunctions.net/api';

// Helper function to get authorization token
const getAuthToken = () => {
  return localStorage.getItem('auth_token');
};

/**
 * Creates API methods for a specific resource
 * @param {string} resourceName - The resource name (e.g., 'users', 'products')
 * @returns {Object} - Methods for working with the resource
 */
export const createResourceMethods = (resourceName) => {
  const endpoint = `${API_URL}/${resourceName}`;
  
  // Helper to create headers with authentication
  const getHeaders = () => {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  };
  
  return {
    // Create a new resource
    add: async (data) => {
      const response = await axios.post(endpoint, data, {
        headers: getHeaders()
      });
      return response.data.data || response.data;
    },
    
    // Get a resource by ID
    getById: async (id) => {
      const response = await axios.get(`${endpoint}/${id}`, {
        headers: getHeaders()
      });
      return response.data.data || response.data;
    },
    
    // Get all resources with optional filters
    getAll: async (params = {}) => {
      const response = await axios.get(endpoint, { 
        params,
        headers: getHeaders()
      });
      return response.data.data || response.data;
    },
    
    // Update a resource
    update: async (id, data) => {
      const response = await axios.put(`${endpoint}/${id}`, data, {
        headers: getHeaders()
      });
      return response.data.data || response.data;
    },
    
    // Partially update a resource
    patch: async (id, data) => {
      const response = await axios.patch(`${endpoint}/${id}`, data, {
        headers: getHeaders()
      });
      return response.data.data || response.data;
    },
    
    // Delete a resource
    delete: async (id) => {
      await axios.delete(`${endpoint}/${id}`, {
        headers: getHeaders()
      });
      return true;
    }
  };
};

/**
 * Storage helper methods
 */
export const storage = {
  uploadFile: async (formData, onProgress) => {
    const headers = {
      'Content-Type': 'multipart/form-data'
    };
    
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await axios.post(`${API_URL}/storage/upload`, formData, {
      headers,
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      }
    });
    
    return response.data;
  },
  
  deleteFile: async (fileUrl) => {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const fileId = fileUrl.split('/').pop().split('?')[0];
    await axios.delete(`${API_URL}/storage/files/${fileId}`, {
      headers
    });
    return true;
  }
}; 