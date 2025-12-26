# Vercel Deployment Fixes

## Issues Found & Solutions

### 1. **UI Looks Different** - CSS/Tailwind Not Loading

**Problem**: Tailwind CSS might not be building correctly on Vercel.

**Solution**: 
- Ensure PostCSS is configured correctly (already done ✅)
- Verify build includes CSS processing
- Check that `globals.css` is imported in layout

**Fix Applied**: Updated `vercel.json` to ensure proper build process.

---

### 2. **Cannot Log In** - Multiple Potential Issues

#### Issue A: Cookie Security Settings

**Problem**: Cookies need `secure: true` on Vercel (HTTPS), but code checks `NODE_ENV === 'production'` which might not be set correctly.

**Fix**: Updated cookie settings to always use `secure: true` on Vercel.

#### Issue B: No Users in Database

**Problem**: Database might be empty - no users exist to log in with.

**Solution**: Create an admin user via API or database.

#### Issue C: Database Connection Failing

**Problem**: `DATABASE_URL` might be incorrect or database is paused.

**Solution**: Verify environment variables in Vercel dashboard.

#### Issue C: JWT_SECRET Not Set

**Problem**: Authentication fails if `JWT_SECRET` is missing.

**Solution**: Must set `JWT_SECRET` in Vercel environment variables.

---

## 🔧 Fixes Applied

### 1. Updated Cookie Settings

Changed from:
```typescript
secure: process.env.NODE_ENV === 'production'
```

To:
```typescript
secure: process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'
```

This ensures cookies work on Vercel (which sets `VERCEL=1`).

### 2. Updated Vercel Configuration

Added proper build settings and environment variable handling.

---

## ✅ Action Items for You

### Step 1: Verify Environment Variables in Vercel

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

**Required Variables:**
- ✅ `DATABASE_URL` - Your Neon database connection string
- ✅ `DIRECT_URL` - Direct database connection (for migrations)
- ✅ `JWT_SECRET` - **MUST BE SET** (generate: `openssl rand -base64 32`)
- ✅ `NEXT_PUBLIC_APP_URL` - Your Vercel URL (e.g., `https://your-app.vercel.app`)

**Optional but Recommended:**
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (for emails)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (for push notifications)

### Step 2: Create Admin User

After deployment, create an admin user:

**Option A: Via API (Recommended)**
```bash
curl -X POST https://your-app.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@mofa.gov.gh",
    "password": "YourSecurePassword123!",
    "role": "hr",
    "staffId": "ADMIN001"
  }'
```

**Option B: Via Database**
1. Go to your Neon database dashboard
2. Use Prisma Studio or direct SQL to create a user
3. Make sure to hash the password with bcrypt

### Step 3: Redeploy

After updating environment variables:
1. Go to Vercel Dashboard → Deployments
2. Click "Redeploy" on the latest deployment
3. Or push a new commit to trigger redeploy

### Step 4: Test

1. Visit your Vercel URL
2. Try to log in with the admin user you created
3. Check browser console for errors (F12)
4. Check Vercel function logs for API errors

---

## 🐛 Troubleshooting

### UI Still Looks Wrong

1. **Check Build Logs**: Vercel Dashboard → Deployments → Click deployment → View build logs
   - Look for CSS/Tailwind errors
   - Verify `globals.css` is being processed

2. **Clear Browser Cache**: Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

3. **Check Network Tab**: 
   - Open DevTools (F12) → Network tab
   - Reload page
   - Check if CSS files are loading (status 200)

### Still Can't Log In

1. **Check Vercel Function Logs**:
   - Vercel Dashboard → Your Project → Functions
   - Click on `/api/auth/login`
   - Check for errors

2. **Verify Database Connection**:
   - Check `DATABASE_URL` is correct
   - Verify Neon database is not paused
   - Test connection locally: `npm run db:test`

3. **Check JWT_SECRET**:
   - Must be set in Vercel environment variables
   - Should be a strong random string (32+ characters)

4. **Verify User Exists**:
   - Check database has users
   - Verify user email/password is correct
   - Check user is active (`active: true`)

5. **Check Cookie Settings**:
   - Open DevTools → Application → Cookies
   - After login, verify `token` cookie is set
   - Check cookie has `Secure` and `HttpOnly` flags

---

## 📋 Quick Checklist

Before reporting issues, verify:

- [ ] All environment variables are set in Vercel
- [ ] `JWT_SECRET` is set and is a strong random string
- [ ] `DATABASE_URL` uses the pooler connection (`-pooler` in hostname)
- [ ] `NEXT_PUBLIC_APP_URL` is set to your actual Vercel URL
- [ ] At least one user exists in the database
- [ ] Database is not paused (check Neon dashboard)
- [ ] Build completed successfully (check Vercel build logs)
- [ ] No errors in browser console (F12)
- [ ] No errors in Vercel function logs

---

## 🔄 Next Steps

1. **Pull the latest changes** (cookie fix)
2. **Update environment variables** in Vercel
3. **Redeploy** the application
4. **Create admin user** via API
5. **Test login** functionality

---

**Last Updated**: 2024  
**Status**: Fixes Applied - Ready for Redeploy

