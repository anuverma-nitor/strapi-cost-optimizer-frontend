/**
 * Type definitions for NextAuth.js
 * 
 * Extends the default NextAuth session and JWT types to include
 * the X-MS-CLIENT-PRINCIPAL (base64-encoded email) and other Azure Easy Auth fields.
 */

import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    principal?: string; // Base64-encoded X-MS-CLIENT-PRINCIPAL value
    email?: string;
    name?: string;
    backendJwt?: string;
    backendUser?: {
      id: number;
      email: string;
      role: string;
      // add other user fields
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    principal?: string; // Base64-encoded X-MS-CLIENT-PRINCIPAL value
    email?: string;
    name?: string;
  }
}
