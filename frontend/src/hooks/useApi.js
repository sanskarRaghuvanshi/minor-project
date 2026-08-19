import { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../api/axiosInstance';

export function useApi(apiFunc, immediate = false) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const execute = useCallback(async (...args) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      let result;
      if (typeof apiFunc === 'function') {
        result = await apiFunc(...args);
      } else if (typeof apiFunc === 'string') {
        const { data: responseData } = await axiosInstance.get(apiFunc, { signal: controller.signal });
        result = responseData;
      } else {
        result = await apiFunc(...args);
      }

      if (mountedRef.current) {
        setData(result.data || result);
        setLoading(false);
      }
      return result;
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') {
        return null;
      }
      if (mountedRef.current) {
        setError(err.response?.data?.message || err.message || 'An error occurred');
        setLoading(false);
      }
      throw err;
    }
  }, [apiFunc]);

  const refetch = useCallback(async () => {
    if (data) return execute();
    return null;
  }, [execute, data]);

  useEffect(() => {
    if (immediate) execute();
  }, []);

  return { data, loading, error, execute, refetch };
}

export default useApi;
