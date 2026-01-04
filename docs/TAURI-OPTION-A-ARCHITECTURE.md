# Tauri Option A Architecture: UI Only, Remote Backend

## Overview

This document describes **Option A** architecture for the Tauri desktop application, which is the **recommended enterprise approach** for Tauri + Next.js applications.

## Architecture

```
┌─────────────────────────────────────┐
│      Tauri Desktop App (UI Only)    │
│  ┌───────────────────────────────┐  │
│  │   Next.js Frontend (Static)   │  │
│  │   - React Components           │  │
│  │   - UI/UX Logic                │  │
│  │   - Local File Operations     │  │
│  └───────────────────────────────┘  │
│           │                          │
│           │ HTTP/HTTPS                │
│           ▼                          │
└─────────────────────────────────────┘
           │
           │ API Requests
           │ (All Data Operations)
           ▼
┌─────────────────────────────────────┐
│     Remote Backend Server          │
│  ┌───────────────────────────────┐  │
│  │   Next.js API Routes          │  │
│  │   - Authentication            │  │
│  │   - Business Logic            │  │
│  │   - Database Operations       │  │
│  │   - File Storage              │  │
│  └───────────────────────────────┘  │
│           │                          │
│           ▼                          │
│  ┌───────────────────────────────┐  │
│  │   PostgreSQL Database         │  │
│  │   (Neon/Cloud Database)       │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Key Principles

### ✅ What Tauri Does (UI Only)
- **Renders the UI**: Serves static Next.js build files locally
- **File System Operations**: Save/read user documents, exports, downloads
- **Window Management**: Native window controls, menus, dialogs
- **System Integration**: Notifications, system tray (if needed)
- **API Proxy**: Routes HTTP requests to remote server (handles CORS)

### ❌ What Tauri Does NOT Do (No Local Data)
- **No Local Database**: SQLite database is initialized but not used for data operations
- **No Offline Storage**: All data comes from remote API
- **No Sync Engine**: No local sync queue or conflict resolution
- **No Business Logic**: All business logic is on the remote server

### ✅ What Remote Backend Does
- **All Data Operations**: CRUD operations for employees, leave requests, etc.
- **Authentication**: User login, token management, session handling
- **Business Logic**: Leave approval workflows, calculations, validations
- **Database**: All data stored in PostgreSQL (Neon cloud database)
- **File Storage**: Document uploads, attachments stored on server

## Configuration

### Environment Variables

The Tauri app is configured via environment variables:

```bash
# .env file
NEXT_PUBLIC_API_URL=https://hr-leave-portal.vercel.app
```

The API base URL is set at Tauri startup from:
1. `NEXT_PUBLIC_API_URL` environment variable (highest priority)
2. `TAURI_API_URL` environment variable (fallback)
3. Default: `https://hr-leave-portal.vercel.app` (hardcoded fallback)

### Tauri Initialization

On startup, Tauri:
1. Reads API base URL from environment
2. Initializes `AppState` with the API URL
3. Logs the configuration:
   ```
   [Tauri] Initialized with API base URL: https://hr-leave-portal.vercel.app
   [Tauri] Architecture: Option A - UI only, remote backend
   ```

## API Communication

### Repository Commands

All repository commands (`repo_*`) route to the remote API instead of local database:

- `repo_employees_find_all` → `GET /api/employees`
- `repo_employees_find_by_staff_id` → `GET /api/employees/{id}`
- `repo_leave_requests_find_all` → `GET /api/leaves`
- `repo_leave_requests_create` → `POST /api/leaves`
- `repo_leave_balances_find_by_staff_id` → `GET /api/balances/{id}`
- `repo_sync_status` → `GET /api/sync/status`
- `repo_sync_trigger` → `POST /api/sync/trigger`

### Direct API Commands

The frontend can also use direct API commands for more control:

- `api_request(path, options)` - Generic HTTP request
- `api_login(email, password, apiBaseUrl)` - User authentication
- `api_logout()` - Clear authentication token
- `api_get_me()` - Get current user
- `api_has_token()` - Check if authenticated
- `api_refresh()` - Refresh authentication token

### Authentication Flow

1. User enters credentials in Tauri UI
2. Tauri calls `api_login(email, password, apiBaseUrl)`
3. Tauri makes HTTP POST to `/api/auth/login` on remote server
4. Server validates credentials and returns JWT token
5. Tauri stores token in `AppState` (in-memory)
6. All subsequent API requests include `Authorization: Bearer {token}` header

