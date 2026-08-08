import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getCurrentUser,
  loginDemoUser,
  loginUser,
  registerUser,
  setAuthToken,
} from "../lib/api.js";
import { AuthContext } from "./auth-context.js";

const TOKEN_KEY = "privacypilot_token";
const USER_KEY = "privacypilot_user";
const DEMO_KEY = "privacypilot_demo";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem(USER_KEY);
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [demo, setDemo] = useState(() => {
    const savedDemo = localStorage.getItem(DEMO_KEY);
    return savedDemo ? JSON.parse(savedDemo) : null;
  });
  const [isLoading, setIsLoading] = useState(Boolean(token));

  useEffect(() => {
    setAuthToken(token);

    if (!token) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    getCurrentUser()
      .then(({ user: currentUser }) => {
        if (!mounted) return;
        setUser(currentUser);
        localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
      })
      .catch(() => {
        if (!mounted) return;
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(DEMO_KEY);
        setAuthToken(null);
        setDemo(null);
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  const persistSession = useCallback((authData) => {
    localStorage.setItem(TOKEN_KEY, authData.token);
    localStorage.setItem(USER_KEY, JSON.stringify(authData.user));
    if (authData.demo) {
      localStorage.setItem(DEMO_KEY, JSON.stringify(authData.demo));
      setDemo(authData.demo);
    } else {
      localStorage.removeItem(DEMO_KEY);
      setDemo(null);
    }
    setAuthToken(authData.token);
    setToken(authData.token);
    setUser(authData.user);
  }, []);

  const login = useCallback(async (payload) => {
    const authData = await loginUser(payload);
    persistSession(authData);
    return authData.user;
  }, [persistSession]);

  const register = useCallback(async (payload) => {
    const authData = await registerUser(payload);
    persistSession(authData);
    return authData.user;
  }, [persistSession]);

  const loginDemo = useCallback(async (role) => {
    const authData = await loginDemoUser(role);
    persistSession(authData);
    return authData;
  }, [persistSession]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(DEMO_KEY);
    setAuthToken(null);
    setDemo(null);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(token && user),
      isLoading,
      demo,
      login,
      loginDemo,
      logout,
      register,
      token,
      user,
    }),
    [demo, isLoading, login, loginDemo, logout, register, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
