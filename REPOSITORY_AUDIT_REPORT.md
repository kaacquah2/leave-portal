# Repository Structure Audit Report
## Duplicate Files, Dead Code, and Structural Issues

**Generated:** $(date)  
**Scope:** Complete repository analysis for duplicates, redundancies, and architectural issues

---

## Executive Summary

This audit identified **significant duplication** across multiple layers:
- **5 duplicate/redundant auth files**
- **2 overlapping API configuration files**
- **2 duplicate document management components**
- **2 duplicate audit log viewers**
- **3 overlapping cache/storage implementations**
- **1 potentially unused generic dashboard component**
- **Multiple role/permission logic files with overlapping concerns**
- **67 markdown documentation files** (many may be redundant)

**Risk Level:** 🔴 **HIGH** - Duplication creates maintenance burden, inconsistency risks, and potential security vulnerabilities.

---

## 1. DUPLICATE FILES

### 1.1 Authentication Files (5 files - HIGH PRIORITY)

**Location:** `lib/`

| File | Purpose | Status | Recommendation |
|-----|---------|--------|----------------|
| `auth.ts` | Core auth utilities (JWT, sessions, password reset) | ✅ **KEEP** | Primary auth implementation |
| `auth-client.ts` | Client-side auth utilities | ✅ **KEEP** | Needed for client components |
| `auth-proxy.ts` | API route wrapper (`withAuth()`) | ✅ **KEEP** | Critical for API protection |
| `auth-edge.ts` | Edge-compatible auth (middleware) | ✅ **KEEP** | Needed for Next.js middleware |
| `auth-debug.ts` | Debug utilities | ⚠️ **REVIEW** | Consider removing or gating behind feature flag |

**Analysis:**
- All files serve distinct purposes, but there's overlap in token extraction logic
- `getTokenFromRequest()` exists in both `auth.ts` and `auth-edge.ts` with slight variations
- `AuthUser` interface is duplicated across files

**Recommendation:**
- ✅ Keep all files (they serve different runtime contexts)
- 🔧 **Refactor:** Extract shared types to `lib/auth-types.ts`
- 🔧 **Refactor:** Consolidate `getTokenFromRequest()` into a single implementation

---

### 1.2 API Configuration Files (2 files - MEDIUM PRIORITY)

**Location:** `lib/`

| File | Purpose | Status | Recommendation |
|-----|---------|--------|----------------|
| `api-config.ts` | API base URL, desktop detection, `apiRequest()` wrapper | ⚠️ **PARTIAL DUPLICATE** | Refactor |
| `api-fetch.ts` | Unified fetch with offline support, caching, queueing | ⚠️ **PARTIAL DUPLICATE** | Refactor |

**Analysis:**
- `api-config.ts` has `apiRequest()` that calls `api-fetch.ts`'s `apiFetch()`
- Both handle desktop API routing (`handleDesktopRequest()` duplicated)
- `api-config.ts` has `apiRequestJson()` that duplicates `api-fetch.ts`'s `apiFetchJson()`
- Both files have URL normalization logic

**Recommendation:**
- 🔧 **Merge:** Move `apiRequest()` and `apiRequestJson()` from `api-config.ts` to `api-fetch.ts`
- 🔧 **Refactor:** Keep `api-config.ts` only for base URL resolution and desktop detection
- 🔧 **Consolidate:** Single `handleDesktopRequest()` implementation

**Impact:** Reduces confusion about which function to use, eliminates duplicate desktop API handling

---

### 1.3 Document Management Components (2 files - HIGH PRIORITY)

**Location:** `components/`

| File | Lines | Status | Recommendation |
|-----|-------|--------|----------------|
| `document-management.tsx` | ~606 | ⚠️ **BASIC VERSION** | Review usage |
| `enhanced-document-management.tsx` | ~724 | ⚠️ **ENHANCED VERSION** | Likely replacement |

**Analysis:**
- Both components have similar structure and functionality
- Enhanced version has additional features (tags, advanced filtering, history)
- Need to verify which is actually used

**Recommendation:**
- 🔍 **Verify:** Check which component is imported/used
- 🔧 **Action:** If `enhanced-document-management.tsx` is used everywhere, **DELETE** `document-management.tsx`
- 🔧 **Action:** If both are used, merge features and keep one

