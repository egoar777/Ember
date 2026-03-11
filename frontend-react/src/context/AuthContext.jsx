import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAuth, setAuth as setStoredAuth, clearAuth as clearStoredAuth, apiPost } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getAuth().user);

  const onAuthChange = useCallback((u) => setUser(u), []);

  const login = useCallback(async (email, password) => {
    const data = await apiPost('/auth/login', { email, password }, onAuthChange);
    setStoredAuth(data);
    setUser(data.user);
    return data;
  }, [onAuthChange]);

  const register = useCallback(async (email, password, displayName) => {
    const data = await apiPost('/auth/register', { email, password, displayName }, onAuthChange);
    setStoredAuth(data);
    setUser(data.user);
    return data;
  }, [onAuthChange]);

  const logout = useCallback(async () => {
    try { await apiPost('/auth/logout', {}, onAuthChange); } catch { /* ignore */ }
    clearStoredAuth();
    setUser(null);
  }, [onAuthChange]);

  useEffect(() => {
    const { user: u } = getAuth();
    setUser(u);
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    onAuthChange,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
