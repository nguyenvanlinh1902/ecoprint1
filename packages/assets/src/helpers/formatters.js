/**
 * Format a number as currency
 * @param {number} value - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @param {string} locale - Locale for formatting (default: en-US)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, currency = 'USD', locale = 'en-US') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Format a date
 * @param {string|Date} date - Date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @param {string} locale - Locale for formatting (default: en-US)
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}, locale = 'en-US') => {
  if (!date) return 'N/A';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };
  
  try {
    // Kiểm tra nếu là timestamp từ Firestore
    if (date && typeof date === 'object' && date.toDate) {
      return new Intl.DateTimeFormat(locale, defaultOptions).format(date.toDate());
    }
    
    // Chuyển đổi thành Date object nếu là chuỗi hoặc số
    const dateObj = new Date(date);
    
    // Kiểm tra xem ngày có hợp lệ không
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date value:', date);
      return 'N/A';
    }
    
    return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error, date);
    return 'N/A';
  }
};

/**
 * Format a number with thousands separators
 * @param {number} value - Number to format
 * @param {number} decimals - Number of decimal places
 * @param {string} locale - Locale for formatting (default: en-US)
 * @returns {string} Formatted number string
 */
export const formatNumber = (value, decimals = 0, locale = 'en-US') => {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * Truncate a string with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length
 * @returns {string} Truncated string
 */
export const truncateText = (text, length = 100) => {
  if (!text || text.length <= length) return text;
  return `${text.substring(0, length)}...`;
};

/**
 * Format a file size in human-readable format
 * @param {number} bytes - Size in bytes
 * @param {number} decimals - Decimal places for display
 * @returns {string} Formatted size with unit
 */
export const formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
};

/**
 * Format a phone number
 * @param {string} phone - Phone number to format
 * @returns {string} Formatted phone number
 */
export const formatPhone = (phone) => {
  // Only process strings
  if (!phone || typeof phone !== 'string') return phone;
  
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format for US phone number, adjust as needed for other regions
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  
  return phone;
};

// Format date and time
export const formatDateTime = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  try {
    // Kiểm tra nếu là timestamp từ Firestore
    if (timestamp && typeof timestamp === 'object' && timestamp.toDate) {
      const date = timestamp.toDate();
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    }
    
    // Chuyển đổi thành Date object nếu là chuỗi hoặc số
    const date = new Date(timestamp);
    
    // Kiểm tra xem ngày có hợp lệ không
    if (isNaN(date.getTime())) {
      console.warn('Invalid datetime value:', timestamp);
      return 'N/A';
    }
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (error) {
    console.error('Error formatting datetime:', error, timestamp);
    return 'N/A';
  }
};

// Format phone number: (123) 456-7890
export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return 'N/A';
  
  // Ensure it's a string
  const phoneStr = String(phoneNumber);
  
  // Remove all non-numeric characters
  const cleaned = phoneStr.replace(/\D/g, '');
  
  // Check for different phone number formats
  const match10 = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match10) {
    return '(' + match10[1] + ') ' + match10[2] + '-' + match10[3];
  }
  
  // For 7-digit numbers
  const match7 = cleaned.match(/^(\d{3})(\d{4})$/);
  if (match7) {
    return match7[1] + '-' + match7[2];
  }
  
  // For international numbers with country code (assume US +1 if 11 digits)
  const match11 = cleaned.match(/^1(\d{3})(\d{3})(\d{4})$/);
  if (match11) {
    return '+1 (' + match11[1] + ') ' + match11[2] + '-' + match11[3];
  }
  
  // If we can't format it, just return it cleaned
  return cleaned.length > 0 ? cleaned : phoneNumber;
}; 