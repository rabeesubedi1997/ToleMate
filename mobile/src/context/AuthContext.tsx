import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { TOKEN_KEY, USER_KEY, onAuthExpired } from '../api/client';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  avatar?: string | null;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  isVendor: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: Record<string, unknown>) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      try {
        const stored = await AsyncStorage.getMany([TOKEN_KEY, USER_KEY]);
        if (stored[TOKEN_KEY]) {
          setToken(stored[TOKEN_KEY]);
        }
        if (stored[USER_KEY]) {
          setUser(JSON.parse(stored[USER_KEY]));
        }
      } catch (e) {
        console.warn('Auth restore failed', e);
      } finally {
        setLoading(false);
      }
    };
    restore();

    const unregister = onAuthExpired(() => {
      setToken(null);
      setUser(null);
    });
    return unregister;
  }, []);

  const persist = async (newToken: string, newUser: User) => {
    await AsyncStorage.setMany({
      [TOKEN_KEY]: newToken,
      [USER_KEY]: JSON.stringify(newUser),
    });
    setToken(newToken);
    setUser(newUser);
  };

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/login', { email, password });
    const newToken = data.access_token ?? data.token;
    await persist(newToken, data.user);
    return data.user as User;
  }, []);

  const register = useCallback(async (payload: Record<string, unknown>) => {
    const { data } = await api.post('/register', payload);
    const newToken = data.access_token ?? data.token;
    await persist(newToken, data.user);
    return data.user as User;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/logout');
    } catch {
      // ignore — token is cleared regardless
    }
    await AsyncStorage.removeMany([TOKEN_KEY, USER_KEY]);
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((next: User) => {
    setUser(next);
    AsyncStorage.setItem(USER_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const value: AuthContextValue = {
    user,
    token,
    loading,
    isVendor: user?.role === 'vendor',
    isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
    isSuperAdmin: user?.role === 'super_admin',
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
