# Employee Dashboard Page & API Routes Analysis

## 📄 Employee Dashboard Overview

### Page Structure

**Route:** `/employee`  
**Page File:** `app/employee/page.tsx`  
**Portal Component:** `components/employee-portal.tsx`  
**Dashboard Component:** `components/employee-dashboard.tsx`

---

## 🏗️ Component Architecture

### 1. **Page Route** (`app/employee/page.tsx`)
```typescript
- Checks authentication via `/api/auth/me`
- Verifies user role is 'employee'
- Extracts staffId from user
- Renders EmployeePortal component
- Redirects to '/' if unauthorized
```

**Key Features:**
- ✅ Authentication check on mount
- ✅ Role-based access control
- ✅ Loading state while checking auth
- ✅ Suspense boundary for async operations

---

### 2. **Employee Portal** (`components/employee-portal.tsx`)
```typescript
- Manages tab navigation (dashboard, apply-leave, leave-balances, etc.)
- Uses useDataStore() hook for data management
- Uses useRealtime() hook for real-time updates
- Handles URL-based tab routing
- Renders different components based on active tab
```

**Tabs Available:**
- `dashboard` - Employee dashboard (default)
- `apply-leave` - Leave application form
- `leave-balances` - View all leave balances
- `leave-history` - View leave request history
- `notifications` - Notification center
- `profile` - Employee profile view
- `documents` - Employee documents

**Data Management:**
- Uses `useDataStore({ enablePolling: true, pollingInterval: 60000 })`
- Polls for updates every 60 seconds
- Listens to real-time events for balance updates

---

### 3. **Employee Dashboard** (`components/employee-dashboard.tsx`)
```typescript
- Displays personalized welcome message
- Shows 3 key metrics cards:
  1. Annual Leave Balance
  2. Pending Requests count
  3. Approved Leaves count
- Quick Actions section (3 buttons)
- Quick Info card (Staff ID, Department, Position, Status)
- Leave Balances card (all leave types)
- Leave Form dialog (opens when "Apply for Leave" clicked)
```

**UI Features:**
- ✅ Error state with retry button
- ✅ Loading state with spinner
- ✅ Empty state when staff not found
- ✅ Responsive grid layout
- ✅ Blue gradient theme

---

## 🔌 API Routes Used

### **Data Loading (via useDataStore)**

The employee dashboard **does NOT make direct API calls**. Instead, it uses the `useDataStore()` hook which fetches data from multiple API endpoints:

#### 1. **Staff Data**
```
GET /api/staff
```
- **Purpose:** Fetch all staff members
- **Used by:** Dashboard to find current employee's staff record
- **Filter:** Client-side filtering by `staffId`
- **Response:** Array of staff members
- **Access Control:** Employees can only see their own data (enforced by API)

**API Route:** `app/api/staff/route.ts`
```typescript
// Employee role restriction
if (user.role === 'employee' && user.staffId) {
  where.staffId = user.staffId  // Only their own record
}
```

---

#### 2. **Leave Requests**
```
GET /api/leaves
```
- **Purpose:** Fetch all leave requests
- **Used by:** Dashboard to show pending/approved counts
- **Filter:** Client-side filtering by `staffId` and `status`
- **Response:** Array of leave requests
- **Access Control:** Employees can only see their own leaves

**API Route:** `app/api/leaves/route.ts`
```typescript
// Employee role restriction
if (user.role === 'employee' && user.staffId) {
  where.staffId = user.staffId  // Only their own leaves
}
```

---

#### 3. **Leave Balances**
```
GET /api/balances
```
- **Purpose:** Fetch leave balances for all leave types
- **Used by:** Dashboard to display annual leave balance and all leave types
- **Filter:** Client-side filtering by `staffId`
- **Response:** Array of leave balance objects
- **Access Control:** Employees can only see their own balance

**API Route:** `app/api/balances/route.ts`
```typescript
// Employee role restriction
if (user.role === 'employee' && user.staffId) {
  where.staffId = user.staffId  // Only their own balance
}
```

---

### **Additional API Routes (Used by Other Tabs)**

#### 4. **Authentication**
```
GET /api/auth/me
```
- **Purpose:** Get current user information
- **Used by:** Page route to verify authentication
- **Response:** User object with role, staffId, etc.

#### 5. **Create Leave Request** (when applying for leave)
```
POST /api/leaves
```
- **Purpose:** Submit new leave request
- **Used by:** Leave form component
- **Body:** Leave request data (leaveType, startDate, endDate, reason, etc.)

#### 6. **Notifications**
```
GET /api/notifications
```
- **Purpose:** Fetch user notifications
- **Used by:** Notification center tab
- **Response:** Array of notifications

---

## 📊 Data Flow

