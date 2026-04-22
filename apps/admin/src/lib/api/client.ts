// ============================================================================
// Admin API Client
// ============================================================================

import axios, { AxiosError, type AxiosInstance } from 'axios';
import { browser } from '$app/environment';
import { writable, get } from 'svelte/store';

// ============================================================================
// Types
// ============================================================================

export interface IApiResponse<T> {
  data: T;
  message?: string;
}

export interface IPaginationParams {
  page: number;
  limit: number;
}

export interface IPaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Mock mode store
export const isMockMode = writable(true);

// ============================================================================
// API Client Factory
// ============================================================================

const createApiClient = (baseURL: string): AxiosInstance => {
  const client = axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  client.interceptors.request.use((config) => {
    if (browser) {
      const token = localStorage.getItem('admin_token');
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
        if (browser) {
          localStorage.removeItem('admin_token');
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
};

// ============================================================================
// Mock Adapters
// ============================================================================

const mockDelay = 200;

const mockResponse = async <T>(data: T): Promise<T> => {
  await new Promise(resolve => setTimeout(resolve, mockDelay));
  return data;
};

// ============================================================================
// API Clients
// ============================================================================

// Internal API (business logic)
export const apiClient = createApiClient(
  browser ? '' : process.env.PUBLIC_API_URL || 'http://localhost:8080'
);

// Victoria Metrics
export const metricsClient = createApiClient(
  browser ? '/metrics' : 'http://localhost:8428'
);

// Victoria Logs
export const logsClient = createApiClient(
  browser ? '/logs' : 'http://localhost:9428'
);

// Victoria Traces
export const tracesClient = createApiClient(
  browser ? '/traces' : 'http://localhost:9411'
);

// ============================================================================
// Typed Methods
// ============================================================================

export const api = {
  get: <T>(url: string, config?: any) => apiClient.get<T>(url, config),
  post: <T>(url: string, data?: any, config?: any) => apiClient.post<T>(url, data, config),
  patch: <T>(url: string, data?: any, config?: any) => apiClient.patch<T>(url, data, config),
  put: <T>(url: string, data?: any, config?: any) => apiClient.put<T>(url, data, config),
  delete: <T>(url: string, config?: any) => apiClient.delete<T>(url, config)
};

export const metrics = {
  get: <T>(query: string) => metricsClient.get<T>(`/api/v1/query?${query}`),
  getRange: <T>(query: string, start: string, end: string) => 
    metricsClient.get<T>(`/api/v1/query_range?query=${query}&start=${start}&end=${end}`)
};

export const logs = {
  query: <T>(query: string, limit?: number) => 
    logsClient.get<T>(`/select/logs/query?query=${query}&limit=${limit || 100}`)
};

export const traces = {
  getSpans: <T>(service?: string, limit?: number) => 
    tracesClient.get<T>(`/api/traces?service=${service || ''}&limit=${limit || 100}`)
};