**Risk:** Maintaining two similar components leads to inconsistent behavior

---

### 1.4 Audit Log Viewers (2 files - MEDIUM PRIORITY)

**Location:** `components/`

| File | Lines | Status | Recommendation |
|-----|-------|--------|----------------|
| `audit-log-viewer.tsx` | ~290 | ⚠️ **BASIC VERSION** | Review usage |
| `enhanced-audit-log-viewer.tsx` | ~623 | ⚠️ **ENHANCED VERSION** | Likely replacement |

**Analysis:**
- Enhanced version adds data access logs, tabs, advanced filtering
- Both are imported in `admin-portal.tsx` (enhanced) and `admin-system-settings.tsx` (basic)

**Recommendation:**
- 🔍 **Verify:** Check actual usage in `admin-system-settings.tsx`
- 🔧 **Action:** Replace basic with enhanced in all locations
- 🔧 **Action:** **DELETE** `audit-log-viewer.tsx` if enhanced is sufficient

---

### 1.5 Cache/Storage Files (3 files - MEDIUM PRIORITY)

**Location:** `lib/`

| File | Purpose | Status | Recommendation |
|-----|---------|--------|----------------|
| `offline-cache.ts` | API response caching (Tauri/IndexedDB) | ✅ **KEEP** | Primary cache implementation |
| `desktop-cache.ts` | Legacy Electron localStorage cache | ⚠️ **REVIEW** | Check if still used |
| `data-store.ts` | Client-side data store with API sync | ✅ **KEEP** | Different purpose (state management) |

**Analysis:**
- `offline-cache.ts` is the modern implementation (Tauri-aware)
- `desktop-cache.ts` appears to be legacy Electron code
- `data-store.ts` serves different purpose (React state management)

**Recommendation:**
- 🔍 **Verify:** Check if `desktop-cache.ts` is imported anywhere
- 🔧 **Action:** If unused, **DELETE** `desktop-cache.ts`
- ✅ Keep `offline-cache.ts` and `data-store.ts` (different purposes)

---

### 1.6 Desktop API Files (2 files - LOW PRIORITY)

**Location:** `lib/`

| File | Purpose | Status | Recommendation |
|-----|---------|--------|----------------|
| `desktop-api.ts` | Unified Electron/Tauri API wrapper | ✅ **KEEP** | Primary interface |
| `tauri-api.ts` | Tauri-specific API implementation | ✅ **KEEP** | Used by desktop-api |

**Analysis:**
- `desktop-api.ts` wraps `tauri-api.ts` - this is correct architecture
- No duplication, just proper layering

**Recommendation:**
- ✅ **KEEP BOTH** - Correct separation of concerns

---

## 2. DUPLICATE BUSINESS LOGIC

### 2.1 Role/Permission Logic (4 files - HIGH PRIORITY)

**Location:** `lib/`

| File | Purpose | Overlap Issues |
|-----|---------|----------------|
| `permissions.ts` | RBAC permissions, `hasPermission()`, role types | ✅ Core definitions |
| `role-mapping.ts` | Legacy role → MoFA role mapping | ✅ Used by others |
| `role-utils.ts` | Role normalization utilities | ⚠️ **DUPLICATES** `role-mapping.ts` logic |
| `mofa-rbac-middleware.ts` | RBAC middleware with unit scoping | ⚠️ **DUPLICATES** permission checks |

**Analysis:**
- `role-utils.ts` calls `mapToMoFARole()` from `role-mapping.ts` - correct
- `mofa-rbac-middleware.ts` has its own role checking logic that duplicates `hasPermission()`
- Multiple files check roles with string comparisons instead of using utilities

**Recommendation:**
- ✅ Keep `permissions.ts` and `role-mapping.ts` (core)
- 🔧 **Refactor:** Ensure `mofa-rbac-middleware.ts` uses `hasPermission()` from `permissions.ts`
- 🔧 **Refactor:** Audit all role checks to use `role-utils.ts` functions
- 🔧 **Consolidate:** Move all role normalization to `role-utils.ts`

**Risk:** Inconsistent role checking can lead to security vulnerabilities