## File System Operations

Tauri still provides file system operations for UI-related tasks:

- `save_document(filename, contents)` - Save file to app data directory
- `read_document(filePath)` - Read file from path
- `get_documents_path()` - Get documents directory path
- `save_to_documents(filename, contents)` - Save to user's Documents folder
- `file_exists(filePath)` - Check if file exists
- `delete_file(filePath)` - Delete a file
- `list_files(directory)` - List files in directory

**Use Cases:**
- Exporting reports to PDF/Excel
- Saving downloaded documents
- User preferences/config files
- Temporary file storage

## Benefits of Option A

### ✅ Enterprise-Ready
- **Centralized Data**: Single source of truth on remote server
- **Security**: No sensitive data stored locally
- **Scalability**: Backend can scale independently
- **Updates**: Backend updates don't require app updates
- **Monitoring**: Centralized logging and analytics

### ✅ Simplified Architecture
- **No Sync Complexity**: No offline sync, conflict resolution, or queue management
- **No Local Database**: No SQLite migrations, schema management, or data corruption risks
- **Faster Development**: Focus on UI/UX, not data synchronization
- **Easier Testing**: Test backend and frontend independently

### ✅ Better User Experience
- **Always Up-to-Date**: Data is always fresh from server
- **Multi-Device**: Same data across all devices
- **Real-time**: Can implement real-time updates via WebSockets
- **Cloud Storage**: Files stored in cloud, accessible anywhere

## Limitations

### ⚠️ Requires Internet Connection
- App requires active internet connection
- No offline functionality
- Network errors must be handled gracefully

### ⚠️ API Dependency
- App depends on remote server availability
- Server downtime affects all users
- Need robust error handling and retry logic

## Migration from Offline-First

If migrating from an offline-first architecture:

1. **Remove Local Database Operations**: Repository commands now route to API
2. **Remove Sync Engine**: No local sync queue or conflict resolution
3. **Update Error Handling**: Handle network errors instead of sync errors
4. **Update UI**: Show loading states for API calls, handle offline gracefully

## Development Workflow

### Local Development

1. **Start Remote Backend**:
   ```bash
   npm run dev
   # Backend runs on http://localhost:3000
   ```

2. **Configure Tauri**:
   ```bash
   # Set API URL in .env
   NEXT_PUBLIC_API_URL=http://localhost:3000
   ```

3. **Start Tauri**:
   ```bash
   npm run tauri:dev
   # Tauri connects to local backend
   ```

### Production Build

1. **Build Static Frontend**:
   ```bash
   TAURI=1 npm run build:tauri
   # Generates static files in out/
   ```

2. **Build Tauri App**:
   ```bash
   npm run tauri:build
   # Creates desktop app with embedded static files
   ```

3. **Configure API URL**:
   - Set `NEXT_PUBLIC_API_URL` in environment before build
   - Or configure in Tauri backend to inject at runtime

## Best Practices

### ✅ Do
- Use `api_request` for all data operations
- Handle network errors gracefully
- Show loading states during API calls
- Cache API responses in React state (not local database)
- Use file system operations only for user documents

### ❌ Don't
- Don't use local database for data storage
- Don't implement offline sync or conflict resolution
- Don't cache sensitive data locally
- Don't store business logic in Tauri

## Comparison: Option A vs Option B

| Feature | Option A (UI Only) | Option B (Offline-First) |
|---------|-------------------|-------------------------|
| **Architecture** | Remote backend | Local database + sync |
| **Internet Required** | Yes | No (works offline) |
| **Complexity** | Low | High |
| **Data Freshness** | Always current | May be stale |
| **Sync Conflicts** | None | Need resolution |
| **Development Speed** | Fast | Slower |
| **Enterprise Ready** | ✅ Yes | ⚠️ Depends |
| **Use Case** | Always-online apps | Offline-capable apps |

## Conclusion

**Option A is the recommended approach** for enterprise Tauri + Next.js applications where:
- Users have reliable internet connections
- Data needs to be centralized and always up-to-date
- Development speed and simplicity are priorities
- Security and compliance require centralized data storage

This architecture provides a clean separation of concerns, easier maintenance, and better scalability compared to offline-first approaches.

---

**Last Updated:** 2024  
**Status:** ✅ Implemented and Active

