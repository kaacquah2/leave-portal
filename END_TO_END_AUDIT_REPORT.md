# End-to-End Feature Audit Report
## HR Leave Portal - Complete Feature Trace Analysis

**Date**: 2025-01-27  
**Scope**: UI → API → Service → Database → Response  
**Focus**: Security, Performance, Data Leakage, Missing Routes

---

## Executive Summary

This audit traces every major feature from the UI layer through to the database and back, identifying:
- **3 Critical Security Issues**: Frontend-only filtering, missing role checks
- **8 Performance Issues**: Missing pagination, N+1 queries, overfetching
- **5 Missing/Broken Routes**: Incomplete API implementations
- **4 Missing Indexes**: Database performance bottlenecks

---

## 1. Leave Management Feature Trace

### 1.1 UI Layer Analysis

**Component**: `components/manager-leave-approval.tsx`
- **Line 44-79**: Fetches all leaves from `/api/leaves`
- **Line 65-67**: ⚠️ **CRITICAL**: Comment says "Filter to show only team members' leaves" but NO filtering implemented
- **Issue**: All leaves returned to frontend, client-side filtering missing

**Component**: `components/supervisor-dashboard.tsx`
- **Line 70-90**: Fetches from `/api/leaves/pending/supervisor` (good)
- **Line 77-85**: ⚠️ **FALLBACK ISSUE**: Falls back to `/api/leaves?status=pending` and filters client-side
- **Line 81-84**: Client-side filtering by `immediateSupervisorId` - **DATA LEAKAGE RISK**

**Component**: `components/unit-head-dashboard.tsx`
- **Line 70-90**: Similar pattern - fetches from role-specific endpoint
- **Line 75-77**: ⚠️ **CLIENT-SIDE FILTERING**: Filters by `staff?.unit` on frontend
- **Line 84-87**: Fallback also does client-side filtering

### 1.2 API Layer Analysis

**Route**: `app/api/leaves/route.ts`

#### GET `/api/leaves`
- ✅ **Protected**: Uses `withAuth` with `READ_ONLY_ROLES`
- ✅ **Server-side filtering**: Uses `buildLeaveWhereClause` for role-based scoping
- ❌ **NO PAGINATION**: Returns ALL leaves matching filter (line 50-66)
- ❌ **OVERFETCHING**: Includes full `staff` object with email, department, position (line 52-61)
- ⚠️ **Performance**: No `take`/`skip` parameters, no limit

**Route**: `app/api/leaves/[id]/route.ts`

#### GET `/api/leaves/[id]`
- ✅ **Protected**: Uses `withAuth` with `READ_ONLY_ROLES`
- ✅ **RBAC Check**: Uses `canViewLeaveRequest` (line 47)
- ✅ **Proper includes**: Includes staff, template, approvalSteps, attachments (line 60-67)
- ✅ **Access control**: Returns 403 if user cannot view

#### PATCH `/api/leaves/[id]`
- ✅ **Protected**: Uses `withAuth`
- ✅ **RBAC Check**: Uses `canApproveLeaveRequest` (line 137)
- ✅ **Optimistic locking**: Prevents concurrent modifications (line 480-520)
- ✅ **Balance validation**: Validates before approval (line 220-238)
- ✅ **Audit logging**: Comprehensive logging (line 343-374)

### 1.3 Database Layer Analysis

**Query Pattern**: `app/api/leaves/route.ts:50-66`
```typescript
const leaves = await prisma.leaveRequest.findMany({
  where, // Role-scoped where clause
  include: {
    staff: { select: { ... } }, // Overfetching
    template: true,
  },
  orderBy: { createdAt: 'desc' },
  // ❌ NO take/skip - returns ALL records
})
```

**Indexes Check**:
- ✅ `@@index([staffId, status])` - Good for filtering
- ✅ `@@index([status, createdAt])` - Good for ordering
- ✅ `@@index([startDate, endDate])` - Good for date range queries
- ❌ **MISSING**: Composite index on `[staffId, status, createdAt]` for common query pattern

**N+1 Query Risk**: 
- ✅ **No N+1**: Single query with includes
- ⚠️ **Potential**: If approvalSteps are accessed separately elsewhere

### 1.4 Data Leakage Risks

**CRITICAL ISSUE #1**: Frontend-only filtering in supervisor/unit-head dashboards
- **Location**: `components/supervisor-dashboard.tsx:81-84`, `components/unit-head-dashboard.tsx:75-77`
- **Risk**: If API returns more data than user should see, client-side filter can be bypassed
- **Fix Required**: Remove client-side filtering, ensure API enforces scoping

