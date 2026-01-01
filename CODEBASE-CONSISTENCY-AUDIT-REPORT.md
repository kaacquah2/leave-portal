# Codebase Consistency Audit Report
**Generated:** $(date)  
**Scope:** Full codebase audit for inconsistencies between UI, backend, database, and permissions system

---

## 🔴 Critical Issues

### 1. **Role Inconsistencies: Hardcoded Strings vs Permissions System**

**Problem:** Many API routes and components use hardcoded role string comparisons instead of the centralized permissions system.

**Impact:** 
- Difficult to maintain
- Risk of security gaps
- Inconsistent behavior across the system

**Examples Found:**

#### API Routes Using Hardcoded Role Checks:
- `app/api/admin/users/route.ts` - Lines 12-14, 68-70: Manual admin checks
- `app/api/admin/users/[id]/route.ts` - Lines 19-21: Manual admin checks
- `app/api/employees/[staffId]/profile/route.ts` - Lines 43-44: Manual HR checks
- `app/api/employees/[staffId]/documents/route.ts` - Lines 66-67: Manual HR checks
- `app/api/payroll/salary-structure/route.ts` - Lines 35-38: Manual HR checks
- `app/api/realtime/route.ts` - Line 56: Long hardcoded role list

#### Components Using Hardcoded Role Checks:
- `components/portal.tsx` - Multiple hardcoded role checks (lines 85, 94, 122-128, 237-258)
- `components/staff-management.tsx` - Lines 52-53: Manual role checks despite using permissions
- `lib/data-store.ts` - Line 211: Hardcoded audit log check
- `lib/mofa-rbac-middleware.ts` - Multiple hardcoded role checks throughout

**Recommendation:** Replace all hardcoded role checks with `hasPermission()` or `PermissionChecks.*` functions from `lib/permissions.ts`.

---

### 2. **SECURITY_ADMIN Role Missing in Many allowedRoles Arrays**

**Problem:** The `SECURITY_ADMIN` role is defined in permissions but missing from many API route `allowedRoles` arrays.

**Impact:** Security admins may be denied access to routes they should have access to.

**Missing in:**
- `app/api/admin/users/route.ts` - Should include SECURITY_ADMIN for audit purposes
- `app/api/admin/users/[id]/route.ts` - Should include SECURITY_ADMIN
- `app/api/staff/route.ts` - Should include SECURITY_ADMIN for read access
- `app/api/staff/[id]/route.ts` - Should include SECURITY_ADMIN
- `app/api/leaves/route.ts` - Should include SECURITY_ADMIN for read access
- `app/api/balances/route.ts` - Should include SECURITY_ADMIN for read access
- Many more routes...

**Recommendation:** Add `SECURITY_ADMIN` to all routes where read-only access is appropriate (audit logs, reports, compliance).

---

### 3. **Inconsistent Role Normalization**

**Problem:** Different parts of the codebase normalize roles differently:
- Some use `mapToMoFARole()`
- Some use manual `toUpperCase()` checks
- Some use `hasMatchingRole()` from auth-proxy
- Some check both legacy and new roles manually

**Examples:**
```typescript
// Inconsistent pattern 1:
const normalizedRole = user.role?.toUpperCase()
const isAdmin = normalizedRole === 'SYSTEM_ADMIN' || 
               normalizedRole === 'SYS_ADMIN' || 
               user.role === 'admin'

// Inconsistent pattern 2:
if (role === 'HR_OFFICER' || role === 'HR_DIRECTOR' || role === 'hr' || 
    role === 'hr_officer' || role === 'hr_director') {

// Inconsistent pattern 3:
const normalizedRole = mapToMoFARole(userRole)
```

**Recommendation:** Standardize on `mapToMoFARole()` from `lib/role-mapping.ts` for all role normalization.

---

### 4. **Database Schema Comment Mismatch**

**Problem:** The Prisma schema comment for `User.role` doesn't match the actual `UserRole` type.

