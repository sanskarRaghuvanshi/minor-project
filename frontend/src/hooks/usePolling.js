import { useEffect, useCallback, useRef } from 'react';

export function usePolling(fetchFn, intervalMs = 30000) {
  const intervalRef = useRef(null);
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  const startPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      fetchRef.current();
    }, intervalMs);
  }, [intervalMs]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchRef.current();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    startPolling();
    return stopPolling;
  }, [startPolling, stopPolling]);

  return { stopPolling, startPolling };
}

export default usePolling;
