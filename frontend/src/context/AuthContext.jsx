import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("aqg_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch(() => localStorage.removeItem("aqg_token"))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const data = await api.login({ email, password });
    localStorage.setItem("aqg_token", data.access_token);
    setUser(data.user);
  }

  async function register(payload) {
    const data = await api.register(payload);
    localStorage.setItem("aqg_token", data.access_token);
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem("aqg_token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