---

### 2.2 API Request Logic (DUPLICATED)

**Issue:** Multiple ways to make API requests:
- `apiRequest()` from `api-config.ts`
- `apiFetch()` from `api-fetch.ts`
- Direct `fetch()` calls in some components

**Recommendation:**
- 🔧 **Standardize:** All API calls should use `apiFetch()` from `api-fetch.ts`
- 🔧 **Refactor:** Remove `apiRequest()` from `api-config.ts`
- 🔧 **Audit:** Find and replace direct `fetch()` calls

---

### 2.3 Data Scoping Logic (PARTIALLY CENTRALIZED)

**Status:** ✅ **GOOD** - Centralized in `lib/data-scoping-utils.ts`

**Analysis:**
- Migration to centralized scoping is documented in `API_ROUTES_MIGRATION_SUMMARY.md`
- Some routes may still have manual scoping logic

**Recommendation:**
- 🔍 **Audit:** Verify all API routes use `buildStaffWhereClause()` and `buildLeaveWhereClause()`
- 🔧 **Refactor:** Remove any remaining manual scoping logic

---

## 3. DEAD OR UNUSED CODE

### 3.1 Generic Dashboard Component

**File:** `components/dashboard.tsx` (650 lines)

**Analysis:**
- Imported in `components/portal.tsx` but **NOT USED** in render logic
- Portal uses role-specific dashboards (SupervisorDashboard, UnitHeadDashboard, etc.)
- Comment in portal.tsx says "NO GENERIC DASHBOARDS"

**Recommendation:**
- 🔍 **Verify:** Confirm it's not used elsewhere
- 🔧 **Action:** If unused, **DELETE** `components/dashboard.tsx`
- 🔧 **Action:** Remove import from `components/portal.tsx`

---

### 3.2 Middleware Files

**Files:**
- `middleware.ts` - Main Next.js middleware
- `middleware-session.ts` - Session timeout checking

**Analysis:**
- `middleware-session.ts` exports `checkSessionTimeout()` but may not be called
- Session checking is handled in `auth-proxy.ts` via `withAuth()`

**Recommendation:**
- 🔍 **Verify:** Check if `middleware-session.ts` is imported/used
- 🔧 **Action:** If unused, **DELETE** or integrate into `middleware.ts`

---

### 3.3 Documentation Files (67 files)

**Location:** Root and `docs/`

**Analysis:**
- Many migration/setup docs may be outdated
- Multiple Tauri migration docs (phases, summaries, guides)
- Multiple verification/audit reports

**Recommendation:**
- 🔍 **Review:** Consolidate migration docs into single guide
- 🔧 **Archive:** Move outdated docs to `docs/archive/`
- 🔧 **Consolidate:** Merge similar reports (e.g., multiple verification reports)

**High Priority Docs to Review:**
- `API_ROUTES_MIGRATION_SUMMARY.md` - May be outdated
- `CRITICAL_FIXES_SUMMARY.md` - Historical, consider archiving
- `FIXES_APPLIED.md` - Historical, consider archiving
- `ACTIONS_COMPLETED.md` - Historical, consider archiving
- Multiple `TAURI-*.md` files - Consolidate into single migration guide

---

## 4. REDUNDANT COMPONENTS

### 4.1 Dashboard Components

**Status:** ✅ **GOOD** - Role-specific dashboards are correct

**Components:**
- `supervisor-dashboard.tsx`
- `unit-head-dashboard.tsx`
- `director-dashboard.tsx`
- `hr-officer-dashboard.tsx`
- `hr-director-dashboard.tsx`
- `chief-director-dashboard.tsx`
- `employee-portal.tsx` (acts as dashboard)
- `admin-portal.tsx` (acts as dashboard)
- `auditor-portal.tsx` (acts as dashboard)

**Analysis:**
- Each role has its own dashboard - correct architecture
- Generic `dashboard.tsx` is unused (see Dead Code section)

**Recommendation:**
- ✅ Keep all role-specific dashboards
- 🔧 **Delete:** Generic `dashboard.tsx` if confirmed unused

---

### 4.2 Navigation Components