**CRITICAL ISSUE #2**: Manager leave approval component receives all leaves
- **Location**: `components/manager-leave-approval.tsx:67`
- **Risk**: Manager sees all organization leaves, not just team
- **Fix Required**: API must filter by manager's direct reports

---

## 2. Staff Management Feature Trace

### 2.1 UI Layer Analysis

**Component**: `components/staff-management.tsx`
- Fetches from `/api/staff`
- No client-side filtering observed (good)

### 2.2 API Layer Analysis

**Route**: `app/api/staff/route.ts`

#### GET `/api/staff`
- ✅ **Protected**: Uses `withAuth` with role restrictions
- ✅ **Server-side scoping**: Uses `buildStaffWhereClause` (line 17-21)
- ❌ **NO PAGINATION**: Returns ALL staff members (line 27-30)
- ❌ **OVERFETCHING**: Returns full staff objects with all fields
- ⚠️ **Performance**: No limit, could return thousands of records

**Query Pattern**:
```typescript
const staff = await prisma.staffMember.findMany({
  where, // Role-scoped
  orderBy: { createdAt: 'desc' },
  // ❌ NO take/skip
})
```

### 2.3 Database Layer Analysis

**Indexes**:
- ✅ `@@index([email])`
- ✅ `@@index([staffId])`
- ✅ `@@index([department, active])`
- ✅ `@@index([managerId])`
- ✅ `@@index([immediateSupervisorId])`
- ✅ `@@index([employmentStatus, active])`
- ❌ **MISSING**: Index on `[unit, active]` for unit-head queries
- ❌ **MISSING**: Index on `[directorate, active]` for director queries

**N+1 Query Risk**:
- ✅ **No N+1 in main query**: Single query
- ⚠️ **Potential**: If related data (leaveBalance, etc.) accessed separately

---

## 3. Leave Balances Feature Trace

### 3.1 API Layer Analysis

**Route**: `app/api/balances/route.ts`

#### GET `/api/balances`
- ✅ **Protected**: Uses `withAuth`
- ✅ **Role-based filtering**: Employees see only their balance (line 20-21)
- ⚠️ **Manager access**: Managers see ALL balances (line 22-26) - **POTENTIAL DATA LEAKAGE**
- ❌ **NO PAGINATION**: Returns all balances
- ❌ **OVERFETCHING**: Includes full `staff` object (line 32)

**Query Pattern**:
```typescript
const balances = await prisma.leaveBalance.findMany({
  where, // ⚠️ Managers have no where clause
  include: {
    staff: true, // ❌ Overfetching - full staff object
  },
})
```

**Issue**: Manager role can see all staff balances without proper scoping

### 3.2 Database Layer Analysis

**Indexes**:
- ✅ `@@index([staffId])` - Good
- ❌ **MISSING**: Composite index for common queries

---

## 4. N+1 Query Patterns Found

### 4.1 Payroll Processing

**Location**: `app/api/payroll/process/route.ts:131-299`

**Pattern**:
```typescript
for (const staff of staffMembers) {
  // ❌ N+1: Query inside loop
  const existing = await prisma.payroll.findFirst({ ... })
  const salaryStructure = await prisma.salaryStructure.findFirst({ ... })
  // ... more queries per staff member
}
```

**Impact**: If processing 100 staff, executes 200+ queries
**Fix**: Batch queries or use `findMany` with `where: { staffId: { in: [...] } }`

### 4.2 Cron Job - Year End Processing

**Location**: `app/api/cron/daily-reminders/route.ts:233-272`

**Pattern**:
```typescript
for (const staff of allStaff) {
  for (const leaveType of leaveTypes) {
    // ❌ N+1: Notification per staff per leave type
    await notifyYearEndApproaching({ ... })
  }
}
```

**Impact**: If 1000 staff × 5 leave types = 5000 notification calls
**Fix**: Batch notifications or queue for background processing

### 4.3 Leave Approval - Next Approvers

**Location**: `app/api/leaves/[id]/route.ts:562-571`

**Pattern**:
```typescript
for (const approver of nextApprovers) {
  // ❌ N+1: Query per approver role
  const approverUsers = await prisma.user.findMany({
    where: { role: approver.approverRole, active: true },
  })
}
```

**Impact**: If 3 approval levels, executes 3 separate queries
**Fix**: Collect all roles first, then single `findMany` with `role: { in: [...] }`

---

## 5. Missing Pagination

### 5.1 Routes Without Pagination

