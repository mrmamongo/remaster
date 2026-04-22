import axios, AxiosError, type AxiosInstance } from 'axios';
import { browser } from '$app/environment';

const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: browser ? '' : process.env.PUBLIC_API_URL || 'http://localhost:8080',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  client.interceptors.request.use((config) => {
    // Add auth token from cookies or localStorage
    if (browser) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      if (error.response?.status === 401) {
        // Clear token and redirect to login
        if (browser) {
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
};

export const api = createApiClient();

// Typed API methods
export const apiGet = <T>(url: string, config?: any) => api.get<T>(url, config);
export const apiPost = <T>(url: string, data?: any, config?: any) => api.post<T>(url, data, config);
export const apiPatch = <T>(url: string, data?: any, config?: any) => api.patch<T>(url, data, config);
export const apiDelete = <T>(url: string, config?: any) => api.delete<T>(url, config);

// SSE for streaming
export const createSSE = (url: string, options?: EventSourceInit) => {
  const baseURL = browser ? '' : process.env.PUBLIC_API_URL || 'http://localhost:8080';
  return new EventSource(`${baseURL}${url}`, options);
};