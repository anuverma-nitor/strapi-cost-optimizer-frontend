'use client';

import LoginForm from '@/components/auth/LoginForm';
import { useEffect } from 'react';

export default function LoginPage() {

  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return <LoginForm />;
  }

  useEffect(() => {
    // Redirect to Azure App Service Easy Auth login
    // Easy Auth is configured in Azure Portal, not via config file
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `/.auth/login/aad?post_login_redirect_url=${encodeURIComponent(redirectUrl)}`;
  }, []);


  // Show loading message while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to Azure AD login...</p>
      </div>
    </div>
  );

  // return <LoginForm />;
}