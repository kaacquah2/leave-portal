# Building Electron App with GitHub Actions

This guide explains how to use GitHub Actions to build the Electron desktop application. GitHub Actions runners have Visual Studio Build Tools pre-installed, so you don't need to install them locally.

## Overview

The GitHub Actions workflow (`.github/workflows/build-electron.yml`) automatically builds the Electron app when:
- You push to `main` or `master` branch (if Electron files changed)
- You create a new release/tag
- You manually trigger it from the Actions tab

## Benefits

✅ **No local setup required** - Visual Studio Build Tools are pre-installed  
✅ **Consistent builds** - Same environment every time  
✅ **Automatic artifacts** - Built installers are available for download  
✅ **Multi-platform** - Can build for Windows, macOS, and Linux  
✅ **Free** - GitHub Actions is free for public repos and has generous limits for private repos

## Setup

### 1. Push the Workflow File

The workflow file is already in the repository at `.github/workflows/build-electron.yml`. Just push it to GitHub:

```bash
git add .github/workflows/build-electron.yml
git commit -m "Add GitHub Actions workflow for Electron builds"
git push
```

### 2. Configure Secrets (Optional)

If you want to use a custom API URL, add it as a secret:

1. Go to your repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add `ELECTRON_DEFAULT_API_URL` with your API URL (e.g., `https://hr-leave-portal.vercel.app`)

**Note:** The workflow uses `https://hr-leave-portal.vercel.app` as the default if no secret is set.

### 3. Trigger a Build

#### Option A: Automatic Build (on Push)

Just push to `main` or `master` branch:

```bash
git push origin main
```

The workflow will automatically run if you changed Electron-related files.

#### Option B: Manual Build

1. Go to your repository on GitHub
2. Click the **Actions** tab
3. Select **Build Electron App** workflow
4. Click **Run workflow**
5. Choose:
   - **Branch:** Select the branch to build from
   - **API URL:** (Optional) Override the default API URL
   - **Platform:** Choose `win`, `mac`, `linux`, or `all`
6. Click **Run workflow**

#### Option C: Build on Release

Create a new release/tag:

```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

This will:
- Build the Windows installer
- Create a GitHub release
- Attach the installer to the release

## Downloading Build Artifacts

After the workflow completes:

1. Go to the **Actions** tab
2. Click on the completed workflow run
3. Scroll down to **Artifacts**
4. Download:
   - **windows-installer** - The `.exe` installer file
   - **windows-unpacked** - The unpacked app (for testing)

Artifacts are kept for:
- **Installers:** 30 days
- **Unpacked apps:** 7 days
- **Build logs:** 7 days

## Workflow Details

### What Gets Built

1. **Next.js App** - The web application is built with Electron configuration
2. **TypeScript Repositories** - Compiled to JavaScript
3. **Native Modules** - `better-sqlite3` is rebuilt for Electron
4. **Electron App** - Packaged into installer

### Build Process

1. **Checkout code** - Gets the latest code
2. **Setup Node.js** - Installs Node.js 20
3. **Install dependencies** - Runs `npm ci` (clean install)
4. **Generate Prisma Client** - (Optional, continues on error)
5. **Build Next.js** - Creates the web app bundle
6. **Compile TypeScript** - Compiles repository files
7. **Rebuild native modules** - Rebuilds `better-sqlite3` for Electron
8. **Build Electron app** - Creates the installer
9. **Upload artifacts** - Makes installers available for download

### Platform-Specific Notes

#### Windows
- Uses `windows-latest` runner
- Visual Studio Build Tools are pre-installed
- Creates `.exe` installer (NSIS)
- Builds in about 10-15 minutes

#### macOS
- Uses `macos-latest` runner
- Creates `.dmg` disk image
- Requires manual trigger or release
- Builds in about 15-20 minutes

#### Linux
- Uses `ubuntu-latest` runner
- Creates `.AppImage` and `.deb` packages
- Requires manual trigger or release
- Builds in about 10-15 minutes

## Troubleshooting

### Build Fails with "Could not find Visual Studio"

This shouldn't happen on GitHub Actions (Visual Studio is pre-installed), but if it does:
- Check the workflow logs
- Ensure you're using `windows-latest` runner
- Try manually triggering the workflow

### Build Succeeds but App Doesn't Work

1. Check the build logs for warnings
2. Download the `windows-unpacked` artifact and test locally
3. Check the error logs in the app's user data directory

### Native Module Rebuild Fails

The workflow continues even if manual rebuild fails because `electron-builder` will also try to rebuild. If both fail:
- Check the build logs
- Ensure `better-sqlite3` is in `package.json` dependencies
- Verify the Electron version matches

### Artifacts Not Available

- Artifacts expire after the retention period (30 days for installers)
- Check if the workflow completed successfully
- Ensure the build step didn't fail

## Advanced Usage

### Custom API URL per Build

When manually triggering, you can specify a custom API URL:

1. Go to Actions → Build Electron App → Run workflow
2. Enter your API URL in the "API URL" field
3. This will be embedded in the built app

### Skip Build on Commit

Add `[skip build]` to your commit message:

```bash
git commit -m "Update docs [skip build]"
```

This will skip the automatic build.

### Build Multiple Platforms

When manually triggering, select `all` as the platform to build for Windows, macOS, and Linux simultaneously.

## Cost Considerations

### Public Repositories
- **Free** - Unlimited minutes for public repos

### Private Repositories
- **Free tier:** 2,000 minutes/month
- **Pro:** 3,000 minutes/month included
- **Team:** 3,000 minutes/month included

**Estimated costs:**
- Windows build: ~10-15 minutes
- macOS build: ~15-20 minutes
- Linux build: ~10-15 minutes

For a typical workflow (Windows only, 10 builds/month):
- **Total:** ~150 minutes/month
- **Cost:** Free (well within free tier)

## Best Practices

1. **Use releases for production builds** - Creates a permanent release with artifacts
2. **Test locally first** - Don't rely solely on CI for testing
3. **Monitor build times** - Optimize if builds take too long
4. **Keep artifacts organized** - Download and archive important builds
5. **Use secrets for sensitive URLs** - Don't hardcode API URLs in workflow files

## Related Documentation

- [Build Requirements](BUILD-REQUIREMENTS.md) - Local build setup
- [Initialization Checklist](../electron/INITIALIZATION_CHECKLIST.md) - App initialization details
- [Electron Build Offline](ELECTRON-BUILD-OFFLINE.md) - Offline functionality details

