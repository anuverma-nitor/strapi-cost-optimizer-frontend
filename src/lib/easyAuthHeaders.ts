/**
 * Shared Easy Auth Headers Utility
 * 
 * Provides role-based x-ms-client-principal headers for local development
 * and forwards Azure Easy Auth principal for production
 */

// Role-based Easy Auth principal tokens (base64 encoded) - for localhost only
const MX_CLIENT_PRICIPAL_HEADER_ADMIN = `ewogICJhdXRoX3R5cCI6ICJhYWQiLAogICJuYW1lX3R5cCI6ICJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1lIiwKICAicm9sZV90eXAiOiAiaHR0cDovL3NjaGVtYXMubWljcm9zb2Z0LmNvbS93cy8yMDA4LzA2L2lkZW50aXR5L2NsYWltcy9yb2xlIiwKICAiY2xhaW1zIjogWwogICAgewogICAgICAidHlwIjogImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL2VtYWlsYWRkcmVzcyIsCiAgICAgICJ2YWwiOiAiamVubnlhZG1pbkBnbWFpbC5jb20iCiAgICB9LAogICAgewogICAgICAidHlwIjogImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWUiLAogICAgICAidmFsIjogIkplbm55IFBvdHRlciIKICAgIH0sCiAgICB7CiAgICAgICJ0eXAiOiAiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZWlkZW50aWZpZXIiLAogICAgICAidmFsIjogImplbm55YWRtaW5AZ21haWwuY29tIgogICAgfSwKICAgIHsKICAgICAgInR5cCI6ICJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiLAogICAgICAidmFsIjogIkFkbWluLEVkaXRvciIKICAgIH0KICBdCn0K`;
const MX_CLIENT_PRICIPAL_HEADER_VIEWER = `ewogICJhdXRoX3R5cCI6ICJhYWQiLAogICJuYW1lX3R5cCI6ICJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1lIiwKICAicm9sZV90eXAiOiAiaHR0cDovL3NjaGVtYXMubWljcm9zb2Z0LmNvbS93cy8yMDA4LzA2L2lkZW50aXR5L2NsYWltcy9yb2xlIiwKICAiY2xhaW1zIjogWwogICAgewogICAgICAidHlwIjogImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL2VtYWlsYWRkcmVzcyIsCiAgICAgICJ2YWwiOiAiYW5uYS5sb3BlekBnbWFpbC5jb20iCiAgICB9LAogICAgewogICAgICAidHlwIjogImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWUiLAogICAgICAidmFsIjogIkFubmEgTG9wZXoiCiAgICB9LAogICAgewogICAgICAidHlwIjogImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWVpZGVudGlmaWVyIiwKICAgICAgInZhbCI6ICJhbm5hLmxvcGV6QGdtYWlsLmNvbSIKICAgIH0sCiAgICB7CiAgICAgICJ0eXAiOiAiaHR0cDovL3NjaGVtYXMubWljcm9zb2Z0LmNvbS93cy8yMDA4LzA2L2lkZW50aXR5L2NsYWltcy9yb2xlIiwKICAgICAgInZhbCI6ICJWaWV3ZXIiCiAgICB9CiAgXQp9Cg==`;
const MX_CLIENT_PRICIPAL_HEADER_EDITOR = `ewogICJhdXRoX3R5cCI6ICJhYWQiLAogICJuYW1lX3R5cCI6ICJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1lIiwKICAicm9sZV90eXAiOiAiaHR0cDovL3NjaGVtYXMubWljcm9zb2Z0LmNvbS93cy8yMDA4LzA2L2lkZW50aXR5L2NsYWltcy9yb2xlIiwKICAiY2xhaW1zIjogWwogICAgewogICAgICAidHlwIjogImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL2VtYWlsYWRkcmVzcyIsCiAgICAgICJ2YWwiOiAiamFtZXNib25kQGdtYWlsLmNvbSIKICAgIH0sCiAgICB7CiAgICAgICJ0eXAiOiAiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZSIsCiAgICAgICJ2YWwiOiAiSmFtZXMgQm9uZCIKICAgIH0sCiAgICB7CiAgICAgICJ0eXAiOiAiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZWlkZW50aWZpZXIiLAogICAgICAidmFsIjogImphbWVzYm9uZEBnbWFpbC5jb20iCiAgICB9LAogICAgewogICAgICAidHlwIjogImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSIsCiAgICAgICJ2YWwiOiAiRWRpdG9yIgogICAgfQogIF0KfQ==`;