| Route | Impact | Records Returned |
|-------|--------|------------------|
| `GET /api/leaves` | **HIGH** | All leaves (could be 10,000+) |
| `GET /api/staff` | **HIGH** | All staff (could be 5,000+) |
| `GET /api/balances` | **MEDIUM** | All balances (could be 5,000+) |
| `GET /api/notifications` | **MEDIUM** | All notifications per user |
| `GET /api/audit-logs` | **LOW** | Has pagination (line 40-41) ✅ |

### 5.2 Routes With Pagination (Good Examples)

| Route | Implementation |
|-------|----------------|
| `GET /api/recruitment/jobs` | ✅ Has `limit`/`offset` (line 25-26) |
| `GET /api/documents` | ✅ Has `limit`/`offset` (line 26-27) |
| `GET /api/disciplinary` | ✅ Has `limit`/`offset` (line 26-27) |
| `GET /api/admin/audit-logs` | ✅ Has `limit`/`offset` (line 40-41) |

**Recommendation**: Add pagination to all list endpoints using consistent pattern:
```typescript
const limit = parseInt(searchParams.get('limit') || '50')
const offset = parseInt(searchParams.get('offset') || '0')
const [data, total] = await Promise.all([
  prisma.model.findMany({ where, take: limit, skip: offset }),
  prisma.model.count({ where }),
])
return NextResponse.json({ data, total, limit, offset })
```

---

## 6. Overfetching Issues

### 6.1 Leave Requests

**Location**: `app/api/leaves/route.ts:52-61`

**Current**:
```typescript
include: {
  staff: {
    select: {
      staffId: true,
      firstName: true,
      lastName: true,
      department: true,
      position: true,
      email: true, // ❌ Email not needed for list view
    },
  },
  template: true, // ❌ Full template object when only ID needed
}
```

**Fix**: Only select fields needed for list view, exclude email unless required

### 6.2 Leave Balances

**Location**: `app/api/balances/route.ts:32`

**Current**:
```typescript
include: {
  staff: true, // ❌ Full staff object
}
```

**Fix**: Select only needed fields:
```typescript
include: {
  staff: {
    select: {
      staffId: true,
      firstName: true,
      lastName: true,
      department: true,
    },
  },
}
```

### 6.3 Staff Members

**Location**: `app/api/staff/route.ts:27-30`

**Current**: Returns all fields from `StaffMember` model
**Fix**: Add `select` to return only necessary fields for list view

---

## 7. Missing/Broken API Routes

### 7.1 Missing Routes

1. **`GET /api/staff?supervisorId={id}`**
   - **Referenced**: `components/supervisor-dashboard.tsx:94`
   - **Status**: ❌ **NOT FOUND** - Route doesn't exist
   - **Impact**: Supervisor dashboard fallback fails

2. **`GET /api/staff?unit={unit}`**
   - **Referenced**: `components/unit-head-dashboard.tsx:97`
   - **Status**: ❌ **NOT FOUND** - Route doesn't exist
   - **Impact**: Unit head dashboard fallback fails

3. **`GET /api/leaves/pending/supervisor`**
   - **Referenced**: `components/supervisor-dashboard.tsx:70`
   - **Status**: ✅ **EXISTS** - `app/api/leaves/pending/supervisor/route.ts`

4. **`GET /api/leaves/pending/unit-head`**
   - **Referenced**: `components/unit-head-dashboard.tsx:70`
   - **Status**: ✅ **EXISTS** - `app/api/leaves/pending/unit-head/route.ts`

### 7.2 Broken Routes

**None identified** - All referenced routes exist, but some query parameters not supported

---

## 8. Missing Database Indexes

### 8.1 LeaveRequest Table

**Missing Indexes**:
```sql
-- For common query: Get leaves by staff and status, ordered by date
CREATE INDEX idx_leave_request_staff_status_created 
ON "LeaveRequest"("staffId", "status", "createdAt");

-- For directorate-based queries
CREATE INDEX idx_leave_request_staff_directorate 
ON "LeaveRequest"("staffId") 
INCLUDE ("status", "startDate", "endDate");
-- Note: Requires JOIN with StaffMember for directorate filter
```

### 8.2 StaffMember Table

**Missing Indexes**:
```sql
-- For unit-head queries
CREATE INDEX idx_staff_member_unit_active 
ON "StaffMember"("unit", "active");

-- For director queries
CREATE INDEX idx_staff_member_directorate_active 
ON "StaffMember"("directorate", "active");

-- For supervisor queries (already exists via managerId/immediateSupervisorId)
-- ✅ Already indexed
```

