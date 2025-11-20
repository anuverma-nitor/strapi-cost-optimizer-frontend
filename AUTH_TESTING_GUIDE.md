# Azure Static Web Apps Easy Auth - Enable/Disable & Testing Guide

## 🔐 How to Enable/Disable Authentication

### **Enable Authentication** (Current State)
Authentication is **ENABLED** when the `auth` section exists in `staticwebapp.config.json`:

```json
{
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": { ... }
    }
  }
}
```

### **Disable Authentication**
To disable authentication, you have two options:

#### Option 1: Remove the entire `auth` section
```json
{
  "routes": [ ... ],
  "navigationFallback": { ... }
  // No "auth" section = authentication disabled
}
```

#### Option 2: Comment out (not valid JSON, but useful for testing)
Remove or rename the `auth` property temporarily.

---

## 🧪 How to Test Easy Auth

### **1. Test Authentication Endpoints**

#### **Login Endpoint**
```
GET https://your-app.azurestaticapps.net/.auth/login/aad
```
- Redirects to Microsoft login
- After successful login, redirects back to your app
- Sets authentication cookies

#### **Logout Endpoint**
```
GET https://your-app.azurestaticapps.net/.auth/logout
```
- Clears authentication session
- Redirects to post-logout URL (default: `/`)

#### **Get Current User Info**
```
GET https://your-app.azurestaticapps.net/.auth/me
```
- Returns JSON with current user information
- Only works when authenticated
- Example response:
```json
{
  "clientPrincipal": {
    "identityProvider": "aad",
    "userId": "abc123...",
    "userDetails": "user@example.com",
    "userRoles": ["authenticated", "anonymous"]
  }
}
```

### **2. Test Identity Headers in Backend**

The following headers are automatically injected for authenticated requests:

- `X-MS-CLIENT-PRINCIPAL` - Base64-encoded JSON with full user info
- `X-MS-CLIENT-PRINCIPAL-NAME` - User's display name
- `X-MS-CLIENT-PRINCIPAL-ID` - User's unique ID
- `X-MS-CLIENT-PRINCIPAL-IDP` - Identity provider (e.g., "aad")

#### **Create a Test API Endpoint**

Create a test endpoint in your backend to verify headers:

```typescript
// Example: /api/test-auth.ts (Next.js API route)
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const principalHeader = req.headers['x-ms-client-principal'];
  const principalName = req.headers['x-ms-client-principal-name'];
  const principalId = req.headers['x-ms-client-principal-id'];
  const principalIdp = req.headers['x-ms-client-principal-idp'];

  if (principalHeader) {
    // Decode base64 principal
    const principalJson = Buffer.from(principalHeader, 'base64').toString('utf-8');
    const principal = JSON.parse(principalJson);

    return res.status(200).json({
      authenticated: true,
      principal: principal,
      headers: {
        name: principalName,
        id: principalId,
        idp: principalIdp
      },
      allHeaders: Object.keys(req.headers)
        .filter(key => key.toLowerCase().startsWith('x-ms-client-principal'))
        .reduce((acc, key) => {
          acc[key] = req.headers[key];
          return acc;
        }, {} as Record<string, string | string[] | undefined>)
    });
  }

  return res.status(200).json({
    authenticated: false,
    message: 'No authentication headers found. User is not authenticated.',
    allHeaders: req.headers
  });
}
```

### **3. Test from Browser Console**

After deploying, test in browser console:

```javascript
// Test login redirect
window.location.href = '/.auth/login/aad';

// Test get current user
fetch('/.auth/me')
  .then(res => res.json())
  .then(data => console.log('Current user:', data));

// Test logout
window.location.href = '/.auth/logout';

// Test API endpoint with auth headers
fetch('/api/test-auth')
  .then(res => res.json())
  .then(data => console.log('Auth test:', data));
```

### **4. Test Route Protection**

#### **Protected Route (Requires Auth)**
```json
{
  "route": "/api/protected/*",
  "allowedRoles": ["authenticated"]
}
```
- Unauthenticated requests → 401 → Redirect to `/login`

#### **Public Route (No Auth Required)**
```json
{
  "route": "/api/public/*",
  "allowedRoles": ["authenticated", "anonymous"]
}
```
- Works for both authenticated and unauthenticated users

### **5. Local Testing**

⚠️ **Important**: Easy Auth only works in Azure Static Web Apps. For local testing:

1. **Use Azure Static Web Apps CLI**:
```bash
npm install -g @azure/static-web-apps-cli
swa start http://localhost:3000 --api-location http://localhost:3001
```

2. **Mock headers locally** (for development):
   - Use environment variables to simulate auth headers
   - Or use a local proxy that injects test headers

---

## 📋 Testing Checklist

- [ ] Deploy to Azure Static Web Apps
- [ ] Configure `AZURE_CLIENT_ID` and `AZURE_CLIENT_SECRET` in Application Settings
- [ ] Test login: Navigate to `/.auth/login/aad`
- [ ] Test user info: Call `/.auth/me` endpoint
- [ ] Test protected route: Access `/api/protected/*` (should require auth)
- [ ] Test public route: Access `/api/public/*` (should work without auth)
- [ ] Test logout: Navigate to `/.auth/logout`
- [ ] Verify headers in backend: Check `X-MS-CLIENT-PRINCIPAL` headers
- [ ] Test 401 redirect: Access protected route while logged out

---

## 🔧 Troubleshooting

### **Auth not working?**
1. Check Application Settings in Azure Portal:
   - `AZURE_CLIENT_ID` is set correctly
   - `AZURE_CLIENT_SECRET` is set correctly
2. Verify App Registration in Entra ID:
   - Redirect URI is configured
   - API permissions are set
3. Check browser console for errors
4. Verify tenant ID in `openIdIssuer` URL

### **Headers not appearing?**
- Headers only appear for authenticated requests
- Headers only work in Azure Static Web Apps (not localhost)
- Ensure route allows `["authenticated"]` or `["authenticated", "anonymous"]`

### **401 redirects not working?**
- Check `responseOverrides` section in config
- Verify redirect path exists in your app

