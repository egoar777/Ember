import { AuthContext } from './useAuth';
import { useState, useCallback } from 'react';
import { getAuth, setAuth as setStoredAuth, clearAuth as clearStoredAuth, apiPost } from '../api/client';


export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getAuth().user);

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

  const loginWithGoogle = useCallback(async (code, redirectUri) => {
    const data = await apiPost('/auth/google', { code, redirectUri }, onAuthChange);
    setStoredAuth(data);
    setUser(data.user);
    return data;
  }, [onAuthChange]);

  const logout = useCallback(async () => {
    try { await apiPost('/auth/logout', {}, onAuthChange); } catch { /* ignore */ }
    clearStoredAuth();
    setUser(null);
  }, [onAuthChange]);

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    register,
    loginWithGoogle,
    logout,
    onAuthChange,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