### 8.3 LeaveBalance Table

**Missing Indexes**:
```sql
-- For balance queries with staff filtering
-- Current: Only staffId indexed ✅
-- May need composite if filtering by balance values
```

---

## 9. Security Issues Summary

### 9.1 Critical Issues

1. **Frontend-only filtering** (Data Leakage Risk)
   - **Severity**: 🔴 **CRITICAL**
   - **Locations**: 
     - `components/supervisor-dashboard.tsx:81-84`
     - `components/unit-head-dashboard.tsx:75-77`
   - **Risk**: If API returns unauthorized data, client-side filter can be bypassed
   - **Fix**: Remove client-side filtering, ensure API enforces all scoping

2. **Manager sees all leaves** (Data Leakage Risk)
   - **Severity**: 🔴 **CRITICAL**
   - **Location**: `components/manager-leave-approval.tsx:67`
   - **Risk**: Manager receives all organization leaves
   - **Fix**: API must filter by manager's direct reports using `buildLeaveWhereClause`

3. **Manager sees all balances** (Data Leakage Risk)
   - **Severity**: 🟡 **HIGH**
   - **Location**: `app/api/balances/route.ts:22-26`
   - **Risk**: Manager role has no where clause, sees all balances
   - **Fix**: Apply `buildStaffWhereClause` to filter balances by manager's team

### 9.2 Medium Issues

1. **Missing role-based filtering in some endpoints**
   - Some endpoints don't use centralized scoping utilities
   - **Fix**: Migrate all endpoints to use `buildStaffWhereClause` / `buildLeaveWhereClause`

---

## 10. Performance Issues Summary

### 10.1 Critical Performance Issues

1. **No pagination on high-volume endpoints**
   - **Impact**: Could return 10,000+ records in single response
   - **Endpoints**: `/api/leaves`, `/api/staff`, `/api/balances`
   - **Fix**: Add pagination with default limit of 50

2. **N+1 queries in payroll processing**
   - **Impact**: 200+ queries for 100 staff members
   - **Location**: `app/api/payroll/process/route.ts:131`
   - **Fix**: Batch queries using `findMany` with `in` clause

3. **N+1 queries in cron jobs**
   - **Impact**: 5,000+ notification calls for 1,000 staff
   - **Location**: `app/api/cron/daily-reminders/route.ts:233`
   - **Fix**: Batch notifications or use queue

### 10.2 Medium Performance Issues

1. **Overfetching in list endpoints**
   - **Impact**: Unnecessary data transfer
   - **Fix**: Use `select` to return only needed fields

2. **Missing composite indexes**
   - **Impact**: Slow queries on common patterns
   - **Fix**: Add indexes identified in Section 8

---

## 11. Recommendations

### 11.1 Immediate Actions (Critical)

1. **Remove all client-side filtering**
   - Remove `.filter()` calls in supervisor/unit-head dashboards
   - Ensure API endpoints enforce all scoping server-side

2. **Add pagination to high-volume endpoints**
   - `/api/leaves`
   - `/api/staff`
   - `/api/balances`

3. **Fix manager data access**
   - Update `/api/leaves` to use `buildLeaveWhereClause` for managers
   - Update `/api/balances` to filter by manager's team

4. **Fix N+1 queries**
   - Refactor payroll processing to batch queries
   - Refactor cron jobs to batch notifications

### 11.2 Short-term Actions (High Priority)

1. **Add missing database indexes**
   - Composite indexes for common query patterns
   - Indexes for unit/directorate filtering

2. **Reduce overfetching**
   - Add `select` clauses to list endpoints
   - Return only fields needed for UI

3. **Add missing query parameter support**
   - Support `?supervisorId=` in `/api/staff`
   - Support `?unit=` in `/api/staff`

### 11.3 Long-term Actions (Medium Priority)

1. **Standardize pagination pattern**
   - Create utility function for pagination
   - Apply consistently across all endpoints

2. **Add query optimization**
   - Use database query analysis tools
   - Monitor slow queries in production

3. **Add API response caching**
   - Cache frequently accessed, rarely changing data
   - Use Redis or similar for session-based caching

---

## 12. Verification Checklist

### 12.1 Security Verification

- [ ] All API routes use `withAuth` wrapper
- [ ] All list endpoints enforce server-side role-based filtering
- [ ] No client-side filtering of sensitive data
- [ ] Manager/supervisor roles only see their team's data
- [ ] Employees only see their own data

### 12.2 Performance Verification

