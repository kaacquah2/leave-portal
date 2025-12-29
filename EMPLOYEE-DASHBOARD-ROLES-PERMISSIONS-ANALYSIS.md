# Employee Dashboard: Roles, Permissions & Implementation Analysis

## 📋 Executive Summary

The employee dashboard **IS implemented** with all features, but there's a **critical gap**: **Frontend components are NOT using permission checks** to conditionally show/hide features based on user roles. This means:

- ✅ All features exist in the codebase
- ✅ API routes properly enforce permissions
- ❌ Frontend doesn't check permissions before showing features
- ❌ Features may appear but fail when used (if user lacks permission)

---

## 🏗️ Architecture Overview

### **1. Employee Dashboard Structure**

```
app/employee/page.tsx
  └── components/employee-portal.tsx
      ├── components/employee-dashboard.tsx (Main dashboard)
      ├── components/employee-navigation.tsx (Sidebar navigation)
      ├── components/employee-leave-balances.tsx
      ├── components/employee-leave-history.tsx
      ├── components/leave-form.tsx
      ├── components/employee-profile-view.tsx
      ├── components/employee-documents.tsx
      └── components/notification-center.tsx
```

### **2. Data Flow**

```
User Login → Authentication Check → Role Verification → Dashboard Load
                                                              ↓
                                    useDataStore() Hook
                                    (Fetches all data)
                                                              ↓
                                    API Routes (withAuth)
                                    (Enforces permissions)
                                                              ↓
                                    Frontend Components
                                    (Displays data - NO permission checks!)
```

---

## 👥 Roles & Their Functions

### **1. Employee Role** (`employee`)

**Permissions Defined:**
```typescript
employee: [
  'employee:self:view',           // View own profile
  'employee:self:update',          // Update own profile
  'employee:leave:view:own',      // View own leave requests
  'employee:leave:create:own',    // Create own leave requests
  'employee:payslip:view:own',   // View own payslips
  'employee:performance:view:own', // View own performance reviews
]
```

**Functions Available:**
- ✅ View personal dashboard
- ✅ Apply for leave
- ✅ View leave balances
- ✅ View leave history
- ✅ View profile
- ✅ View documents
- ✅ View notifications
- ✅ View payslips (if implemented)
- ✅ View performance reviews (if implemented)

**API Enforcement:**
- ✅ `/api/staff` - Only returns employee's own record
- ✅ `/api/leaves` - Only returns employee's own leaves
- ✅ `/api/balances` - Only returns employee's own balance
- ✅ `/api/payslips` - Only returns employee's own payslips (if implemented)
- ✅ `/api/performance-reviews` - Only returns employee's own reviews (if implemented)

**Frontend Implementation:**
- ✅ Dashboard shows all features (no permission checks)
- ✅ All tabs accessible (no permission checks)
- ❌ **MISSING**: Permission checks to hide features user can't access

---

### **2. Manager Role** (`manager`)

**Permissions Defined:**
```typescript
manager: [
  'employee:view:team',           // View team members
  'leave:view:team',              // View team leave requests
  'leave:approve:team',           // Approve team leave requests
  'performance:view:team',        // View team performance
  'performance:review:team',      // Review team performance
  'attendance:view:team',         // View team attendance
  'reports:team:view',            // View team reports
  // ... more team-level permissions
]
```

**Functions Available:**
- ✅ View team dashboard
- ✅ Approve/reject team leave requests
- ✅ View team leave calendar
- ✅ View team reports
- ✅ View team performance reviews

---

### **3. HR Officer Role** (`hr`)

**Permissions Defined:**
```typescript
hr: [
  'employee:create',              // Create employee profiles
  'employee:update',              // Update employee profiles
  'employee:view:all',            // View all employees
  'employee:delete',              // Delete employees
  'employee:salary:edit',         // Edit salaries
  'leave:approve:all',            // Approve all leave requests
  'leave:policy:manage',          // Manage leave policies
  'performance:view:all',         // View all performance reviews
  // ... more HR permissions
]
```

