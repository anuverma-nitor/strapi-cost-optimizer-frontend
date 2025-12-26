'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthResponse } from '@/types';
import { customAuthAPI } from '@/lib/customAuthApi';
import { UserRole } from '@/types/roles';
import { useSession } from 'next-auth/react';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (identifier: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, firstname?: string, lastname?: string, role?: UserRole) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔥 Get NextAuth session
  const { data: session, status } = useSession();

  useEffect(() => {
    // 🔥 Check NextAuth session FIRST (Microsoft login)
    if (status === 'loading') {
      return; // Still loading session
    }

    if (session?.backendJwt && session?.backendUser) {
      // User logged in via Microsoft
      setToken(session.backendJwt);
      setUser(session.backendUser as unknown as User);
      setLoading(false);
      return;
    }

    // Check for existing auth on mount
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, [session, status]);

  const login = async (identifier: string, password: string) => {
    try {
      const response: AuthResponse = await customAuthAPI.login({ identifier, password });
      setUser(response.user);
      setToken(response.jwt);
      localStorage.setItem('auth_token', response.jwt);
      localStorage.setItem('auth_user', JSON.stringify(response.user));
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (username: string, email: string, password: string, firstname?: string, lastname?: string, role?: UserRole) => {
    try {
      const response: AuthResponse = await customAuthAPI.register({
        username,
        email,
        password,
        firstname,
        lastname,
        role: role || UserRole.VIEWER,
      });
      setUser(response.user);
      setToken(response.jwt);
      localStorage.setItem('auth_token', response.jwt);
      localStorage.setItem('auth_user', JSON.stringify(response.user));
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    customAuthAPI.logout();
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
