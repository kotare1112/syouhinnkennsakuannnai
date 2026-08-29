import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('adminUser');
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (user) localStorage.setItem('adminUser', JSON.stringify(user));
    else localStorage.removeItem('adminUser');
  }, [user]);

  async function login(email, password) {
    const { token, user: u } = await api.login(email, password);
    localStorage.setItem('adminToken', token);
    setUser(u);
  }

  async function register(payload) {
    const { token, user: u } = await api.register(payload);
    localStorage.setItem('adminToken', token);
    setUser(u);
  }

  async function logout() {
    try {
      await api.logout();
    } finally {
      localStorage.removeItem('adminToken');
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
