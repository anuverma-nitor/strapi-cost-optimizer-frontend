import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ContentType, ContentItem, ApiResponse } from '@/types';
import { isTokenExpired, clearAuthAndRedirect } from './utils';

class ContentAPI {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    // ALL API calls go to your custom backend
    // NO Strapi references in the frontend
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    // API client for content management
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token and check expiry
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        // Check if token is expired before making request
        if (isTokenExpired(token)) {
          console.warn('[ContentAPI] Token expired, clearing auth and redirecting to login');
          clearAuthAndRedirect('Your session has expired. Please log in again.');
          return Promise.reject(new Error('Token expired'));
        }
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor to handle auth errors and preserve error messages
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.warn('[ContentAPI] Received 401 Unauthorized, clearing auth and redirecting');
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

  // Content Type methods - calls to your custom backend
  async getContentTypes(): Promise<ContentType[]> {
    const response: AxiosResponse<ApiResponse<ContentType[]>> = await this.api.get('/api/content-types');
    return response.data.data;
  }

  async getContentType(slug: string): Promise<ContentType> {
    const response: AxiosResponse<ApiResponse<ContentType>> = await this.api.get(`/api/content-types/${slug}`);
    return response.data.data;
  }

  async createContentType(data: {
    name: string;
    displayName: string;
    description?: string;
    kind?: 'collectionType' | 'singleType';
    attributes?: Record<string, any>;
  }): Promise<ContentType> {
    const response: AxiosResponse<ApiResponse<ContentType>> = await this.api.post('/api/content-types', data);
    return response.data.data;
  }

  // Content methods - calls to your custom backend
  async getContentItems(contentType: string, params?: Record<string, any>): Promise<ApiResponse<ContentItem[]>> {
    // Backend will automatically add 'status': 'draft' to include both published and draft content
    const queryParams = params ? new URLSearchParams(params).toString() : '';
    const url = queryParams ? `/api/${contentType}?${queryParams}` : `/api/${contentType}`;
    const response: AxiosResponse<ApiResponse<ContentItem[]>> = await this.api.get(url);
    return response.data;
  }

  async getContentItem(contentType: string, id: string): Promise<ApiResponse<ContentItem>> {
    const response: AxiosResponse<ApiResponse<ContentItem>> = await this.api.get(`/api/${contentType}/${id}`);
    return response.data;
  }

  async createContentItem(contentType: string, data: Record<string, any>): Promise<ApiResponse<ContentItem>> {
    const response: AxiosResponse<ApiResponse<ContentItem>> = await this.api.post(`/api/${contentType}`, data);
    return response.data;
  }

  async updateContentItem(contentType: string, id: string, data: Record<string, any>): Promise<ApiResponse<ContentItem>> {
    const response: AxiosResponse<ApiResponse<ContentItem>> = await this.api.put(`/api/${contentType}/${id}`, data);
    return response.data;
  }

  async deleteContentItem(contentType: string, id: string): Promise<void> {
    await this.api.delete(`/api/${contentType}/${id}`);
  }

  async checkContentOwnership(contentType: string, id: string): Promise<{ isOwner: boolean; creatorId: string | null; currentUserId: string | null; canEdit: boolean }> {
    const response: AxiosResponse<{ isOwner: boolean; creatorId: string | null; currentUserId: string | null; canEdit: boolean }> = await this.api.get(`/api/${contentType}/${id}/ownership`);
    return response.data;
  }
}

export const contentAPI = new ContentAPI();

