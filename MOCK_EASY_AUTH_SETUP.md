# Mock Easy Auth Headers - Local Development Setup

## Overview

Since Azure App Service Easy Auth only works in Azure (not on localhost), this utility allows you to **mock the Easy Auth headers** for local development and testing.

## Quick Start

### 1. Enable Mock Mode

Add to your `.env.local` file:

```env
NEXT_PUBLIC_MOCK_EASY_AUTH=true
NEXT_PUBLIC_MOCK_USER_ID=test-user-123
NEXT_PUBLIC_MOCK_USER_EMAIL=test@example.com
NEXT_PUBLIC_MOCK_USER_NAME=Test User
NEXT_PUBLIC_MOCK_USER_ROLES=authenticated,admin
```

### 2. Restart Your Dev Server

```bash
npm run dev
```

### 3. Test the Headers

All API requests to your backend will now include mock Easy Auth headers:

- `X-MS-CLIENT-PRINCIPAL` - Base64-encoded principal
- `X-MS-CLIENT-PRINCIPAL-NAME` - User name
- `X-MS-CLIENT-PRINCIPAL-ID` - User ID
- `X-MS-CLIENT-PRINCIPAL-IDP` - Identity provider (aad)

## How It Works

The mock headers are automatically injected into **all API requests** made by:
- `ContentAPI` (content management)
- `CustomAuthAPI` (authentication)
- `DashboardAPI` (dashboard data)

## Testing

### 1. Check Headers in Browser Console

Open browser console and make any API call. You'll see:
```
[ContentAPI] Mock Easy Auth headers injected: { ... }
```

### 2. Test Endpoint

Create a test endpoint in your backend to verify headers:

```typescript
// Example: Express.js backend
app.get('/api/test-headers', (req, res) => {
  const principalHeader = req.headers['x-ms-client-principal'];
  
  if (principalHeader) {
    // Decode base64
    const principalJson = Buffer.from(principalHeader, 'base64').toString('utf-8');
    const principal = JSON.parse(principalJson);
    
    res.json({
      authenticated: true,
      principal: principal,
      name: req.headers['x-ms-client-principal-name'],
      id: req.headers['x-ms-client-principal-id'],
    });
  } else {
    res.json({ authenticated: false });
  }
});
```

### 3. Frontend Test Endpoint

You can also test via the frontend test endpoint:
```
GET http://localhost:3000/api/test-auth
```

## Dynamic User Switching

You can change the mock user at runtime via browser console:

```javascript
// Import the utility (or use it directly)
import { setMockUser, setMockEasyAuthEnabled } from '@/lib/mockEasyAuth';

// Enable mock mode
setMockEasyAuthEnabled(true);

// Set a different user
setMockUser({
  userId: 'admin-456',
  email: 'admin@example.com',
  name: 'Admin User',
  roles: ['authenticated', 'admin']
});

// Make API calls - new headers will be used
```

## Mock User Format

The mock headers match Azure Easy Auth format:

```json
{
  "auth_typ": "aad",
  "claims": [
    {
      "typ": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
      "val": "Test User"
    },
    {
      "typ": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
      "val": "test-user-123"
    },
    {
      "typ": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
      "val": "test@example.com"
    },
    {
      "typ": "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
      "val": "authenticated,admin"
    }
  ],
  "name_typ": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
  "role_typ": "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
}
```

## Backend Integration

Your backend can read the headers the same way as in Azure:

```typescript
// Example: Reading Easy Auth headers
const principalHeader = req.headers['x-ms-client-principal'];

if (principalHeader) {
  // Decode base64 principal
  const principalJson = Buffer.from(principalHeader, 'base64').toString('utf-8');
  const principal = JSON.parse(principalJson);
  
  // Extract user info
  const userId = principal.claims.find(c => 
    c.typ.includes('nameidentifier')
  )?.val;
  
  const email = principal.claims.find(c => 
    c.typ.includes('emailaddress')
  )?.val;
  
  const roles = principal.claims.find(c => 
    c.typ.includes('role')
  )?.val?.split(',') || [];
  
  // Use in your logic
  console.log('User:', userId, email, roles);
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_MOCK_EASY_AUTH` | Enable/disable mock mode | `false` |
| `NEXT_PUBLIC_MOCK_USER_ID` | Mock user ID | `mock-user-123` |
| `NEXT_PUBLIC_MOCK_USER_EMAIL` | Mock user email | `mock.user@example.com` |
| `NEXT_PUBLIC_MOCK_USER_NAME` | Mock user name | `Mock User` |
| `NEXT_PUBLIC_MOCK_USER_ROLES` | Comma-separated roles | `authenticated,anonymous` |

## Important Notes

1. **Mock mode only works in development** - Headers are only injected when `NEXT_PUBLIC_MOCK_EASY_AUTH=true`
2. **Production uses real Easy Auth** - In Azure, real headers come from Easy Auth
3. **Headers are injected automatically** - No code changes needed in your components
4. **Can be toggled at runtime** - Use localStorage to enable/disable or change users

## Troubleshooting

### Headers not appearing?

1. Check `.env.local` has `NEXT_PUBLIC_MOCK_EASY_AUTH=true`
2. Restart dev server after changing env vars
3. Check browser console for injection logs
4. Verify backend is receiving headers (check network tab)

### Wrong user data?

1. Update environment variables
2. Or use `setMockUser()` in browser console
3. Refresh page to apply changes

### Headers in production?

Mock mode is automatically disabled in production. Only real Easy Auth headers will be used.

