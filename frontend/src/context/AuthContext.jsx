import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import axiosInstance from '../api/axiosInstance';
import { refreshAccessToken } from '../api/axiosInstance';
import { ENDPOINTS } from '../api/endpoints';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const refreshIntervalRef = useRef(null);

  const clearAuth = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const startRefreshInterval = useCallback(() => {
    if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    refreshIntervalRef.current = setInterval(async () => {
      if (!localStorage.getItem('refreshToken')) return;
      try {
        await refreshAccessToken();
      } catch {
        clearAuth();
      }
    }, 14 * 60 * 1000);
  }, [clearAuth]);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.post(ENDPOINTS.AUTH.LOGIN, { email, password });
      const { token, refreshToken, user: userData } = data.data;
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      startRefreshInterval();
      return userData;
    } finally {
      setLoading(false);
    }
  }, [startRefreshInterval]);

  const register = useCallback(async (payload) => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.post(ENDPOINTS.AUTH.REGISTER, payload);
      const { token, refreshToken, user: userData } = data.data;
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      startRefreshInterval();
      return userData;
    } finally {
      setLoading(false);
    }
  }, [startRefreshInterval]);

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await axiosInstance.post(ENDPOINTS.AUTH.LOGOUT, { refreshToken });
    } catch {
      // ignore
    } finally {
      clearAuth();
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    }
  }, [clearAuth]);

  useEffect(() => {
    if (user && localStorage.getItem('refreshToken')) {
      startRefreshInterval();
    }
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [user, startRefreshInterval]);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        clearAuth();
      }
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