**Current Schema Comment (line 17):**
```prisma
role String // Ghana Government roles: 'employee' | 'supervisor' | ... | Legacy: 'hr' | 'hr_assistant' | 'manager' | 'deputy_director'
```

**Actual UserRole Type:**
- Includes `SYSTEM_ADMIN`, `SECURITY_ADMIN`, `AUDITOR`
- Missing from schema comment

**Recommendation:** Update schema comment to match `UserRole` type exactly.

---

### 5. **Duplicate SYSTEM_ADMIN Entry in role-mapping.ts**

**Problem:** `getRoleDisplayName()` has duplicate `'SYSTEM_ADMIN'` key (lines 50-51).

**Current:**
```typescript
'SYSTEM_ADMIN': 'System Administrator',
'SYSTEM_ADMIN': 'System Administrator', // Duplicate!
```

**Impact:** TypeScript/JavaScript will use the last value, but it's confusing and error-prone.

**Recommendation:** Remove duplicate entry.

---

### 6. **Inconsistent allowedRoles Arrays**

**Problem:** `allowedRoles` arrays in API routes are inconsistent:
- Some include both uppercase and lowercase versions
- Some include legacy roles, some don't
- Some are missing SECURITY_ADMIN
- Some have typos or inconsistent naming

**Examples:**
```typescript
// Pattern 1: Both cases
allowedRoles: ['HR_OFFICER', 'HR_DIRECTOR', 'hr', 'hr_officer', 'hr_director']

// Pattern 2: Only uppercase
allowedRoles: ['HR_OFFICER', 'HR_DIRECTOR', 'SYSTEM_ADMIN']

// Pattern 3: Missing SECURITY_ADMIN
allowedRoles: ['HR_OFFICER', 'HR_DIRECTOR', 'AUDITOR', 'SYSTEM_ADMIN']
// Should include SECURITY_ADMIN
```

**Recommendation:** 
1. Use `auth-proxy.ts` role equivalents system (already handles normalization)
2. Create a constants file with standard role arrays
3. Use those constants consistently

---

## 🟡 Medium Priority Issues

### 7. **Frontend Permission Checks Incomplete**

**Problem:** While some components use permission checks, many still use hardcoded role checks.

**Status:** 
- ✅ `components/staff-management.tsx` - Uses PermissionChecks
- ✅ `components/portal.tsx` - Partially uses hasPermission()
- ❌ `components/portal.tsx` - Still has many hardcoded checks
- ❌ `lib/data-store.ts` - Hardcoded checks
- ❌ `lib/mofa-rbac-middleware.ts` - Hardcoded checks

**Recommendation:** Complete migration to permission-based checks.

---

### 8. **Navigation Component Role Lists**

**Problem:** `components/navigation.tsx` has hardcoded role arrays in navItems (line 49, 56, etc.).

**Current:**
```typescript
roles: ['hr', 'hr_assistant', 'manager', 'deputy_director', 'EMPLOYEE', 'SUPERVISOR', ...]
```

**Recommendation:** Use permission checks instead of role arrays, or create a helper function that maps permissions to roles.

---

### 9. **Role Validation in API Routes**

**Problem:** `app/api/admin/users/[id]/route.ts` has a hardcoded `validRoles` array (lines 36-42) that doesn't match the `UserRole` type.

**Current:**
```typescript
const validRoles = [
  'employee', 'supervisor', 'unit_head', 'division_head', 'directorate_head',
  'regional_manager', 'hr_officer', 'hr_director', 'chief_director',
  'internal_auditor', 'admin',
  // Legacy roles
  'hr', 'hr_assistant', 'manager', 'deputy_director',
]
```

**Missing:** `SYSTEM_ADMIN`, `SECURITY_ADMIN`, `AUDITOR` (uppercase versions)

**Recommendation:** Import `UserRole` type and validate against it, or use a shared constants file.

---

### 10. **Middleware Role Route Mapping**

