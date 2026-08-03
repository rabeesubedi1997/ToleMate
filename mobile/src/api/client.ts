import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

export const TOKEN_KEY = 'token';
export const USER_KEY = 'user';

type AuthExpiredHandler = () => void;
let authExpiredHandler: AuthExpiredHandler | null = null;

export const onAuthExpired = (fn: AuthExpiredHandler) => {
  authExpiredHandler = fn;
};

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  async config => {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error),
);

// Response interceptor: normalize errors and clear expired sessions
api.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const url = error.config?.url ?? '';
    const isAuthCall = url.includes('/login') || url.includes('/register');
    if (error.response?.status === 401 && !isAuthCall) {
      await AsyncStorage.removeMany([TOKEN_KEY, USER_KEY]);
      authExpiredHandler?.();
    }
    return Promise.reject(error);
  },
);

export default api;
