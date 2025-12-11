'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle Microsoft login via NextAuth
  const handleMicrosoftLogin = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Sign in with Microsoft Entra ID provider
      // After successful login, NextAuth will set the X-MS-CLIENT-PRINCIPAL cookie
      // via middleware with base64-encoded email
      await signIn('microsoft-entra-id', {
        callbackUrl: '/dashboard',
        redirect: true,
      });
    } catch (err) {
      console.error('Microsoft login error:', err);
      setError('Failed to sign in with Microsoft. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
          {/* Header with Gradient */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-8 text-center">
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-white bg-opacity-20 backdrop-blur-sm border-2 border-white border-opacity-40 shadow-lg">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-bold text-white">
              Welcome Back
            </h2>
            <p className="mt-2 text-sm text-indigo-100">
              Sign in to your account to continue
            </p>
          </div>

          {/* Form Section */}
          <div className="px-8 py-8">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded-md mb-4">
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Microsoft Login Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleMicrosoftLogin}
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 px-4 border-2 border-gray-300 rounded-lg shadow-sm text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="0" y="0" width="11" height="11" fill="#F25022"/>
                      <rect x="12" y="0" width="11" height="11" fill="#7FBA00"/>
                      <rect x="0" y="12" width="11" height="11" fill="#00A4EF"/>
                      <rect x="12" y="12" width="11" height="11" fill="#FFB900"/>
                    </svg>
                    Sign in with Microsoft
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}