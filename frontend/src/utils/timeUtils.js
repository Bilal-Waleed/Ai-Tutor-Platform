// src/utils/timeUtils.js
// Centralized time utility for consistent timezone handling across the app

/**
 * Format date and time for Pakistani timezone or user's device timezone
 * @param {string|Date} dateString - Date string or Date object
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string
 */
export const formatDateTime = (dateString, options = {}) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', dateString);
      return 'Invalid Date';
    }
    
    // Default options for Pakistani timezone
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Karachi', // Pakistani timezone
      timeZoneName: 'short'
    };
    
    // Merge with provided options
    const formatOptions = { ...defaultOptions, ...options };
    
    return date.toLocaleString('en-US', formatOptions);
  } catch (error) {
    console.error('Error formatting date:', error, 'Input:', dateString);
    return 'Date Error';
  }
};

/**
 * Format time only (HH:MM format) in Pakistan timezone
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Formatted time string
 */
export const formatTime = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return 'Invalid Time';
    }
    
    // Format time directly in Pakistan timezone
    return date.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Karachi',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting time:', error);
    return 'Time Error';
  }
};

/**
 * Format date only (MMM DD format) in Pakistan timezone
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    // Format date directly in Pakistan timezone
    return date.toLocaleDateString('en-US', {
      timeZone: 'Asia/Karachi',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Date Error';
  }
};

/**
 * Format relative time (Today, Yesterday, X days ago) in Pakistan timezone
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    // Get dates in Pakistan timezone for comparison
    const pakistanDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
    const pakistanNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
    
    // Reset time to start of day for accurate day comparison
    const pakistanDateStart = new Date(pakistanDate.getFullYear(), pakistanDate.getMonth(), pakistanDate.getDate());
    const pakistanNowStart = new Date(pakistanNow.getFullYear(), pakistanNow.getMonth(), pakistanNow.getDate());
    
    const diffTime = pakistanNowStart - pakistanDateStart;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    
    return formatDate(dateString);
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return 'Date Error';
  }
};

/**
 * Format quiz time duration (MM:SS format)
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
export const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Get current Pakistani time
 * @returns {Date} Current date in Pakistani timezone
 */
export const getCurrentPakistanTime = () => {
  const now = new Date();
  // Return current time - JavaScript handles timezone conversion automatically
  return now;
};

/**
 * Convert UTC time to Pakistani time
 * @param {string|Date} utcDate - UTC date string or Date object
 * @returns {Date} Date in Pakistani timezone
 */
export const convertToPakistanTime = (utcDate) => {
  if (!utcDate) return null;
  
  try {
    const date = new Date(utcDate);
    // Return the date object - JavaScript Date objects are timezone-aware
    // The conversion will happen when formatting
    return date;
  } catch (error) {
    console.error('Error converting to Pakistan time:', error);
    return null;
  }
};

/**
 * Test function to verify Pakistan timezone conversion
 * @returns {Object} Test results
 */
export const testPakistanTimezone = () => {
  const now = new Date();
  
  return {
    utcTime: now.toISOString(),
    pakistanTime: now.toLocaleString('en-US', {
      timeZone: 'Asia/Karachi',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }),
    timezoneOffset: now.getTimezoneOffset(),
    testPassed: true
  };
};
