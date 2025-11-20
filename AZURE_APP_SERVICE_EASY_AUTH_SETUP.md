# Azure App Service Easy Auth Setup Guide

## Overview

This application uses **Azure App Service Easy Auth** (not Azure Static Web Apps). Easy Auth is configured through the Azure Portal, not via configuration files.

## Important Notes

- ❌ **`staticwebapp.config.json` is NOT used** - This file is only for Azure Static Web Apps
- ✅ **Easy Auth is configured in Azure Portal** - No config file needed
- ✅ **Auth headers are automatically injected** - `X-MS-CLIENT-PRINCIPAL*` headers are available to your backend

## Setup Instructions

### 1. Configure Easy Auth in Azure Portal

1. Go to **Azure Portal** → Your **App Service**
2. Navigate to **Authentication** (under Settings)
3. Click **Add identity provider**
4. Select **Microsoft** (Azure AD)
5. Configure:
   - **App registration type**: Choose "Create new app registration" or "Pick an existing app registration"
   - **Name**: Your app registration name
   - **Supported account types**: Select appropriate option
   - **Restrict access**: Choose if you want to require authentication for all requests

### 2. App Registration Configuration

If creating a new app registration:
- **Redirect URI**: Will be automatically set to `https://your-app.azurewebsites.net/.auth/login/aad/callback`
- **Client ID**: Automatically configured
- **Client Secret**: Automatically configured

If using existing app registration:
- Ensure redirect URI includes: `https://your-app.azurewebsites.net/.auth/login/aad/callback`

### 3. Authentication Endpoints

Easy Auth provides these endpoints automatically:

- **Login**: `/.auth/login/aad`
- **Logout**: `/.auth/logout`
- **User Info**: `/.auth/me`

### 4. Identity Headers (Available to Backend)

Azure App Service automatically injects these headers for authenticated requests:

- `X-MS-CLIENT-PRINCIPAL` - Base64-encoded JSON with user identity
- `X-MS-CLIENT-PRINCIPAL-NAME` - User's display name
- `X-MS-CLIENT-PRINCIPAL-ID` - User's unique ID
- `X-MS-CLIENT-PRINCIPAL-IDP` - Identity provider (e.g., "aad")

### 5. Backend Integration

Your backend API can read the identity from headers:

```typescript
// Example: Reading Easy Auth headers in your backend
const principalHeader = req.headers['x-ms-client-principal'];

if (principalHeader) {
  // Decode base64 principal
  const principalJson = Buffer.from(principalHeader, 'base64').toString('utf-8');
  const principal = JSON.parse(principalJson);
  
  // Use principal.userId, principal.userDetails, etc.
}
```

### 6. Frontend Login Flow

The login page (`/login`) automatically redirects to:
```
/.auth/login/aad?post_login_redirect_url=/dashboard
```

After successful authentication, users are redirected back to `/dashboard`.

## Testing

### In Azure App Service (Production)

1. Navigate to `https://your-app.azurewebsites.net/login`
2. You'll be redirected to Microsoft login
3. After authentication, redirected to `/dashboard`
4. Check `/.auth/me` to see current user info

### Local Development

Easy Auth **does not work on localhost**. For local testing:

1. **Option 1**: Deploy to Azure App Service and test there
2. **Option 2**: Use a local development authentication (bypass Easy Auth locally)
3. **Option 3**: Mock the `X-MS-CLIENT-PRINCIPAL` headers in your local backend

## Configuration Differences

| Feature | Azure Static Web Apps | Azure App Service |
|---------|----------------------|-------------------|
| Config File | `staticwebapp.config.json` | None (Portal only) |
| Setup | Config file + Portal | Portal only |
| Auth Endpoints | `/.auth/login/aad` | `/.auth/login/aad` |
| Headers | `X-MS-CLIENT-PRINCIPAL*` | `X-MS-CLIENT-PRINCIPAL*` |
| User Info | `/.auth/me` | `/.auth/me` |

## Troubleshooting

### Auth not working?

1. **Check Azure Portal**:
   - Go to App Service → Authentication
   - Verify identity provider is configured
   - Check that redirect URI is correct

2. **Check App Registration**:
   - Azure Portal → Microsoft Entra ID → App registrations
   - Verify redirect URI includes: `https://your-app.azurewebsites.net/.auth/login/aad/callback`

3. **Check Headers**:
   - Use browser dev tools to check if `X-MS-CLIENT-PRINCIPAL` headers are present
   - Test `/.auth/me` endpoint to see user info

### Headers not appearing?

- Headers only appear for **authenticated requests**
- Headers only work in **Azure App Service** (not localhost)
- Ensure user is logged in via `/.auth/login/aad`

## Next Steps

1. Configure Easy Auth in Azure Portal
2. Deploy your application to Azure App Service
3. Test authentication flow
4. Verify headers are received in your backend API

