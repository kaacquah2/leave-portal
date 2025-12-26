# Vercel Troubleshooting Guide

## Quick Diagnosis Steps

### 1. Check Build Logs
1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on the latest deployment
3. Check "Build Logs" for errors
4. Look for:
   - Prisma generation errors
   - CSS/Tailwind build errors
   - TypeScript errors
   - Missing dependencies

### 2. Check Function Logs
1. Vercel Dashboard → Your Project → Functions
2. Click on `/api/auth/login` (or any failing API route)
3. Check "Logs" tab for runtime errors
4. Common errors:
   - Database connection failures
   - Missing environment variables
   - JWT_SECRET not set
   - Prisma client not generated

### 3. Check Browser Console
1. Open your Vercel URL
2. Press F12 to open DevTools
3. Check "Console" tab for JavaScript errors
4. Check "Network" tab:
   - Are CSS files loading? (status 200)
   - Are API calls failing? (status 4xx/5xx)
   - Check response bodies for error messages

### 4. Check Environment Variables
1. Vercel Dashboard → Your Project → Settings → Environment Variables
2. Verify all required variables are set:
   - ✅ `DATABASE_URL`
   - ✅ `DIRECT_URL`
   - ✅ `JWT_SECRET` (MUST be set!)
   - ✅ `NEXT_PUBLIC_APP_URL`
3. Make sure they're set for "Production" environment

---

## Common Issues & Solutions

### Issue: "UI Looks Different / No Styling"

**Symptoms:**
- Page loads but looks unstyled
- No colors, spacing, or Tailwind classes applied

**Possible Causes:**
1. CSS not building correctly
2. `globals.css` not loading
3. Tailwind PostCSS plugin issue

**Solutions:**
1. **Check Build Logs**: Look for CSS/Tailwind errors
2. **Verify `globals.css` import**: Should be in `app/layout.tsx`
3. **Check Network Tab**: Verify CSS files are loading (status 200)
4. **Clear Browser Cache**: Hard refresh (Ctrl+Shift+R)
5. **Redeploy**: Sometimes build cache needs clearing

**If still not working:**
- Check `postcss.config.mjs` exists and is correct
- Verify Tailwind CSS v4 is installed: `npm list @tailwindcss/postcss`
- Check `package.json` has `tailwindcss` and `@tailwindcss/postcss`

---

### Issue: "Cannot Log In"

#### A. "Invalid email or password" Error

**Possible Causes:**
1. No users in database
2. Wrong email/password
3. User account is inactive
4. Database connection failing

**Solutions:**
1. **Create a user first**:
   ```bash
   curl -X POST https://your-app.vercel.app/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@test.com",
       "password": "Test123!",
       "role": "hr"
     }'
   ```

2. **Check database has users**:
   - Use Prisma Studio: `npx prisma studio`
   - Or check Neon dashboard directly

3. **Verify user is active**:
   - Check `User` table in database
   - Ensure `active: true`

4. **Test database connection**:
   - Check `DATABASE_URL` in Vercel
   - Verify Neon database is not paused
   - Check function logs for connection errors

#### B. Login Request Fails (500 Error)

**Possible Causes:**
1. `JWT_SECRET` not set
2. Database connection failing
3. Prisma client not generated

**Solutions:**
1. **Set JWT_SECRET**:
   - Vercel Dashboard → Environment Variables
   - Add `JWT_SECRET` with a strong random value
   - Generate: `openssl rand -base64 32`

2. **Check Database Connection**:
   - Verify `DATABASE_URL` is correct
   - Ensure it uses pooler: `-pooler` in hostname
   - Check Neon dashboard - database should be active

3. **Verify Prisma Client**:
   - Check build logs for "Prisma Client generated"
   - If missing, build command should include `prisma generate`

#### C. Login Succeeds But Redirects to Login Again

**Possible Causes:**
1. Cookie not being set
2. Cookie security settings wrong
3. Domain mismatch

**Solutions:**
1. **Check Cookie Settings** (Already fixed in code):
   - Cookie should have `Secure` flag (HTTPS)
   - Cookie should have `HttpOnly` flag
   - Check DevTools → Application → Cookies

2. **Verify Cookie Domain**:
   - Should be set for your Vercel domain
   - Check `path: '/'` is set

3. **Check SameSite Setting**:
   - Should be `'lax'` (already set in code)

---

### Issue: "Database Connection Failed"

**Symptoms:**
- API calls return 500 errors
- Function logs show Prisma connection errors

**Solutions:**
1. **Verify DATABASE_URL**:
   - Must use pooler connection: `-pooler` in hostname
   - Format: `postgresql://user:pass@host-pooler.neon.tech/db?sslmode=require`

2. **Check Neon Database**:
   - Go to Neon dashboard
   - Verify database is not paused
   - Check connection string is correct

3. **Test Connection Locally**:
   ```bash
   npm run db:test
   ```

4. **Check Function Logs**:
   - Look for specific Prisma error messages
   - Common: "Can't reach database server"

---

### Issue: "Prisma Client Not Generated"

**Symptoms:**
- Build succeeds but runtime errors about Prisma
- "Cannot find module '@prisma/client'"

**Solutions:**
1. **Verify Build Command**:
   - Should include `prisma generate`
   - Check `vercel.json` has correct build command

2. **Check Build Logs**:
   - Look for "Prisma Client generated" message
   - If missing, Prisma generation failed

3. **Manual Fix**:
   - Add to `package.json`:
     ```json
     "postinstall": "prisma generate"
     ```

---

## Testing Checklist

After deploying, test these:

- [ ] **Homepage loads** - No 404 errors
- [ ] **CSS loads** - Page is styled correctly
- [ ] **Login page displays** - Form is visible
- [ ] **Can create user** - Registration API works
- [ ] **Can log in** - Login API works
- [ ] **Cookie is set** - Check DevTools → Application → Cookies
- [ ] **Redirects after login** - Goes to correct portal
- [ ] **API routes work** - No 500 errors in Network tab
- [ ] **Database queries work** - Data loads correctly

---

## Getting Help

If issues persist:

1. **Check Vercel Function Logs**:
   - Most detailed error information
   - Shows exact error messages and stack traces

2. **Check Browser Console**:
   - Client-side errors
   - Network request failures

3. **Check Build Logs**:
   - Build-time errors
   - Missing dependencies
   - Configuration issues

4. **Verify Environment Variables**:
   - All required variables set
   - Values are correct (no typos)
   - Set for correct environment (Production)

---

**Last Updated**: 2024

