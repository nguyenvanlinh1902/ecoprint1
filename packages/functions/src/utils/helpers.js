/**
 * Utility functions for the API
 */

/**
 * Generates a random ID string
 * @param {number} length Length of the ID (default: 10)
 * @returns {string} Random ID string
 */
export const generateId = (length = 10) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  
  return result;
};

/**
 * Formats a date to ISO string or returns the current date if no date provided
 * @param {Date|null} date Date to format 
 * @returns {string} ISO formatted date string
 */
export const formatDate = (date = null) => {
  return date ? new Date(date).toISOString() : new Date().toISOString();
};

/**
 * Checks if a value is empty (null, undefined, empty string, empty array, empty object)
 * @param {any} value Value to check
 * @returns {boolean} True if value is empty
 */
export const isEmpty = (value) => {
  return (
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === 'object' && Object.keys(value).length === 0)
  );
}; 