// Performance optimization utilities

/**
 * Throttle function to limit how often a function can fire
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Debounce function to delay execution until after wait period
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Lazy load components for better initial load performance
 */
export const lazyLoadWithRetry = (componentImport, retries = 3) => {
  return new Promise((resolve, reject) => {
    componentImport()
      .then(resolve)
      .catch((error) => {
        if (retries === 0) {
          reject(error);
          return;
        }
        setTimeout(() => {
          lazyLoadWithRetry(componentImport, retries - 1).then(resolve, reject);
        }, 1000);
      });
  });
};

/**
 * Check if element is in viewport for lazy rendering
 */
export const isInViewport = (element) => {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};

/**
 * Measure component render time
 */
export const measurePerformance = (componentName, callback) => {
  const start = performance.now();
  const result = callback();
  const end = performance.now();
  if (end - start > 16) { // More than one frame (16ms at 60fps)
    console.warn(`[Performance] ${componentName} took ${(end - start).toFixed(2)}ms to render`);
  }
  return result;
};

