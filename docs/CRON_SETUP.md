# Cron Job Setup Guide

Since we're using Vercel's free plan (which doesn't include cron jobs), all scheduled jobs are implemented as API endpoints that can be called by external cron services.

## Available Cron Jobs

### 1. Escalation Check
- **Endpoint**: `GET /api/cron/escalation`
- **Purpose**: Checks and escalates pending leave approvals after 10 working days
- **Recommended Schedule**: Daily at 9 AM
- **Cron Expression**: `0 9 * * *`

### 2. Notification Queue Processing
- **Endpoint**: `GET /api/cron/notification-queue`
- **Purpose**: Processes pending notifications from the queue
- **Recommended Schedule**: Every 5 minutes
- **Cron Expression**: `*/5 * * * *`

### 3. Data Retention
- **Endpoint**: `GET /api/cron/data-retention`
- **Purpose**: Archives and deletes expired records per retention policy
- **Recommended Schedule**: Monthly on the 1st at 2 AM
- **Cron Expression**: `0 2 1 * *`

## Setup with External Cron Services

> **Recommended: Use GitHub Actions** (see Option 3 below) - It's free, reliable, and already configured!

### Option 1: cron-job.org (Free)

1. Go to [cron-job.org](https://cron-job.org) and create a free account
2. Click "Create cronjob"
3. Configure each job:

   **Escalation Job:**
   - Title: `MoFA Escalation Check`
   - Address: `https://your-domain.com/api/cron/escalation`
   - Schedule: `0 9 * * *` (Daily at 9 AM)
   - Request Method: `GET`
   - Headers: Add header `Authorization` with value `Bearer YOUR_CRON_SECRET`

   **Notification Queue:**
   - Title: `MoFA Notification Queue`
   - Address: `https://your-domain.com/api/cron/notification-queue`
   - Schedule: `*/5 * * * *` (Every 5 minutes)
   - Request Method: `GET`
   - Headers: Add header `Authorization` with value `Bearer YOUR_CRON_SECRET`

   **Data Retention:**
   - Title: `MoFA Data Retention`
   - Address: `https://your-domain.com/api/cron/data-retention`
   - Schedule: `0 2 1 * *` (Monthly on 1st at 2 AM)
   - Request Method: `GET`
   - Headers: Add header `Authorization` with value `Bearer YOUR_CRON_SECRET`

### Option 2: EasyCron (Free tier available)

1. Sign up at [EasyCron](https://www.easycron.com)
2. Create a new cron job for each endpoint
3. Configure similar to cron-job.org above

### Option 3: GitHub Actions (Recommended - Free for all repos)

The workflow file is already created at `.github/workflows/cron-jobs.yml`.

**Setup Steps:**

1. **Add GitHub Secrets:**
   - Go to your repository → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Add `APP_URL`: Your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
   - Add `CRON_SECRET`: The same secret you use in Vercel (generate with `openssl rand -base64 32`)

2. **Verify Workflow:**
   - Go to the Actions tab in your GitHub repository
   - You should see "MoFA HR System Cron Jobs" workflow
   - Click "Run workflow" to test manually

3. **The workflow will automatically:**
   - Run escalation check daily at 9 AM UTC
   - Process notification queue every 5 minutes
   - Run data retention monthly on the 1st at 2 AM UTC

**Manual Trigger:**
- Go to Actions → MoFA HR System Cron Jobs
- Click "Run workflow" button
- Select branch and click "Run workflow"

**Note:** GitHub Actions is free for both public and private repositories (with usage limits that are generous for cron jobs).

## Environment Variables

Set the following in your Vercel environment variables:

```
CRON_SECRET=your-secure-random-string-here
```

Generate a secure secret:

**PowerShell (Windows):**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```
Or use this one-liner for base64-like output:
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object {Get-Random -Minimum 0 -Maximum 256}))
```

**Bash/Linux/Mac:**
```bash
openssl rand -base64 32
```

**Node.js (alternative):**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Manual Execution

You can also manually trigger jobs:

1. **Via UI**: Use the Cron Job Manager component (accessible to HR Directors and System Admins)
2. **Via API**: Call the endpoints directly with proper authentication

### Manual API Call Example

```bash
# With cron secret
curl -X GET "https://your-domain.com/api/cron/escalation" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# With admin session (if logged in)
curl -X GET "https://your-domain.com/api/cron/escalation" \
  -H "Cookie: your-session-cookie"
```

## Security

- All endpoints require either:
  - A valid `CRON_SECRET` in the Authorization header, OR
  - An authenticated admin/HR user session
- Never expose your `CRON_SECRET` in client-side code
- Use HTTPS for all cron job calls

## Monitoring

- Check job execution logs in your cron service dashboard
- Monitor application logs for job execution
- Use the Cron Job Manager UI to view last run times and status

## Troubleshooting

### Job not running
1. Verify the cron service is active
2. Check the endpoint URL is correct
3. Verify the `CRON_SECRET` matches your environment variable
4. Check application logs for errors

### 401 Unauthorized
- Verify `CRON_SECRET` is set correctly
- Check the Authorization header format: `Bearer YOUR_CRON_SECRET`
- Ensure the secret matches in both the cron service and Vercel

### 500 Internal Server Error
- Check application logs for detailed error messages
- Verify database connectivity
- Check that all required environment variables are set