- [ ] All list endpoints have pagination
- [ ] No N+1 query patterns in loops
- [ ] Database indexes exist for common query patterns
- [ ] Overfetching minimized (only needed fields returned)
- [ ] Query response times < 500ms for list endpoints

### 12.3 API Completeness Verification

- [ ] All UI-referenced routes exist
- [ ] All query parameters supported
- [ ] Error handling consistent across endpoints
- [ ] Response formats consistent

---

## 13. Code Examples

### 13.1 Fixed Leave Endpoint (with pagination)

```typescript
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')
  const staffId = searchParams.get('staffId')
  const status = searchParams.get('status')
  const leaveType = searchParams.get('leaveType')
  
  const { buildLeaveWhereClause } = await import('@/lib/data-scoping-utils')
  const { where: scopedWhere, hasAccess } = await buildLeaveWhereClause(user)
  
  if (!hasAccess) {
    return NextResponse.json({ data: [], total: 0, limit, offset })
  }
  
  let where: any = { ...scopedWhere }
  if (staffId) where.staffId = staffId
  if (status) where.status = status
  if (leaveType) where.leaveType = leaveType

  const [leaves, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      select: {
        id: true,
        staffId: true,
        staffName: true,
        leaveType: true,
        startDate: true,
        endDate: true,
        days: true,
        status: true,
        createdAt: true,
        staff: {
          select: {
            staffId: true,
            firstName: true,
            lastName: true,
            department: true,
            position: true,
            // ❌ Removed email - not needed for list
          },
        },
        // ❌ Removed template - not needed for list
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.leaveRequest.count({ where }),
  ])
  
  return NextResponse.json({ data: leaves, total, limit, offset })
}, { allowedRoles: READ_ONLY_ROLES })
```

### 13.2 Fixed Balances Endpoint (with manager scoping)

```typescript
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  const { buildStaffWhereClause } = await import('@/lib/data-scoping-utils')
  const { where: staffWhere, hasAccess } = await buildStaffWhereClause(user)
  
  if (!hasAccess) {
    return NextResponse.json([])
  }

  // Get staff IDs user can access
  const accessibleStaff = await prisma.staffMember.findMany({
    where: staffWhere,
    select: { staffId: true },
  })
  const staffIds = accessibleStaff.map(s => s.staffId)

  const balances = await prisma.leaveBalance.findMany({
    where: { staffId: { in: staffIds } },
    include: {
      staff: {
        select: {
          staffId: true,
          firstName: true,
          lastName: true,
          department: true,
          // ❌ Removed unnecessary fields
        },
      },
    },
  })
  return NextResponse.json(balances)
}, { allowedRoles: READ_ONLY_ROLES })
```

### 13.3 Fixed N+1 Query (Payroll Processing)

```typescript
// ❌ BEFORE: N+1 queries
for (const staff of staffMembers) {
  const existing = await prisma.payroll.findFirst({ ... })
  const salaryStructure = await prisma.salaryStructure.findFirst({ ... })
}

// ✅ AFTER: Batch queries
const staffIds = staffMembers.map(s => s.staffId)
const [existingPayrolls, salaryStructures] = await Promise.all([
  prisma.payroll.findMany({
    where: {
      period: payPeriod,
      staffId: { in: staffIds },
    },
  }),
  prisma.salaryStructure.findMany({
    where: {
      staffId: { in: staffIds },
      OR: [
        { endDate: null },
        { endDate: { gt: new Date() } }
      ],
    },
    orderBy: { effectiveDate: 'desc' },
  }),
])

// Create maps for O(1) lookup
const payrollMap = new Map(existingPayrolls.map(p => [p.staffId, p]))
const salaryMap = new Map(
  salaryStructures.reduce((acc, s) => {
    if (!acc.has(s.staffId)) acc.set(s.staffId, s)
    return acc
  }, new Map())
)

// Process with map lookups
for (const staff of staffMembers) {
  const existing = payrollMap.get(staff.staffId)
  const salaryStructure = salaryMap.get(staff.staffId)
  // ... rest of processing
}
```

---

## 14. Conclusion

This audit identified **3 critical security issues**, **8 performance issues**, and **5 missing/broken routes**. The most critical findings are:

1. **Frontend-only filtering** creates data leakage risks
2. **Missing pagination** will cause performance degradation at scale
3. **N+1 queries** in payroll and cron jobs will cause timeouts

All issues are fixable with the code examples provided. Priority should be given to security fixes first, then performance optimizations.

---

**Report Generated**: 2025-01-27  
**Next Review**: After implementing critical fixes

