import { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthContext } from './authContext';
import { authApi } from '../services/api';
import { loadSession, saveSession, clearSession, onUnauthorized } from '../services/session';
import { clearResources } from '../hooks/useResource';

/**
 * AuthProvider — local email/password accounts.
 *
 * The session ({ token, user }) is restored from localStorage immediately so
 * the app renders without a loading flash, then re-validated with the server
 * in the background. Any 401 from the API signs the user out.
 */
export default function AuthProvider({ children }) {
  const [session, setSession] = useState(() => loadSession());
  const [notice,  setNotice]  = useState(null);   // e.g. "session expired"

  const logout = useCallback((message = null) => {
    clearSession();
    clearResources();          // never show the previous account's cached data
    setSession(null);
    setNotice(message);
  }, []);

  const start = useCallback(({ token, user }) => {
    clearResources();
    saveSession({ token, user });
    setSession({ token, user });
    setNotice(null);
    return user;
  }, []);

  const login    = useCallback(async (email, password) => start(await authApi.login(email, password)), [start]);
  const register = useCallback(async (name, email, password) => start(await authApi.register(name, email, password)), [start]);

  const updateUser = useCallback((user) => {
    setSession(prev => {
      if (!prev) return prev;
      const next = { ...prev, user };
      saveSession(next);
      return next;
    });
  }, []);

  // Re-validate a restored session (picks up name changes, catches revoked accounts)
  const token = session?.token;
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const user = await authApi.me();
        if (!cancelled) updateUser(user);
      } catch { /* 401 is handled by onUnauthorized; offline keeps the cached session */ }
    })();
    return () => { cancelled = true; };
  }, [token, updateUser]);

  useEffect(() => onUnauthorized(() => logout('Your session has ended. Please sign in again.')), [logout]);

  const value = useMemo(() => ({
    user:   session?.user ?? null,
    status: session?.token ? 'authenticated' : 'anonymous',
    notice,
    login,
    register,
    logout,
    updateUser,
  }), [session, notice, login, register, logout, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
