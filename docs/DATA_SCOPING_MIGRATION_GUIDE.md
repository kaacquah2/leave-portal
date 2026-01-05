# Data Scoping Migration Guide

**Purpose**: Guide for migrating API routes to use centralized data scoping utilities

**Target**: All API routes that fetch staff or leave request data

---

## Why Migrate?

**Before**: Scattered data scoping logic across multiple files
- Inconsistent implementations
- Risk of data leakage
- Difficult to maintain

**After**: Centralized utilities in `lib/data-scoping-utils.ts`
- Consistent implementations
- Single source of truth
- Easier to maintain and test

---

## Migration Steps

### Step 1: Import Utilities

```typescript
import { buildStaffWhereClause, buildLeaveWhereClause } from '@/lib/data-scoping-utils'
```

### Step 2: Replace Scoping Logic

**Before** (scattered logic):
```typescript
let where: any = {}
if (normalizedRole === 'UNIT_HEAD') {
  if (userStaff?.unit) {
    where.unit = userStaff.unit
  }
} else if (normalizedRole === 'DIRECTOR') {
  if (userStaff?.directorate) {
    where.directorate = userStaff.directorate
  }
}
// ... more scattered logic
```

**After** (centralized):
```typescript
const { where, hasAccess } = await buildStaffWhereClause(user)
if (!hasAccess) {
  return NextResponse.json([], { status: 200 })
}
```

### Step 3: Apply Additional Filters

```typescript
const { where: scopedWhere, hasAccess } = await buildStaffWhereClause(user, {
  active: true,
  department: searchParams.get('department'),
})
```

---

## Examples

### Example 1: Staff List Route

**File**: `app/api/staff/route.ts`

**Before**:
```typescript
let where: any = {}
if (normalizedRole === 'EMPLOYEE') {
  where.staffId = user.staffId
} else if (normalizedRole === 'DIRECTOR') {
  if (userStaff?.directorate) {
    where.directorate = userStaff.directorate
  }
}
// ... more logic
```

**After**:
```typescript
import { buildStaffWhereClause } from '@/lib/data-scoping-utils'

const { where, hasAccess } = await buildStaffWhereClause(user, {
  active: true,
})
if (!hasAccess) {
  return NextResponse.json([], { status: 200 })
}
```

### Example 2: Leave Requests Route

**File**: `app/api/leaves/route.ts` (✅ Already migrated)

**Before**:
```typescript
let where: any = {}
if (isEmployee(user) && user.staffId) {
  where.staffId = user.staffId
} else if (isManager(user) && user.staffId) {
  // TODO: Incomplete implementation
}
```

**After**:
```typescript
import { buildLeaveWhereClause } from '@/lib/data-scoping-utils'

const { where: scopedWhere, hasAccess } = await buildLeaveWhereClause(user)
if (!hasAccess) {
  return NextResponse.json([], { status: 200 })
}
let where: any = { ...scopedWhere }
// Add additional filters
if (status) where.status = status
```

### Example 3: Calendar Route

**File**: `app/api/calendar/leave-calendar/route.ts`

**Before**:
```typescript
if (normalizedRole === 'SUPERVISOR') {
  const directReports = await prisma.staffMember.findMany({
    where: { OR: [{ managerId: user.staffId }, { immediateSupervisorId: user.staffId }] },
    select: { staffId: true },
  })
  where.staffId = { in: directReports.map(s => s.staffId) }
}
// ... more scattered logic
```

**After**:
```typescript
import { buildLeaveWhereClause } from '@/lib/data-scoping-utils'

const { where: scopedWhere, hasAccess } = await buildLeaveWhereClause(user)
if (!hasAccess) {
  return NextResponse.json({ leaves: [] }, { status: 200 })
}
let where: any = { ...scopedWhere }
// Add status filter
where.status = { in: ['pending', 'approved'] }
```

---

## Routes to Migrate

### High Priority (Data-Heavy Routes)
- [x] `app/api/leaves/route.ts` - ✅ Done
- [ ] `app/api/staff/route.ts` - Partially done, needs migration
- [ ] `app/api/calendar/leave-calendar/route.ts` - Needs migration
- [ ] `app/api/availability/today/route.ts` - Needs migration
- [ ] `app/api/availability/upcoming/route.ts` - Needs migration
- [ ] `app/api/availability/density/route.ts` - Needs migration

### Medium Priority
- [ ] `app/api/leaves/pending/*` routes - Review and migrate
- [ ] `app/api/reports/*` routes - Review data scoping
- [ ] `app/api/performance/*` routes - Review data scoping

### Low Priority
- [ ] Other routes with staff/leave data access

---

## Verification

After migration, verify:
1. ✅ Route uses centralized utilities
2. ✅ No duplicate scoping logic
3. ✅ Additional filters applied correctly
4. ✅ Returns empty array (not error) when no access
5. ✅ Test with different roles to verify scoping

---

## Testing

For each migrated route:
1. Test with Employee role (should see own data only)
2. Test with Supervisor role (should see direct reports only)
3. Test with Unit Head role (should see unit staff only)
4. Test with Director role (should see directorate staff only)
5. Test with HR role (should see all staff)
6. Verify cross-unit/directorate access is blocked

---

**Status**: Migration in progress  
**Last Updated**: December 2024

