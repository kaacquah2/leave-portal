# Authentication Debug Guide

This guide helps you troubleshoot authentication issues, especially the 401 error on `/api/auth/me`.

## Quick Fixes

### 1. Ensure Users Log In First

The `/api/auth/me` endpoint requires authentication. Users must log in before accessing protected routes.

**What happens:**
- When a user visits the app, it checks authentication via `/api/auth/me`
- If no authentication cookie exists, the user is shown the landing page
- Users must click "Sign In" and enter their credentials
- After successful login, a secure httpOnly cookie is set
- The cookie is automatically sent with subsequent requests

**To verify:**
1. Open the app in a browser
2. Check if you see the landing page (not logged in) or your dashboard (logged in)
3. If you see the landing page, click "Sign In" and log in
4. After login, you should be redirected to your role-specific dashboard

### 2. Check Browser Cookies

After logging in, verify that the authentication cookie exists.

**How to check cookies:**

1. **Chrome/Edge:**
   - Open DevTools (F12)
   - Go to Application tab → Cookies
   - Look for a cookie named `token`
   - It should be:
     - **HttpOnly**: ✓ (checked)
     - **Secure**: ✓ (checked on HTTPS)
     - **SameSite**: Lax
     - **Path**: /
     - **Expires**: 7 days from login

2. **Firefox:**
   - Open DevTools (F12)
   - Go to Storage tab → Cookies
   - Look for `token` cookie

3. **Using Browser Console:**
   ```javascript
   // Note: httpOnly cookies cannot be read by JavaScript
   // But you can check if cookies are being sent
   console.log('Cookies:', document.cookie)
   ```

**If the cookie is missing:**
- Clear browser cookies and try logging in again
- Check browser console for errors
- Verify you're using HTTPS (required for secure cookies on Vercel)
- Try a different browser to rule out browser-specific issues

### 3. Enable Debug Logging

Enable detailed authentication logging to diagnose issues.

#### For Server-Side Debugging (Vercel)

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add a new environment variable:
   - **Name**: `DEBUG_AUTH`
   - **Value**: `true`
3. Redeploy your application

#### For Client-Side Debugging

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add a new environment variable:
   - **Name**: `NEXT_PUBLIC_DEBUG_AUTH`
   - **Value**: `true`
3. Redeploy your application

#### Using Debug Utilities

In development or with debug mode enabled, you can use the debug utilities:

```javascript
// In browser console
window.checkAuth()  // Prints comprehensive auth status

// Or import in your code
import { printAuthDebugInfo, verifyAuthentication } from '@/lib/auth-debug'

// Check authentication status
const status = await verifyAuthentication()
console.log('Auth status:', status)

// Print full debug info
await printAuthDebugInfo()
```

## Common Issues and Solutions

### Issue: 401 Unauthorized on `/api/auth/me`

**Possible causes:**

1. **User not logged in**
   - **Solution**: User must log in first via the login form

2. **Cookie expired**
   - **Solution**: Cookies expire after 7 days. User needs to log in again

3. **Cookie not being sent**
   - **Solution**: 
     - Verify `credentials: 'include'` is set in fetch requests
     - Check CORS settings if using cross-origin requests
     - Ensure you're using HTTPS (required for secure cookies)

4. **Cookie domain mismatch**
   - **Solution**: Cookies are set for the current domain. If you're accessing from a different subdomain, cookies won't be sent

5. **Browser blocking cookies**
   - **Solution**: 
     - Check browser privacy settings
     - Disable ad blockers temporarily
     - Try incognito/private mode

### Issue: Cookie Set But Still Getting 401

**Possible causes:**

1. **Invalid or expired token**
   - **Solution**: Token might be corrupted. Clear cookies and log in again

2. **Session expired in database**
   - **Solution**: Sessions expire after 7 days. User needs to log in again

3. **Account locked**
   - **Solution**: Too many failed login attempts. Wait or contact admin

4. **Database connection issue**
   - **Solution**: Check Vercel logs for database errors

## Debug Checklist

When troubleshooting authentication issues:

- [ ] User has logged in successfully
- [ ] `token` cookie exists in browser
- [ ] Cookie has correct attributes (httpOnly, secure, sameSite)
- [ ] Using HTTPS (required for secure cookies)
- [ ] No CORS errors in browser console
- [ ] `DEBUG_AUTH=true` is set in Vercel (for detailed logs)
- [ ] Check Vercel function logs for authentication errors
- [ ] Verify `JWT_SECRET` is set in Vercel environment variables
- [ ] Verify `DATABASE_URL` is set and database is accessible

## Testing Authentication

### Test Login Flow

1. Open the app
2. Click "Sign In"
3. Enter valid credentials
4. After login, check browser cookies for `token`
5. Verify you're redirected to the correct dashboard
6. Refresh the page - you should stay logged in

### Test Cookie Persistence

1. Log in successfully
2. Close the browser
3. Reopen the browser and navigate to the app
4. You should still be logged in (cookie persists for 7 days)

### Test Logout

1. Click logout
2. Verify `token` cookie is deleted
3. Verify you're redirected to landing page
4. Try accessing `/api/auth/me` - should return 401

## Environment Variables

Required environment variables in Vercel:

- `DATABASE_URL` - Database connection string
- `DIRECT_URL` - Direct database connection (for migrations)
- `JWT_SECRET` - Secret key for JWT tokens (required!)
- `DEBUG_AUTH` - Set to `true` for server-side debug logging (optional)
- `NEXT_PUBLIC_DEBUG_AUTH` - Set to `true` for client-side debug logging (optional)

## Getting Help

If issues persist:

1. Enable debug logging (`DEBUG_AUTH=true`)
2. Check Vercel function logs
3. Check browser console for errors
4. Use `window.checkAuth()` in browser console (if debug mode enabled)
5. Verify all environment variables are set correctly
6. Check database connectivity

## Security Notes

- Authentication tokens are stored in httpOnly cookies (not accessible to JavaScript)
- Cookies are secure (HTTPS only) in production
- Sessions expire after 7 days
- Failed login attempts are tracked and accounts can be locked
- All authentication is verified server-side

