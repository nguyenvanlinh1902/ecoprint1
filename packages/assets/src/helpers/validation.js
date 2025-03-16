/**
 * Strips HTML tags from a string input
 * @param {string} input - The input string to sanitize
 * @returns {string} - The sanitized string with HTML tags removed
 */
export function stripHTML(input) {
    if (!input || typeof input !== 'string') return '';
    return input.replace(/<\/?[^>]+(>|$)/g, "");
}

/**
 * Validates input data for required fields
 * @param {object} data - The data object to validate
 * @returns {object} - An object with field errors
 */
export function validateInput(data) {
    const errors = {};
    for (const key in data) {
        if (data.hasOwnProperty(key)) {
            if (!data[key]) {
                errors[key] = `${key} is required`;
            }
        }
    }
    return errors;
} 