**Files:**
- `components/navigation.tsx`
- `components/admin-navigation.tsx`
- `components/employee-navigation.tsx`
- `components/navigation-controls.tsx`

**Analysis:**
- Different navigation for different contexts - correct separation
- No duplication found

**Recommendation:**
- ✅ **KEEP ALL** - Proper separation of concerns

---

## 5. INCONSISTENT NAMING CONVENTIONS

### 5.1 File Naming

**Issues Found:**
- Mix of kebab-case and camelCase: `document-management.tsx` vs `dataStore.ts`
- Some files use `-` (kebab-case), others use camelCase
- Component files consistently use kebab-case ✅
- Utility files mix conventions ⚠️

**Recommendation:**
- 🔧 **Standardize:** All component files → kebab-case
- 🔧 **Standardize:** All utility/lib files → kebab-case (or camelCase consistently)
- 📝 **Document:** Add naming convention to style guide

---

### 5.2 Function Naming

**Issues:**
- `apiRequest()` vs `apiFetch()` - confusing which to use
- `getTokenFromRequest()` duplicated with slight variations
- Role checking functions have inconsistent names

**Recommendation:**
- 🔧 **Standardize:** Single API request function name
- 🔧 **Consolidate:** Single token extraction function
- 🔧 **Document:** Clear API for role checking

---

### 5.3 Variable Naming

**Issues:**
- Mix of `userRole` and `role` in components
- Some use `staffId`, others use `staff_id`

**Recommendation:**
- 🔧 **Standardize:** Use `userRole` consistently (or `role` consistently)
- 🔧 **Standardize:** Use `staffId` (camelCase) consistently

---

## 6. SEPARATION OF CONCERNS

### 6.1 Architecture Layers

**Status:** ✅ **GOOD** - Generally well-separated

| Layer | Location | Status |
|-------|----------|--------|
| **UI Components** | `components/` | ✅ Well-organized |
| **API Routes** | `app/api/` | ✅ RESTful structure |
| **Business Logic** | `lib/` | ⚠️ Some overlap |
| **Hooks** | `hooks/` | ✅ Clean separation |
| **Database** | `prisma/` | ✅ Proper separation |

**Issues:**
- Some business logic in API routes (should be in `lib/`)
- Some UI logic in API routes (should be in components)

**Recommendation:**
- 🔧 **Refactor:** Move complex business logic from API routes to `lib/` services
- 🔧 **Refactor:** Keep API routes thin (validation + service calls)

---

### 6.2 Shared Logic Centralization

**Status:** ⚠️ **PARTIAL** - Some logic duplicated

**Centralized:**
- ✅ Data scoping (`lib/data-scoping-utils.ts`)
- ✅ Permissions (`lib/permissions.ts`)
- ✅ Role mapping (`lib/role-mapping.ts`)

**Not Centralized:**
- ⚠️ Role checking logic (in multiple files)
- ⚠️ API request handling (multiple implementations)
- ⚠️ Token extraction (duplicated)

**Recommendation:**
- 🔧 **Centralize:** All role checks should use `role-utils.ts`
- 🔧 **Centralize:** All API calls should use `api-fetch.ts`
- 🔧 **Centralize:** Token extraction in single utility

---

### 6.3 Role Logic Duplication

**Issue:** Role checking logic appears in:
- `lib/permissions.ts` - `hasPermission()`
- `lib/role-utils.ts` - Role normalization
- `lib/mofa-rbac-middleware.ts` - Custom role checks
- `lib/auth-proxy.ts` - Role checking in `withAuth()`
- Multiple API routes - Direct role string comparisons

**Recommendation:**
- 🔧 **Refactor:** All role checks should go through `hasPermission()` from `permissions.ts`
- 🔧 **Refactor:** `mofa-rbac-middleware.ts` should use centralized functions
- 🔧 **Audit:** Replace direct role comparisons in API routes with `hasPermission()`

**Risk:** 🔴 **HIGH** - Inconsistent role checking can lead to security vulnerabilities

---

## 7. FILES TO DELETE

### High Priority Deletions

1. **`components/dashboard.tsx`** (if unused)
   - Reason: Generic dashboard not used, replaced by role-specific dashboards
   - Verify: Check all imports first

