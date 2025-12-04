import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { isTokenExpired, clearAuthAndRedirect } from './utils';
import { addEasyAuthHeader } from './easyAuthHeaders';


interface DashboardStats {
  contentTypes: {
    value: number;
    change: string;
    changeType: 'positive' | 'negative' | 'neutral';
  };
  entries: {
    value: number;
    change: string;
    changeType: 'positive' | 'negative' | 'neutral';
  };
  users: {
    value: number;
    change: string;
    changeType: 'positive' | 'negative' | 'neutral';
  };
}

interface RecentActivity {
  id: string;
  type: 'content' | 'user';
  action: string;
  contentType?: string;
  item: string;
  time: string;
}

class DashboardAPI {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    console.log("this.baseURL", this.baseURL)

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
        if (isTokenExpired(token)) {
          console.warn('[DashboardAPI] Token expired, clearing auth and redirecting to login');
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
          console.warn('[DashboardAPI] Received 401 Unauthorized, clearing auth and redirecting');
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

  async getStats(): Promise<DashboardStats> {
    const response: AxiosResponse<DashboardStats> = await this.api.get('/api/dashboard/stats');
    console.log('api/dashboard/stats response..........................', response);
    return response.data;
  }

  async getRecentActivity(limit: number = 10): Promise<RecentActivity[]> {
    const response: AxiosResponse<RecentActivity[]> = await this.api.get('/api/dashboard/recent-activity', {
      params: { limit },
    });
    return response.data;
  }
}

export const dashboardAPI = new DashboardAPI();
export type { DashboardStats, RecentActivity };
