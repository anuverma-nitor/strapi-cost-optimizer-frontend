/**
 * NextAuth.js API Route Handler
 * 
 * This route handles all NextAuth.js authentication requests including:
 * - Sign in with Microsoft Entra ID
 * - Sign out
 * - Session management
 * - Callback handling
 * 
 * After successful login, we set the X-MS-CLIENT-PRINCIPAL cookie with base64-encoded email.
 */

import { handlers } from "@/auth";

// Export GET and POST handlers for NextAuth
export const { GET, POST } = handlers;
