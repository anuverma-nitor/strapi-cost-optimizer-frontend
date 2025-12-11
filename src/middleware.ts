/**
 * Next.js Middleware
 * 
 * This middleware sets the X-MS-CLIENT-PRINCIPAL cookie with base64-encoded email
 * after successful Microsoft login via NextAuth.
 * 
 * The cookie is set in the same format as Azure Easy Auth for backend compatibility.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';

export async function middleware(request: NextRequest) {
  // Get the session
  const session = await auth();

  // Create response
  const response = NextResponse.next();

  // If user is authenticated and has principal, set the cookie
  if (session?.principal) {
    // Set X-MS-CLIENT-PRINCIPAL cookie with base64-encoded principal
    // This matches the format that Azure Easy Auth uses
    response.cookies.set('x-ms-client-principal', session.principal, {
      httpOnly: false, // Allow client-side access if needed
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Also set other Azure Easy Auth headers as cookies for compatibility
    if (session.email) {
      response.cookies.set('x-ms-client-principal-name', session.email, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    if (session.email) {
      response.cookies.set('x-ms-client-principal-id', session.email, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    response.cookies.set('x-ms-client-principal-idp', 'aad', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
  } else {
    // If not authenticated, remove the cookies
    response.cookies.delete('x-ms-client-principal');
    response.cookies.delete('x-ms-client-principal-name');
    response.cookies.delete('x-ms-client-principal-id');
    response.cookies.delete('x-ms-client-principal-idp');
  }

  return response;
}

// Configure which routes should use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};