**Functions Available:**
- ✅ Full staff management
- ✅ Leave policy management
- ✅ Approve/reject all leave requests
- ✅ View all reports
- ✅ Manage holidays
- ✅ Manage leave templates

---

### **4. HR Assistant Role** (`hr_assistant`)

**Permissions Defined:**
```typescript
hr_assistant: [
  'employee:view:all',            // View all employees
  'employee:update',              // Update basic info (not salary)
  'employee:documents:upload',    // Upload documents
  'leave:view:all',               // View all leave requests
  'leave:create',                 // Create leave requests on behalf
  'performance:view:all',         // View all performance reviews
  // Limited permissions - cannot delete, terminate, or manage policies
]
```

**Functions Available:**
- ✅ View all employees
- ✅ Update basic employee info
- ✅ Upload documents
- ✅ View all leave requests
- ✅ Create leave requests on behalf of staff
- ❌ Cannot delete employees
- ❌ Cannot terminate employees
- ❌ Cannot manage leave policies

---

### **5. Deputy Director Role** (`deputy_director`)

**Permissions Defined:**
```typescript
deputy_director: [
  'employee:view:team',           // View directorate employees
  'leave:view:team',              // View directorate leaves
  'leave:approve:team',           // Approve directorate leaves
  'performance:view:team',         // View directorate performance
  // Similar to manager but at directorate level
]
```

**Functions Available:**
- ✅ View directorate dashboard
- ✅ Approve/reject directorate leave requests
- ✅ View directorate reports
- ✅ View directorate performance reviews

---

### **6. System Admin Role** (`admin`)

**Permissions Defined:**
```typescript
admin: [
  'system:config:manage',         // Manage system configuration
  'system:users:manage',          // Manage user accounts
  'system:roles:assign',          // Assign roles
  'employee:view:all',            // View all employees
  'employee:create',              // Create employees
  'employee:delete',              // Delete employees
  // Full system access
]
```

**Functions Available:**
- ✅ Full system administration
- ✅ User management
- ✅ Role assignment
- ✅ System configuration
- ✅ All HR functions
- ✅ All manager functions

---

## 🔒 Permission System Implementation

### **1. Permission Definitions** (`lib/permissions.ts`)

**Structure:**
```typescript
export type Permission = 
  | 'employee:self:view'
  | 'employee:leave:create:own'
  | 'employee:payslip:view:own'
  // ... more permissions

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  employee: [
    'employee:self:view',
    'employee:leave:create:own',
    // ...
  ],
  // ... other roles
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}
```

**Status:** ✅ **FULLY IMPLEMENTED**

---

### **2. API Route Permission Enforcement**

**Example: `/api/staff/route.ts`**
```typescript
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  let where: any = {}
  
  // Employees can only view their own record
  if (user.role === 'employee' && user.staffId) {
    where.staffId = user.staffId
  }
  // HR, admin see all (no where clause)
  
  const staff = await prisma.staffMember.findMany({ where })
  return NextResponse.json(staff)
}, { allowedRoles: ['hr', 'hr_assistant', 'admin', 'employee', 'manager', 'deputy_director'] })
```

**Status:** ✅ **FULLY IMPLEMENTED** - All API routes enforce permissions

---

### **3. Frontend Permission Checks**

**Current State:**
```typescript
// ❌ MISSING in employee-dashboard.tsx
// ❌ MISSING in employee-portal.tsx
// ❌ MISSING in employee-navigation.tsx

// Should be:
import { hasPermission, PermissionChecks } from '@/lib/permissions'

const canViewPayslips = PermissionChecks.canViewPayslips(userRole)
const canViewPerformance = PermissionChecks.canViewPerformance(userRole)

// Then conditionally render:
{canViewPayslips && <PayslipsTab />}
```

**Status:** ❌ **NOT IMPLEMENTED** - Frontend doesn't check permissions

---

## 🐛 Why Features Appear "Missing"

### **Problem 1: No Permission Checks in Frontend**

**Current Code:**
```typescript
// components/employee-dashboard.tsx
export default function EmployeeDashboard({ store, staffId, onNavigate }) {
  // ❌ No permission checks
  // ❌ Shows all features regardless of role
  // ❌ Features may fail when clicked if user lacks permission
}
```

