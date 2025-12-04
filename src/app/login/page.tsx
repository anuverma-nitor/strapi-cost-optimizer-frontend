'use client';

import LoginForm from '@/components/auth/LoginForm';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const [isLocalhost, setIsLocalhost] = useState(false);

  useEffect(() => {
    // Check if we're on localhost
    if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';
      setIsLocalhost(isLocal);

      // If not localhost, redirect to Azure App Service Easy Auth login
      if (!isLocal) {
        const redirectUrl = window.location.origin + '/dashboard';
        window.location.href = `/.auth/login/aad?post_login_redirect_url=${encodeURIComponent(redirectUrl)}`;
      }
    }
  }, []);

  // Show LoginForm on localhost
  if (isLocalhost) {
    return <LoginForm />;
  }

  // Show loading message while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to Azure AD login...</p>
      </div>
    </div>
  );
}