**Problem:** `middleware.ts` has hardcoded role-to-route mapping (lines 14-19) that doesn't match `getRoleRoute()` from `role-mapping.ts`.

**Current:**
```typescript
const rolePageRoutes: Record<string, string[]> = {
  '/admin': ['admin'],
  '/hr': ['hr'],
  '/manager': ['manager'],
  '/employee': ['employee'],
}
```

**Missing:** All MoFA roles (SUPERVISOR, UNIT_HEAD, etc.)

**Recommendation:** Use `getRoleRoute()` from `lib/role-mapping.ts` or create a reverse mapping.

---

## 🟢 Low Priority Issues

### 11. **Type Safety Issues**

**Problem:** Many places use `string` instead of `UserRole` type.

**Examples:**
- `lib/data-store.ts` - `userRole?: UserRole` but then used as string
- `components/portal.tsx` - `userRole: string` prop
- Many API routes - `user.role` is string, not UserRole

**Recommendation:** Add proper type annotations and use type guards.

---

### 12. **Inconsistent Error Messages**

**Problem:** Error messages for unauthorized access are inconsistent.

**Examples:**
- "Forbidden - Admin access required"
- "Forbidden"
- "You don't have permission to..."
- "Unauthorized - No authentication token found"

**Recommendation:** Standardize error messages.

---

### 13. **Documentation Comments**

**Problem:** Some files have outdated comments about roles.

**Examples:**
- `lib/permissions.ts` - Comments mention "MoFA" but some roles are legacy
- API route comments may not match actual allowedRoles

**Recommendation:** Update all documentation to match current implementation.

---

## 📊 Summary Statistics

- **Total Issues Found:** 13
- **Critical:** 6
- **Medium:** 4
- **Low:** 3

**Files with Most Issues:**
1. `app/api/admin/users/route.ts` - 3 issues
2. `components/portal.tsx` - 4 issues
3. `lib/mofa-rbac-middleware.ts` - 3 issues
4. `lib/role-mapping.ts` - 2 issues

---

## 🔧 Recommended Fix Priority

### Phase 1 (Critical - Security & Consistency)
1. Fix SECURITY_ADMIN missing in allowedRoles
2. Standardize role normalization
3. Fix database schema comment
4. Remove duplicate SYSTEM_ADMIN entry

### Phase 2 (Important - Maintainability)
5. Replace hardcoded role checks with permission system
6. Create role constants file
7. Fix role validation in API routes

### Phase 3 (Nice to Have - Code Quality)
8. Complete frontend permission checks
9. Fix type safety issues
10. Standardize error messages
11. Update documentation

---

## 📝 Implementation Notes

### Creating Role Constants File

Create `lib/role-constants.ts`:
```typescript
import { UserRole } from './permissions'

export const ADMIN_ROLES: UserRole[] = ['SYSTEM_ADMIN', 'SYS_ADMIN', 'admin']
export const HR_ROLES: UserRole[] = ['HR_OFFICER', 'HR_DIRECTOR', 'hr', 'hr_officer', 'hr_director', 'hr_assistant']
export const AUDIT_ROLES: UserRole[] = ['AUDITOR', 'SECURITY_ADMIN', 'internal_auditor']
// ... etc
```

### Standardizing Role Normalization

Create a wrapper function:
```typescript
// lib/role-utils.ts
export function normalizeRole(role: string | undefined): UserRole | null {
  if (!role) return null
  return mapToMoFARole(role)
}

export function isRoleIn(role: string | undefined, allowedRoles: UserRole[]): boolean {
  const normalized = normalizeRole(role)
  if (!normalized) return false
  return allowedRoles.includes(normalized)
}
```

---

## ✅ Next Steps

1. Review this report with the team
2. Prioritize fixes based on security impact
3. Create tickets for each issue
4. Implement fixes in phases
5. Add tests to prevent regressions
6. Update documentation

---

**Report Generated:** $(date)  
**Auditor:** AI Code Review System  
**Codebase Version:** Current as of audit date

