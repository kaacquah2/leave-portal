# GitHub Actions Workflows

This directory contains GitHub Actions workflows for the MoFA HR System.

## Electron Build Workflow

The `build-electron.yml` workflow builds the Electron desktop application.

### Quick Start

1. **Push the workflow file** (already included in the repository)
2. **Go to Actions tab** → **Build Electron App** → **Run workflow**
3. **Download the installer** from the **Artifacts** section

### Features

- ✅ **No local setup required** - Visual Studio Build Tools are pre-installed
- ✅ **Automatic builds** - Triggers on push to main/master
- ✅ **Manual builds** - Trigger from Actions tab with custom options
- ✅ **Release builds** - Automatically builds and creates releases
- ✅ **Multi-platform** - Supports Windows, macOS, and Linux

### Usage

**Manual Build:**
1. Go to **Actions** → **Build Electron App**
2. Click **Run workflow**
3. Select platform (win/mac/linux/all)
4. Optionally set API URL
5. Download installer from **Artifacts**

**Automatic Build:**
- Pushes to `main`/`master` automatically trigger Windows build
- Only runs if Electron-related files changed

**Release Build:**
- Creating a release/tag automatically builds and creates a GitHub release

For detailed instructions, see [docs/GITHUB-ACTIONS-BUILD.md](../../docs/GITHUB-ACTIONS-BUILD.md).

---

## Cron Jobs Workflow

The `cron-jobs.yml` workflow runs scheduled tasks for the HR system.

### Setup Instructions

1. **Add GitHub Secrets:**
   - Go to your repository → Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `APP_URL`: Your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
     - `CRON_SECRET`: The same secret you set in Vercel environment variables

2. **Generate CRON_SECRET:**
   
   **PowerShell (Windows):**
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
   
   Use the same value in both GitHub Secrets and Vercel environment variables.

3. **Verify Workflow:**
   - Go to Actions tab in GitHub
   - You should see "MoFA HR System Cron Jobs" workflow
   - Click "Run workflow" to test manually

### Scheduled Jobs

- **Escalation Check**: Daily at 9 AM UTC
- **Notification Queue**: Every 5 minutes
- **Data Retention**: Monthly on 1st at 2 AM UTC

### Manual Trigger

You can manually trigger any job from the GitHub Actions UI:
1. Go to Actions → MoFA HR System Cron Jobs
2. Click "Run workflow"
3. Select the branch and click "Run workflow"

### Timezone Adjustment

The cron schedules use UTC. To adjust for your timezone:
- Ghana (GMT): UTC is fine (9 AM UTC = 9 AM GMT)
- For other timezones, adjust the cron expression:
  - `0 9 * * *` = 9 AM UTC
  - `0 12 * * *` = 12 PM UTC (3 PM EAT, 2 PM WAT)

### Monitoring

- Check workflow runs in the Actions tab
- Failed runs will show error details
- Each job logs HTTP response codes and body

### Troubleshooting

**Workflow not running:**
- Ensure the workflow file is in `.github/workflows/` directory
- Check that the repository has Actions enabled
- Verify cron syntax is correct

**401 Unauthorized:**
- Verify `CRON_SECRET` matches in both GitHub and Vercel
- Check that `APP_URL` is correct

**404 Not Found:**
- Verify the API endpoints are deployed
- Check that `APP_URL` points to the correct deployment

