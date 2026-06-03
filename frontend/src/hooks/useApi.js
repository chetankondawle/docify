import { useState, useEffect, useCallback } from 'react';

/**
 * Generic hook for API calls.
 *
 * @param {Function} apiFn   - Service function that returns a promise
 * @param {boolean}  immediate - Auto-fetch on mount (default: true)
 *
 * Usage:
 *   const { data, loading, error, execute } = useApi(fetchHealthStatus);
 */
const useApi = (apiFn, immediate = true) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const execute = useCallback(
    async (...args) => {
      try {
        setLoading(true);
        setError(null);
        const result = await apiFn(...args);
        setData(result);
        return result;
      } catch (err) {
        setError(err.message || 'Something went wrong');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [apiFn]
  );

  useEffect(() => {
    if (immediate) {
      execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading, error, execute };
};

export default useApi;
