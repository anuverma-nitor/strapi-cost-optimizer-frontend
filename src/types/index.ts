export interface User {
  id: string;
  email: string;
  username: string;
  firstname?: string;
  lastname?: string;
  role?: string; // 'admin', 'editor', 'author', 'viewer'
  blocked: boolean;
  confirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  jwt: string;
  user: User;
}

export interface ContentType {
  id: string;
  name: string;
  singularName?: string;
  pluralName?: string;
  displayName: string;
  description?: string;
  kind?: 'collectionType' | 'singleType';
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ContentItem {
  id: number;
  documentId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  // Dynamic fields from content type schema (e.g., name, description, likes, etc.)
  [key: string]: unknown;
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface LoginCredentials {
  identifier: string;
  password: string;
}

import { UserRole } from './roles';

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
  firstname?: string;
  lastname?: string;
  role?: UserRole;
}

