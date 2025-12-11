/**
 * NextAuth Headers Utility
 * 
 * This utility reads the x-ms-client-principal cookie set by middleware
 * after successful Microsoft login and adds it as HTTP headers to API requests.
 * 
 * The backend expects these headers:
 * - x-ms-client-principal (base64-encoded principal)
 * - x-ms-client-principal-name (user email)
 * - x-ms-client-principal-id (user email/id)
 * - x-ms-client-principal-idp (identity provider: 'aad')
 */

/**
 * Get the x-ms-client-principal cookie value
 */
function getPrincipalCookie(): string | null {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  const principalCookie = cookies.find(c => c.trim().startsWith('x-ms-client-principal='));
  
  if (principalCookie) {
    return decodeURIComponent(principalCookie.split('=')[1]);
  }
  
  return null;
}

/**
 * Get other Azure Easy Auth cookies
 */
function getAzureAuthCookies(): {
  principal: string | null;
  name: string | null;
  id: string | null;
  idp: string | null;
} {
  if (typeof document === 'undefined') {
    return { principal: null, name: null, id: null, idp: null };
  }

  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    if (key && value) {
      acc[key] = decodeURIComponent(value);
    }
    return acc;
  }, {} as Record<string, string>);

  return {
    principal: cookies['x-ms-client-principal'] || null,
    name: cookies['x-ms-client-principal-name'] || null,
    id: cookies['x-ms-client-principal-id'] || null,
    idp: cookies['x-ms-client-principal-idp'] || null,
  };
}

/**
 * Add x-ms-client-principal headers to axios request config
 * 
 * This function reads the cookies set by middleware and adds them as HTTP headers
 * so the backend can read them from request.headers
 * 
 * @param config - Axios request config
 */
export function addNextAuthHeaders(config: { headers?: Record<string, string> }): void {
  if (typeof window === 'undefined' || !config.headers) {
    return;
  }

  // Get Azure Easy Auth cookies set by middleware
  const cookies = getAzureAuthCookies();

  // Add x-ms-client-principal header (base64-encoded principal)
  if (cookies.principal) {
    config.headers['x-ms-client-principal'] = cookies.principal;
  }

  // Add other Azure Easy Auth headers for backend compatibility
  if (cookies.name) {
    config.headers['x-ms-client-principal-name'] = cookies.name;
  }

  if (cookies.id) {
    config.headers['x-ms-client-principal-id'] = cookies.id;
  }

  if (cookies.idp) {
    config.headers['x-ms-client-principal-idp'] = cookies.idp;
  }
}

