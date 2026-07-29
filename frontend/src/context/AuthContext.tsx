import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../utils/config';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'customer' | 'vendor' | 'admin' | 'super_admin';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    window.dispatchEvent(new Event('storage'));
  }, []);

  const logout = useCallback(async () => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      try {
        await fetch(`${API_BASE}/api/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${storedToken}`, Accept: 'application/json' },
        });
      } catch {
        // Proceed with local logout even if server call fails
      }
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    window.dispatchEvent(new Event('storage'));
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token && !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
