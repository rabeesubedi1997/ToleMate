import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// For Android emulator, localhost is 10.0.2.2
// For real device, use your machine IP
const BASE_URL = 'http://10.0.2.2:8000/api'; 

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