2. **`components/document-management.tsx`** (if enhanced version is used everywhere)
   - Reason: Duplicate of enhanced version
   - Verify: Check which is actually imported

3. **`components/audit-log-viewer.tsx`** (if enhanced version is used everywhere)
   - Reason: Duplicate of enhanced version
   - Verify: Check usage in `admin-system-settings.tsx`

4. **`lib/desktop-cache.ts`** (if unused)
   - Reason: Legacy Electron code, replaced by `offline-cache.ts`
   - Verify: Check imports

5. **`middleware-session.ts`** (if unused)
   - Reason: Session checking handled in `auth-proxy.ts`
   - Verify: Check if imported

### Medium Priority Deletions

6. **Outdated Documentation Files:**
   - `CRITICAL_FIXES_SUMMARY.md` → Archive
   - `FIXES_APPLIED.md` → Archive
   - `ACTIONS_COMPLETED.md` → Archive
   - Multiple `TAURI-*.md` files → Consolidate

---

## 8. FILES TO MERGE/REFACTOR

### High Priority Refactors

1. **`lib/api-config.ts` + `lib/api-fetch.ts`**
   - Action: Move `apiRequest()` and `apiRequestJson()` to `api-fetch.ts`
   - Action: Keep only base URL resolution in `api-config.ts`
   - Action: Consolidate `handleDesktopRequest()`

2. **`lib/auth.ts` + `lib/auth-edge.ts`**
   - Action: Extract shared types to `lib/auth-types.ts`
   - Action: Consolidate `getTokenFromRequest()` implementations

3. **Role Checking Logic**
   - Action: Ensure `mofa-rbac-middleware.ts` uses `hasPermission()`
   - Action: Replace direct role comparisons with utility functions

### Medium Priority Refactors

4. **Document Management Components**
   - Action: Merge features, keep one component

5. **Audit Log Viewers**
   - Action: Replace basic with enhanced everywhere, delete basic

---

## 9. STRUCTURAL IMPROVEMENTS

### 9.1 Directory Organization

**Current Structure:** ✅ Generally good

**Recommendations:**
- 🔧 Create `lib/auth/` directory for auth-related files
- 🔧 Create `lib/api/` directory for API-related utilities
- 🔧 Create `lib/roles/` directory for role/permission logic
- 🔧 Move `docs/archive/` for outdated documentation

---

### 9.2 Import Organization

**Issues:**
- Some files import from multiple auth files
- Unclear which API function to use

**Recommendations:**
- 🔧 Create barrel exports (`lib/auth/index.ts`, `lib/api/index.ts`)
- 🔧 Document preferred imports in README

---

### 9.3 Type Definitions

**Issues:**
- `AuthUser` interface duplicated across files
- Role types defined in multiple places

**Recommendations:**
- 🔧 Create `lib/types/auth.ts` for auth types
- 🔧 Create `lib/types/roles.ts` for role types
- 🔧 Consolidate all type definitions

---

## 10. RISKS CAUSED BY DUPLICATION

### 10.1 Security Risks

**🔴 HIGH RISK:**
- **Inconsistent role checking** - Different implementations may have different security behaviors
- **Token extraction variations** - Edge cases may be handled differently
- **Permission logic duplication** - Bugs in one implementation may not be fixed in others

**Mitigation:**
- Consolidate all role/permission checks
- Single source of truth for auth logic
- Comprehensive security audit after refactoring

---

### 10.2 Maintenance Risks

**🟡 MEDIUM RISK:**
- **Bug fixes need to be applied in multiple places**
- **Feature additions require changes in multiple files**
- **Inconsistent behavior across similar components**

**Mitigation:**
- Delete duplicate files
- Centralize shared logic
- Document preferred patterns

---

### 10.3 Code Quality Risks

**🟡 MEDIUM RISK:**
- **Confusion about which function/component to use**
- **Inconsistent naming makes code harder to understand**
- **Dead code increases bundle size**

**Mitigation:**
- Clear documentation of preferred APIs
- Consistent naming conventions
- Remove unused code

---

## 11. PRIORITY ACTION ITEMS

### Immediate (High Priority)

