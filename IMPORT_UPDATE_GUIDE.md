# Import Update Guide

After lib directory reorganization, imports need to be updated across the codebase.

## New Import Paths

### Authentication
**Old:**
```typescript
import { withAuth } from '@/lib/auth-proxy'
import { getCurrentUser } from '@/lib/auth-client'
import { verifyToken } from '@/lib/auth'
```

**New:**
```typescript
import { withAuth, getCurrentUser, verifyToken } from '@/lib/auth'
```

### API
**Old:**
```typescript
import { apiRequest } from '@/lib/api-config'
import { apiFetch } from '@/lib/api-fetch'
```

**New:**
```typescript
import { apiRequest, apiFetch } from '@/lib/api'
```

### Roles & Permissions
**Old:**
```typescript
import { hasPermission } from '@/lib/permissions'
import { mapToMoFARole } from '@/lib/role-mapping'
import { isAdminRole } from '@/lib/role-utils'
import { getUserRBACContext } from '@/lib/mofa-rbac-middleware'
```

**New:**
```typescript
import { hasPermission, mapToMoFARole, isAdminRole, getUserRBACContext } from '@/lib/roles'
```

### Types
**Old:**
```typescript
import type { AuthUser } from '@/lib/auth-proxy'
import type { UserRole } from '@/lib/permissions'
import type { StaffMember } from '@/lib/data-store'
```

**New:**
```typescript
import type { AuthUser, UserRole, StaffMember } from '@/lib/types'
// Or from specific modules:
import type { AuthUser } from '@/lib/auth'
import type { UserRole } from '@/lib/roles'
import type { StaffMember } from '@/lib/types'
```

## Automated Update

A script is available at `scripts/batch-update-imports.ts` to automate most updates.

Run with:
```bash
npx tsx scripts/batch-update-imports.ts
```

## Manual Updates Required

Some imports may need manual review:
- Dynamic imports (`await import(...)`)
- Conditional imports
- Type-only imports that need `type` keyword

## Files Already Updated

- ✅ `lib/auth/*` - Internal imports fixed
- ✅ `lib/api/*` - Internal imports fixed
- ✅ `lib/roles/*` - Internal imports fixed
- ✅ `components/portal.tsx`
- ✅ `components/login-form.tsx`
- ✅ `components/admin-navigation.tsx`
- ✅ `app/api/staff/route.ts`
- ✅ `app/api/leaves/route.ts`
- ✅ `app/api/staff/[id]/route.ts`
- ✅ `app/api/compliance/access-review/route.ts`
- ✅ `app/api/reports/compliance/route.ts`
- ✅ `lib/data-scoping-utils.ts`
- ✅ `lib/data-store.ts`

## Remaining Files

Approximately 180+ files still need import updates. Use the batch script or update manually following the patterns above.

