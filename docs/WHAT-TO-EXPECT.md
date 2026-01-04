# What to Expect After Installation

This document describes what you should see when you install and run the HR Leave Portal application.

## Startup Sequence

### 1. Splash Screen (Production Build Only)
- **Duration:** 2-3 seconds
- **Appearance:** 
  - Purple gradient background (from #667eea to #764ba2)
  - White "HR Portal" logo text (large, bold)
  - "Loading Application" title
  - "Please wait..." subtitle
  - Animated progress bar
  - Status messages that cycle: "Initializing...", "Loading database...", "Connecting to server...", "Almost ready..."

**Note:** The splash screen only appears in production builds, not during development.

---

### 2. Initial Loading Screen
- **Duration:** 1-5 seconds (depends on initialization speed)
- **Appearance:**
  - Centered loading spinner (circular animation)
  - "Loading HR Leave Portal..." text
  - "Initializing application..." message below
  - If in Electron with API configured, shows API URL at bottom

**What's happening behind the scenes:**
- Database initialization
- Authentication check
- Session validation
- Connection to API server (if configured)

---

### 3. Landing Page (If Not Logged In)

If you're not authenticated, you'll see a beautiful landing page:

#### Header Section
- **Top Navigation:**
  - MOFA logo on the left
  - "HR Leave Portal" app name
  - "Sign In" button on the right

#### Main Content
- **Large Heading:** "Staff Management and Leave Portal"
- **Description:** Information about the platform for Ministry of Fisheries and Aquaculture

#### Features Section
- **Staff Management** - Comprehensive employee records and profiles
- **Leave Tracking** - Request, approve, and manage leave with ease
- **Administrator Privileges Only** - Admin, HR Officer, and Manager permissions
- **Real-Time Reports** - Instant insights into staffing and leave data

#### Statistics Cards (4 cards in a grid)
- 👥 **50+** Staff Members
- 📋 **20+** Leave Requests
- ✓ **100%** Uptime
- 🔧 **24/7** Support

#### Additional Information Cards
- **Secure Access** - Enterprise-grade security
- **Efficient Workflow** - Streamlined approval processes
- **Comprehensive Tracking** - Real-time monitoring

#### Footer
- Copyright notice for Ministry of Fisheries and Aquaculture

#### Call-to-Action
- Large "Get Started" button (same as Sign In)

**Design:** Gradient background (from primary via secondary to accent colors), modern glassmorphism effects

---

### 4. Login Form (After Clicking Sign In)

When you click "Sign In" or "Get Started", you'll see:
- Login form with:
  - Email/Username field
  - Password field
  - "Sign In" button
  - "Back" button to return to landing page

---

### 5. Portal/Dashboard (After Successful Login)

After logging in, you'll see a role-specific dashboard:

#### For Employees:
- Employee portal with leave request functionality
- Leave balance display
- Personal leave history

#### For Managers:
- Manager dashboard
- Team leave calendar
- Leave approval interface
- Team overview

#### For HR Officers:
- HR dashboard
- Staff management
- Leave management
- Reports and analytics

#### For Administrators:
- Admin portal
- Full system access
- User management
- System configuration

#### For Directors/Supervisors:
- Role-specific dashboards with appropriate permissions
- Team oversight
- Approval workflows

**Common Elements:**
- Header with user info and logout
- Navigation sidebar
- Main content area
- Responsive design

---

## First Run Behavior

On the **very first run** after installation:

1. **Database Creation:**
   - Creates encrypted database at: `%APPDATA%\hr-leave-portal\hr-portal-encrypted.db`
   - This may take a few seconds

2. **Bootstrap Process:**
   - Seeds initial data (leave types, holidays, etc.)
   - Creates bootstrap flag file: `.bootstrap-complete`
   - Sets up database schema

3. **Initialization Steps:**
   - All 15 initialization steps run (see `INITIALIZATION_CHECKLIST.md`)
   - Logs are created in: `%APPDATA%\hr-leave-portal\logs\`

---

## What to Check If Something Goes Wrong

### If the app doesn't start:
1. Check log files at: `%APPDATA%\hr-leave-portal\logs\app-YYYY-MM-DD.log`
2. Verify database file exists: `%APPDATA%\hr-leave-portal\hr-portal-encrypted.db`
3. Check bootstrap completion: `%APPDATA%\hr-leave-portal\.bootstrap-complete`

### If you see a blank screen:
- Check browser console (F12) for errors
- Verify API URL is configured correctly
- Check network connectivity

### If login doesn't work:
- Verify API server is accessible
- Check credentials are correct
- Review authentication logs

---

## Expected File Structure After First Run

```
%APPDATA%\hr-leave-portal\
├── hr-portal-encrypted.db          (Main database)
├── .bootstrap-complete              (Bootstrap flag)
├── window-state.json                (Window position/size)
├── logs\
│   └── app-YYYY-MM-DD.log          (Application logs)
└── backups\                         (Automatic backups)
    └── hr-portal-encrypted-*.db     (Backup files)
```

---

## Normal Startup Time

- **First Run:** 5-10 seconds (database creation + bootstrap)
- **Subsequent Runs:** 2-5 seconds (normal initialization)
- **With Slow Network:** May take longer if API server is remote

---

## Visual Summary

```
[App Launch]
    ↓
[Splash Screen] (2-3 sec)
    ↓
[Loading Screen] (1-5 sec)
    ↓
[Landing Page] OR [Portal] (if already logged in)
    ↓
[Login Form] (if clicked Sign In)
    ↓
[Portal/Dashboard] (after login)
```

---

## Troubleshooting

If you don't see the expected screens:

1. **No Splash Screen:** Normal in development mode, only shows in production builds
2. **Stuck on Loading:** Check logs for initialization errors
3. **Landing Page Not Showing:** May indicate authentication check is failing
4. **Blank Screen:** Check console for JavaScript errors

For detailed troubleshooting, see `electron/INITIALIZATION_CHECKLIST.md`.