### **Initial Load:**
```
1. User navigates to /employee
2. Page checks authentication (GET /api/auth/me)
3. If authenticated, EmployeePortal mounts
4. useDataStore() hook initializes and fetches:
   - GET /api/staff
   - GET /api/leaves
   - GET /api/balances
   - GET /api/payslips
   - GET /api/performance-reviews
   - GET /api/leave-policies
   - GET /api/holidays
   - GET /api/leave-templates
   - GET /api/audit-logs
5. Data is stored in React state via useDataStore
6. EmployeeDashboard receives store as prop
7. Dashboard filters data by staffId:
   - store.staff.find(s => s.staffId === staffId)
   - store.balances.find(b => b.staffId === staffId)
   - store.leaves.filter(l => l.staffId === staffId)
8. Dashboard renders with filtered data
```

### **Real-Time Updates:**
```
1. useRealtime() hook connects to /api/realtime (SSE)
2. Server sends events when data changes:
   - 'balance-updated' - Triggers store.refreshCritical()
   - 'notification' - Updates notification center
3. Polling every 60 seconds for critical data:
   - GET /api/leaves
   - GET /api/balances
```

---

## 🎨 Dashboard UI Components

### **1. Welcome Section**
- Personalized greeting: "Welcome, {firstName}!"
- Subtitle: "Your personal dashboard"

### **2. Metrics Cards (3 cards)**
- **Annual Leave Balance:** Shows remaining annual leave days
- **Pending Requests:** Count of pending leave requests
- **Approved Leaves:** Count of approved leaves this year

### **3. Quick Actions (3 buttons)**
- **Apply for Leave:** Opens leave form dialog
- **View Leave History:** Navigates to leave-history tab
- **View Leave Balances:** Navigates to leave-balances tab

### **4. Quick Info Card**
- Staff ID
- Department
- Position
- Status (Active/Inactive badge)

### **5. Leave Balances Card**
- All leave types with remaining days:
  - Annual
  - Sick
  - Special Service
  - Training
  - Study
  - Maternity
  - Paternity
  - Compassionate

---

## 🔒 Security & Access Control

### **API-Level Security:**
- ✅ All API routes use `withAuth()` middleware
- ✅ Employee role can only access their own data
- ✅ Staff API filters by `staffId` for employees
- ✅ Leaves API filters by `staffId` for employees
- ✅ Balances API filters by `staffId` for employees

### **Client-Level Security:**
- ✅ Page route checks authentication before rendering
- ✅ Redirects to '/' if not authenticated
- ✅ Redirects to '/' if role is not 'employee'
- ✅ Requires `staffId` to render portal

---

## 🐛 Error Handling

### **Error States:**
1. **API Error:** Shows error message with retry button
2. **Loading State:** Shows spinner while fetching
3. **Staff Not Found:** Shows warning with refresh button

### **Error Recovery:**
- Retry button calls `store.refresh()`
- Refresh button calls `store.refresh()`
- All errors are logged to console with `[ComponentName]` prefix

---

## 📝 Code Example

### **How Dashboard Gets Data:**
```typescript
// In employee-portal.tsx
const store = useDataStore({ enablePolling: true, pollingInterval: 60000 })

// In employee-dashboard.tsx
const staff = store.staff.find((s: any) => s.staffId === staffId)
const balance = store.balances.find((b: any) => b.staffId === staffId)
const myLeaves = store.leaves.filter((l: any) => l.staffId === staffId)
const pendingLeaves = myLeaves.filter((l: any) => l.status === 'pending').length
const approvedLeaves = myLeaves.filter((l: any) => l.status === 'approved').length
```

### **API Calls Made by useDataStore:**
```typescript
// In lib/data-store.ts
const [staffRes, leavesRes, balancesRes, ...] = await Promise.all([
  apiRequest('/api/staff'),      // Gets all staff (filtered by API for employees)
  apiRequest('/api/leaves'),     // Gets all leaves (filtered by API for employees)
  apiRequest('/api/balances'),   // Gets all balances (filtered by API for employees)
  // ... other endpoints
])
```

---

## ✅ Summary

### **Employee Dashboard:**
- ✅ Uses centralized data store (`useDataStore`)
- ✅ No direct API calls in dashboard component
- ✅ All data filtered client-side by `staffId`
- ✅ Real-time updates via SSE and polling
- ✅ Proper error handling and loading states
- ✅ Secure API access with role-based filtering

### **API Routes:**
- ✅ `/api/staff` - Staff data (filtered by API)
- ✅ `/api/leaves` - Leave requests (filtered by API)
- ✅ `/api/balances` - Leave balances (filtered by API)
- ✅ `/api/auth/me` - Authentication check
- ✅ All routes properly secured with `withAuth()`

### **Status:** ✅ **FULLY FUNCTIONAL AND SECURE**

