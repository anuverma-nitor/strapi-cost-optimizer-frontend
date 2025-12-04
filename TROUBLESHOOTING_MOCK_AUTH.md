# Troubleshooting Mock Easy Auth Headers

## Issue: Headers Not Appearing in Requests

If you don't see `x-ms-client-principal` headers in your requests, follow these steps:

### Step 1: Verify Mock Mode is Enabled

1. **Check `.env.local` file:**
   ```env
   NEXT_PUBLIC_MOCK_EASY_AUTH=true
   ```

2. **Check browser console:**
   Open browser console and run:
   ```javascript
   window.debugMockAuth()
   ```
   
   You should see:
   ```
   Enabled: true
   ```

3. **If not enabled, enable it:**
   ```javascript
   window.enableMockAuth()
   ```

### Step 2: Check Browser Console Logs

When making API requests, you should see:
```
[DashboardAPI] Mock Easy Auth enabled: true
[DashboardAPI] Mock Easy Auth headers injected: { ... }
[DashboardAPI] Full request config headers: { ... }
```

If you see:
```
[DashboardAPI] Mock Easy Auth is DISABLED. Set NEXT_PUBLIC_MOCK_EASY_AUTH=true to enable.
```

Then mock mode is not enabled.

### Step 3: Verify Headers in Network Tab

1. Open browser DevTools → Network tab
2. Make a request (e.g., load dashboard)
3. Find the request to `http://localhost:3001/api/dashboard/recent-activity`
4. Click on it → Headers tab
5. Look in **Request Headers** section

You should see:
- `x-ms-client-principal`
- `x-ms-client-principal-name`
- `x-ms-client-principal-id`
- `x-ms-client-principal-idp`

### Step 4: Check Environment Variables

Make sure `.env.local` exists and has:
```env
NEXT_PUBLIC_MOCK_EASY_AUTH=true
```

**Important:** Restart your dev server after changing `.env.local`:
```bash
# Stop server (Ctrl+C)
npm run dev
```

### Step 5: Enable via Browser Console (Quick Fix)

If you can't restart the server, enable it via console:

```javascript
// Enable mock auth
localStorage.setItem('mock_easy_auth_enabled', 'true');

// Refresh page or make a new request
location.reload();
```

### Step 6: Verify Headers Are Being Sent

Add this to your backend to log all headers:

```typescript
// Example: Express.js middleware
app.use((req, res, next) => {
  console.log('All headers:', req.headers);
  console.log('Easy Auth headers:', {
    principal: req.headers['x-ms-client-principal'],
    name: req.headers['x-ms-client-principal-name'],
    id: req.headers['x-ms-client-principal-id'],
    idp: req.headers['x-ms-client-principal-idp'],
  });
  next();
});
```

## Common Issues

### Issue: Headers not in network tab

**Solution:** Check if mock mode is enabled. Headers are only injected when `NEXT_PUBLIC_MOCK_EASY_AUTH=true`.

### Issue: Headers appear in console but not in network tab

**Solution:** This is normal - axios interceptors modify the request before it's sent. Check your backend logs to verify headers are received.

### Issue: Headers are lowercase in network tab

**Solution:** This is normal. HTTP headers are case-insensitive. Your backend should read them as lowercase: `req.headers['x-ms-client-principal']`.

### Issue: Mock mode works but headers are empty

**Solution:** Check the mock user configuration:
```javascript
window.debugMockAuth() // Check the user object
```

## Quick Test

1. Open browser console
2. Run: `window.debugMockAuth()`
3. Check if `enabled: true`
4. Make an API request
5. Check console for: `[DashboardAPI] Mock Easy Auth headers injected`
6. Check network tab for headers

## Still Not Working?

1. **Clear browser cache and localStorage:**
   ```javascript
   localStorage.clear();
   location.reload();
   ```

2. **Verify `.env.local` is in project root** (not in `src/`)

3. **Check Next.js is reading env vars:**
   ```javascript
   console.log('Mock Auth Env:', process.env.NEXT_PUBLIC_MOCK_EASY_AUTH);
   ```

4. **Try manual header injection test:**
   ```javascript
   import { generateMockEasyAuthHeaders, getMockUser } from '@/lib/mockEasyAuth';
   const headers = generateMockEasyAuthHeaders(getMockUser());
   console.log('Generated headers:', headers);
   ```