**What Should Happen:**
```typescript
// components/employee-dashboard.tsx
export default function EmployeeDashboard({ store, staffId, onNavigate, userRole }) {
  const canViewPayslips = hasPermission(userRole, 'employee:payslip:view:own')
  const canViewPerformance = hasPermission(userRole, 'employee:performance:view:own')
  
  return (
    <>
      {/* Always visible */}
      <LeaveBalanceCard />
      <LeaveHistoryCard />
      
      {/* Conditionally visible */}
      {canViewPayslips && <PayslipsCard />}
      {canViewPerformance && <PerformanceCard />}
    </>
  )
}
```

---

### **Problem 2: Navigation Shows All Tabs**

**Current Code:**
```typescript
// components/employee-navigation.tsx
const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'apply-leave', label: 'Apply for Leave', icon: Plus },
  { id: 'leave-balances', label: 'Leave Balances', icon: Calendar },
  { id: 'leave-history', label: 'Leave History', icon: Calendar },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'profile', label: 'View Profile', icon: User },
  { id: 'documents', label: 'My Documents', icon: FileText },
  // ❌ All tabs shown regardless of permissions
]
```

**What Should Happen:**
```typescript
// components/employee-navigation.tsx
const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'employee:self:view' },
  { id: 'apply-leave', label: 'Apply for Leave', icon: Plus, permission: 'employee:leave:create:own' },
  { id: 'payslips', label: 'Payslips', icon: DollarSign, permission: 'employee:payslip:view:own' },
  // ... filter based on permissions
].filter(item => !item.permission || hasPermission(userRole, item.permission))
```

---

### **Problem 3: API Calls May Fail Silently**

**Current Behavior:**
```typescript
// lib/data-store.ts
const payslipsRes = await apiRequest('/api/payslips')
  .then(res => {
    // Silently handles 404s and 403s
    if (res.status === 404 || res.status === 403) {
      return { ok: false, status: res.status }
    }
    return res
  })
```

**Issue:** Frontend doesn't know if feature is unavailable due to permissions or missing endpoint.

---

## ✅ What's Working

1. ✅ **Authentication** - Properly checks user authentication
2. ✅ **Role Verification** - Verifies user role before allowing access
3. ✅ **API Permission Enforcement** - All API routes enforce permissions
4. ✅ **Data Filtering** - API filters data based on role
5. ✅ **UI Components** - All dashboard components exist and render
6. ✅ **Data Store** - Centralized data management with polling
7. ✅ **Real-time Updates** - SSE for real-time balance updates

---

## ❌ What's Missing

1. ❌ **Frontend Permission Checks** - Components don't check permissions before rendering
2. ❌ **Conditional Feature Rendering** - All features shown regardless of permissions
3. ❌ **Permission-Based Navigation** - Navigation shows all tabs regardless of access
4. ❌ **User Role Context** - Components don't receive user role as prop
5. ❌ **Permission Helper Components** - No wrapper components for permission checks
6. ❌ **Error Handling for Permission Denied** - No user-friendly messages when permission denied

---

## 🔧 Recommended Fixes

### **Fix 1: Add Permission Checks to Components**

```typescript
// components/employee-dashboard.tsx
import { hasPermission, type UserRole } from '@/lib/permissions'

interface EmployeeDashboardProps {
  store: ReturnType<typeof useDataStore>
  staffId: string
  userRole: UserRole  // ← Add this
  onNavigate?: (tab: string) => void
}

export default function EmployeeDashboard({ store, staffId, userRole, onNavigate }) {
  const canViewPayslips = hasPermission(userRole, 'employee:payslip:view:own')
  const canViewPerformance = hasPermission(userRole, 'employee:performance:view:own')
  
  return (
    <>
      {/* Existing features */}
      <LeaveBalanceCard />
      <LeaveHistoryCard />
      
      {/* Conditionally show based on permissions */}
      {canViewPayslips && (
        <Card>
          <CardHeader>
            <CardTitle>Payslips</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Payslip content */}
          </CardContent>
        </Card>
      )}
    </>
  )
}
```