1. ✅ **Verify and delete unused `components/dashboard.tsx`**
2. ✅ **Consolidate API request functions** (`api-config.ts` + `api-fetch.ts`)
3. ✅ **Audit and fix role checking logic** (ensure all use `hasPermission()`)
4. ✅ **Verify and delete duplicate document/audit components**

### Short Term (Medium Priority)

5. ✅ **Extract shared auth types** to `lib/auth-types.ts`
6. ✅ **Consolidate token extraction** logic
7. ✅ **Archive outdated documentation**
8. ✅ **Standardize naming conventions**

### Long Term (Low Priority)

9. ✅ **Reorganize lib directory** into subdirectories
10. ✅ **Create barrel exports** for cleaner imports
11. ✅ **Comprehensive type consolidation**

---

## 12. METRICS

### Duplication Metrics

- **Duplicate Files:** 5-7 files
- **Duplicate Logic:** 4-6 areas
- **Dead Code:** 1-3 components
- **Documentation Files:** 67 (many may be redundant)

### Estimated Impact

- **Lines of Code to Remove:** ~1,500-2,000
- **Files to Delete:** 5-10
- **Files to Refactor:** 8-12
- **Security Vulnerabilities Addressed:** 2-3

---

## 13. CONCLUSION

The repository shows **good overall architecture** but has **significant duplication** that needs addressing. The highest priority is:

1. **Security:** Consolidate role/permission checking logic
2. **Maintainability:** Remove duplicate components and files
3. **Clarity:** Standardize API usage and naming conventions

**Recommended Approach:**
1. Start with security-critical refactoring (role checks)
2. Remove clearly unused files
3. Consolidate API utilities
4. Standardize naming and organization

**Estimated Effort:** 2-3 days for high-priority items, 1 week for complete cleanup.

---

**Report Generated:** $(date)  
**Next Review:** After refactoring completion

---

## 14. IMPLEMENTATION STATUS

**Last Updated:** $(date)

### ✅ Completed

1. **Merged API Config/Fetch Files** - ✅ DONE
   - `apiRequest()` and `apiRequestJson()` moved to `api-fetch.ts`
   - `api-config.ts` now re-exports from `api-fetch.ts`
   - Backward compatibility maintained with @deprecated tags

2. **Deleted Duplicate Components** - ✅ DONE
   - `components/document-management.tsx` - DELETED (not used)
   - `components/audit-log-viewer.tsx` - DELETED (replaced with enhanced)
   - `components/admin-system-settings.tsx` updated to use enhanced version

3. **Consolidated Type Definitions** - ✅ DONE
   - Created `lib/types/auth.ts` for shared auth types
   - Created `lib/types/roles.ts` for shared role types
   - Updated all auth files to use shared types

4. **Created Barrel Exports** - ✅ DONE
   - `lib/auth/index.ts` - centralized auth exports
   - `lib/api/index.ts` - centralized API exports
   - `lib/roles/index.ts` - centralized role exports

5. **Archived Outdated Documentation** - ✅ DONE
   - Moved 3 historical docs to `docs/archive/`

### ⚠️ Partially Completed

1. **Consolidate Role Checking Logic** - ⚠️ IN PROGRESS
   - ✅ Type definitions consolidated
   - ✅ Barrel exports created
   - ⚠️ `mofa-rbac-middleware.ts` still has direct role checks (needs refactoring)
   - ⚠️ API routes need audit for direct role comparisons

2. **Dashboard Component** - ⚠️ REVIEW NEEDED
   - Used as fallback in `portal.tsx` (lines 178, 371)
   - Decision: Keep as fallback or replace with error component

### ❌ Not Started

1. **Standardize Naming Conventions** - ❌ NOT STARTED
   - File naming (kebab-case vs camelCase)
   - Variable naming (`userRole` vs `role`)

2. **Complete lib Directory Reorganization** - ❌ NOT STARTED
   - Move files to subdirectories
   - Update all imports

### Summary

- **Files Created:** 5 (types, barrel exports)
- **Files Deleted:** 2 (duplicate components)
- **Files Modified:** 7 (consolidation, type updates)
- **Files Archived:** 3 (outdated docs)

**See `REFACTORING_IMPLEMENTATION_SUMMARY.md` for detailed status.**

