/**
 * Capitalise the first letter of a string.
 * @param {string} str
 * @returns {string}
 */
export const capitalize = (str = '') =>
  str.charAt(0).toUpperCase() + str.slice(1);

/**
 * Format a date string to a locale-friendly format.
 * @param {string|Date} date
 * @returns {string}
 */
export const formatDate = (date) =>
  new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

/**
 * Debounce a function call.
 * @param {Function} fn
 * @param {number} delay - milliseconds
 */
export const debounce = (fn, delay = 300) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

/**
 * Safely parse JSON without throwing.
 * @param {string} str
 * @param {*} fallback
 */
export const safeJsonParse = (str, fallback = null) => {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};
