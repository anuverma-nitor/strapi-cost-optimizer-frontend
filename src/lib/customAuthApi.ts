import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { User, ApiResponse } from '@/types';
import { AuthResponse, LoginCredentials, RegisterCredentials } from '@/types';
import { isTokenExpired, clearAuthAndRedirect } from './utils';
import { addEasyAuthHeader, clearCachedPrincipal } from './easyAuthHeaders';

class CustomAuthAPI {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token and check expiry
    this.api.interceptors.request.use(async (config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        // Check if token is expired before making request
        if (isTokenExpired(token)) {
          console.warn('[AuthAPI] Token expired, clearing auth and redirecting to login');
          clearAuthAndRedirect('Your session has expired. Please log in again.');
          return Promise.reject(new Error('Token expired'));
        }
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Add x-ms-client-principal header for Easy Auth
      await addEasyAuthHeader(config);

      return config;
    });

    // Add response interceptor to handle auth errors and preserve error messages
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.warn('[AuthAPI] Received 401 Unauthorized, clearing auth and redirecting');
          clearAuthAndRedirect('Your session has expired. Please log in again.');
        }
        // Preserve error response with message and status code
        // NestJS returns errors in format: { statusCode: number, message: string }
        if (error.response?.data) {
          const errorData = error.response.data;
          // Extract message from NestJS error format or Strapi error format
          if (errorData.message) {
            error.message = Array.isArray(errorData.message)
              ? errorData.message.join(', ')
              : errorData.message;
          }
          // Preserve status code
          error.statusCode = error.response.status;
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication methods - calls to your custom backend
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.api.post('/api/auth/login', credentials);
    return response.data;
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.api.post('/api/auth/register', credentials);
    return response.data;
  }

  async logout(): Promise<void> {
    // Clear local storage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');

    // Clear cached Azure Easy Auth principal
    clearCachedPrincipal();

    // Redirect to Azure App Service Easy Auth logout
    // This will clear the Easy Auth session and redirect
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      window.location.href = '/login';
    } else {
      window.location.href = '/.auth/logout';
    }
  }

  async getCurrentUser(): Promise<User> {
    const response: AxiosResponse<AuthResponse> = await this.api.get('/api/auth/me');
    return response.data.user;
  }

  async getAllUsers(): Promise<ApiResponse<User[]>> {
    const response: AxiosResponse<ApiResponse<User[]>> = await this.api.get('/api/auth/users');
    return response.data;
  }
}

export const customAuthAPI = new CustomAuthAPI();