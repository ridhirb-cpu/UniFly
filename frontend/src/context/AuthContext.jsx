import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);
const PRIMARY_TOKEN_KEY = "unifly-token";
const LEGACY_TOKEN_KEY = "campusride-token";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(PRIMARY_TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const profile = await api.get("/auth/me", token);
        setUser(profile);
      } catch {
        localStorage.removeItem(PRIMARY_TOKEN_KEY);
        localStorage.removeItem(LEGACY_TOKEN_KEY);
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [token]);

  const login = (nextToken, nextUser) => {
    localStorage.setItem(PRIMARY_TOKEN_KEY, nextToken);
    localStorage.setItem(LEGACY_TOKEN_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
  };

  const logout = () => {
    localStorage.removeItem(PRIMARY_TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