### **Fix 2: Filter Navigation Based on Permissions**

```typescript
// components/employee-navigation.tsx
import { hasPermission, type UserRole } from '@/lib/permissions'

interface EmployeeNavigationProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  userRole: UserRole  // ← Add this
  onLogout?: () => void
}

export default function EmployeeNavigation({ activeTab, setActiveTab, userRole, onLogout }) {
  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'employee:self:view' },
    { id: 'apply-leave', label: 'Apply for Leave', icon: Plus, permission: 'employee:leave:create:own' },
    { id: 'leave-balances', label: 'Leave Balances', icon: Calendar, permission: 'employee:leave:view:own' },
    { id: 'leave-history', label: 'Leave History', icon: Calendar, permission: 'employee:leave:view:own' },
    { id: 'payslips', label: 'Payslips', icon: DollarSign, permission: 'employee:payslip:view:own' },
    { id: 'performance', label: 'Performance', icon: TrendingUp, permission: 'employee:performance:view:own' },
    { id: 'notifications', label: 'Notifications', icon: Bell, permission: 'employee:self:view' },
    { id: 'profile', label: 'View Profile', icon: User, permission: 'employee:self:view' },
    { id: 'documents', label: 'My Documents', icon: FileText, permission: 'employee:self:view' },
  ]
  
  // Filter based on permissions
  const navItems = allNavItems.filter(item => 
    !item.permission || hasPermission(userRole, item.permission)
  )
  
  // Render navigation...
}
```

### **Fix 3: Pass User Role to Components**

```typescript
// components/employee-portal.tsx
export default function EmployeePortal({ staffId, userRole, onLogout }: EmployeePortalProps) {
  // Get user role from auth context or pass as prop
  
  return (
    <>
      <EmployeeNavigation 
        activeTab={activeTab} 
        setActiveTab={handleTabChange} 
        userRole={userRole}  // ← Pass role
        onLogout={onLogout} 
      />
      <EmployeeDashboard 
        store={store} 
        staffId={staffId} 
        userRole={userRole}  // ← Pass role
        onNavigate={handleTabChange} 
      />
    </>
  )
}
```

### **Fix 4: Create Permission Wrapper Component**

```typescript
// components/permission-gate.tsx
import { hasPermission, type UserRole, type Permission } from '@/lib/permissions'

interface PermissionGateProps {
  role: UserRole
  permission: Permission
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function PermissionGate({ role, permission, children, fallback = null }: PermissionGateProps) {
  if (hasPermission(role, permission)) {
    return <>{children}</>
  }
  return <>{fallback}</>
}

// Usage:
<PermissionGate role={userRole} permission="employee:payslip:view:own">
  <PayslipsCard />
</PermissionGate>
```

---

## 📊 Summary Table

| Component | Permission Checks | Status |
|-----------|------------------|--------|
| `employee-dashboard.tsx` | ❌ Missing | Needs Fix |
| `employee-portal.tsx` | ❌ Missing | Needs Fix |
| `employee-navigation.tsx` | ❌ Missing | Needs Fix |
| `employee-leave-balances.tsx` | ❌ Missing | Needs Fix |
| `employee-leave-history.tsx` | ❌ Missing | Needs Fix |
| `leave-form.tsx` | ❌ Missing | Needs Fix |
| API Routes | ✅ Implemented | Working |
| Permission System | ✅ Implemented | Working |

---

## 🎯 Conclusion

**The employee dashboard IS fully implemented**, but **frontend components are not using permission checks**. This means:

1. ✅ All features exist in the code
2. ✅ API routes properly enforce permissions
3. ❌ Frontend shows all features regardless of permissions
4. ❌ Features may fail when used if user lacks permission

**To Fix:**
1. Add `userRole` prop to all employee components
2. Import permission checking functions
3. Conditionally render features based on permissions
4. Filter navigation items based on permissions
5. Add user-friendly error messages for permission denied

**The system is secure at the API level, but the UX is confusing because features appear available when they may not be accessible.**

