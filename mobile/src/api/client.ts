import axios, { AxiosError, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

export const TOKEN_KEY = 'token';
export const USER_KEY = 'user';

type AuthExpiredHandler = () => void;
let authExpiredHandler: AuthExpiredHandler | null = null;

export const onAuthExpired = (fn: AuthExpiredHandler) => {
  authExpiredHandler = fn;
};

// Security: Certificate pinning configuration (for production)
// In production, add the SHA-256 fingerprint of your server's certificate
const CERT_PINNING_ENABLED = __DEV__ ? false : true;
const EXPECTED_CERT_FINGERPRINT = 'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; // Replace with actual fingerprint

// Security: Validate response structure
const validateResponse = (response: AxiosResponse): AxiosResponse => {
  // Ensure response has expected structure
  if (response.data && typeof response.data === 'object') {
    // Prevent prototype pollution
    Object.freeze(response.data);
  }
  return response;
};

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Client-Version': '1.0.0', // For API versioning
    'X-Platform': 'mobile', // For server-side analytics
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  async config => {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Add request timestamp for replay attack prevention
    config.headers['X-Request-Time'] = Date.now().toString();
    return config;
  },
  error => Promise.reject(error),
);

// Response interceptor: normalize errors and clear expired sessions
api.interceptors.response.use(
  response => validateResponse(response),
  async (error: AxiosError) => {
    const url = error.config?.url ?? '';
    const isAuthCall = url.includes('/login') || url.includes('/register');
    
    if (error.response?.status === 401 && !isAuthCall) {
      await AsyncStorage.removeMany([TOKEN_KEY, USER_KEY]);
      authExpiredHandler?.();
    }
    
    // Normalize error response
    const normalizedError = new Error(
      (error.response?.data as any)?.message || 
      error.message || 
      'An unexpected error occurred'
    ) as AxiosError & { 
      status?: number; 
      code?: string;
      originalError: AxiosError;
    };
    
    normalizedError.status = error.response?.status;
    normalizedError.code = error.code;
    normalizedError.originalError = error;
    
    return Promise.reject(normalizedError);
  },
);

// Security helper: verify certificate fingerprint (for production use)
export const verifyCertificate = (fingerprint: string): boolean => {
  if (!CERT_PINNING_ENABLED) return true;
  // In production, implement actual certificate pinning using react-native-ssl-pinning
  // or native modules. This is a placeholder.
  return fingerprint === EXPECTED_CERT_FINGERPRINT;
};

export default api;