// Cache for Azure Easy Auth principal (production)
let cachedAzurePrincipal: string | null = null;
let principalFetchPromise: Promise<string | null> | null = null;

/**
 * Check if we're running on localhost
 */
function isLocalhost(): boolean {
    if (typeof window === 'undefined') return false;
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('localhost:');
}

/**
 * Fetch Azure Easy Auth principal from /.auth/me endpoint
 * This is needed because client-side requests don't automatically get Easy Auth headers
 */
async function fetchAzurePrincipal(): Promise<string | null> {
    if (principalFetchPromise) {
        return principalFetchPromise;
    }

    principalFetchPromise = (async () => {
        try {
            const response = await fetch('/.auth/me', {
                credentials: 'include', // Include cookies for authentication
            });

            if (!response.ok) {
                console.warn('[EasyAuth] Failed to fetch principal from /.auth/me:', response.status);
                return null;
            }

            const data = await response.json();

            // Azure Easy Auth returns { clientPrincipal: {...} }
            if (data?.clientPrincipal) {
                // Encode the principal as base64 (same format as Azure injects)
                const principalJson = JSON.stringify(data.clientPrincipal);
                const base64Principal = btoa(principalJson);
                cachedAzurePrincipal = base64Principal;
                return base64Principal;
            }

            return null;
        } catch (error) {
            console.warn('[EasyAuth] Error fetching principal:', error);
            return null;
        } finally {
            principalFetchPromise = null;
        }
    })();

    return principalFetchPromise;
}

/**
 * Get the appropriate x-ms-client-principal header based on user role (localhost)
 * or fetch from Azure Easy Auth (production)
 * 
 * @returns The base64-encoded principal header or null
 */
export function getEasyAuthHeader(): string | null {
    // Localhost: Use mock headers based on localStorage user role
    if (isLocalhost()) {
        try {
            const userStr = localStorage.getItem('auth_user');
            if (!userStr) {
                return MX_CLIENT_PRICIPAL_HEADER_VIEWER; // Default to viewer
            }

            const user = JSON.parse(userStr);
            const role = user?.role?.toLowerCase();

            switch (role) {
                case 'admin':
                    return MX_CLIENT_PRICIPAL_HEADER_ADMIN;
                case 'viewer':
                    return MX_CLIENT_PRICIPAL_HEADER_VIEWER;
                case 'editor':
                    return MX_CLIENT_PRICIPAL_HEADER_EDITOR;
                case 'author':
                    return MX_CLIENT_PRICIPAL_HEADER_ADMIN; // Author uses admin token
                default:
                    return MX_CLIENT_PRICIPAL_HEADER_VIEWER; // Default to viewer
            }
        } catch {
            return MX_CLIENT_PRICIPAL_HEADER_VIEWER; // Default to viewer on error
        }
    }

    // Production: Return cached principal or null (will be fetched async)
    return cachedAzurePrincipal;
}

/**
 * Add x-ms-client-principal header to axios request config
 * For localhost: Uses mock headers
 * For production: Fetches from Azure Easy Auth and forwards it
 * 
 * @param config - Axios request config
 */
export async function addEasyAuthHeader(config: { headers?: Record<string, string> }): Promise<void> {
    if (typeof window === 'undefined' || !config.headers) {
        return;
    }

    let header: string | null = null;

    if (isLocalhost()) {
        // Localhost: Use mock headers
        header = getEasyAuthHeader();
    } else {
        // Production: Fetch from Azure Easy Auth
        if (!cachedAzurePrincipal) {
            header = await fetchAzurePrincipal();
        } else {
            header = cachedAzurePrincipal;
        }
    }

    if (header) {
        config.headers['x-ms-client-principal'] = header;
    }
}

/**
 * Clear cached Azure principal (useful after logout)
 */
export function clearCachedPrincipal(): void {
    cachedAzurePrincipal = null;
    principalFetchPromise = null;
}

