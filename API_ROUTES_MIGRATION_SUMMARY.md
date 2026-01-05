# API Routes Migration to Centralized Data Scoping

## Summary

Successfully migrated **7 API routes** to use the centralized data scoping utilities from `lib/data-scoping-utils.ts`. This ensures consistent, role-based data filtering across all API endpoints and prevents unauthorized data access.

## Migrated Routes

### ✅ Completed Migrations

1. **`app/api/staff/route.ts`** (GET handler)
   - **Before**: Manual role checking with `mapToMoFARole`, `hasPermission`, and custom `where` clause construction
   - **After**: Uses `buildStaffWhereClause` from `lib/data-scoping-utils.ts`
   - **Impact**: Ensures consistent staff data scoping based on user role and organizational hierarchy

2. **`app/api/calendar/leave-calendar/route.ts`**
   - **Before**: Manual role-based filtering with complex logic for supervisors, unit heads, and directors
   - **After**: Uses `buildLeaveWhereClause` for base scoping, then applies date range and additional filters
   - **Impact**: Calendar data is now properly scoped to user's organizational context

3. **`app/api/availability/today/route.ts`**
   - **Before**: Manual staff filtering based on role with duplicate logic
   - **After**: Uses `buildStaffWhereClause` with additional filters (department, unit) passed as parameters
   - **Impact**: Today's availability data respects role-based access boundaries

4. **`app/api/availability/upcoming/route.ts`**
   - **Before**: Manual staff filtering similar to today endpoint
   - **After**: Uses `buildStaffWhereClause` with additional filters
   - **Impact**: Upcoming availability data is properly scoped

5. **`app/api/availability/density/route.ts`**
   - **Before**: Manual staff filtering with role checks
   - **After**: Uses `buildStaffWhereClause` with additional filters
   - **Impact**: Density analytics respect organizational boundaries

6. **`app/api/leave-deferment/route.ts`** (GET handler)
   - **Before**: Manual role checking and team member lookup
   - **After**: Uses `buildLeaveWhereClause` to determine accessible staff, then filters deferment requests
   - **Impact**: Deferment requests are properly scoped to user's access level

7. **`app/api/export/route.ts`** (POST handler - staff and leave exports)
   - **Before**: Applied `filters || {}` directly without data scoping, allowing potential data leakage
   - **After**: Uses `buildStaffWhereClause` for staff exports and `buildLeaveWhereClause` for leave exports, with filter validation
   - **Impact**: Export functionality now respects role-based access boundaries, preventing unauthorized data exports
   - **Security**: Validates that requested `staffId` filters are within user's scope before applying

## Previously Migrated

- **`app/api/leaves/route.ts`** (GET handler) - Already migrated in previous work

## Benefits

1. **Consistency**: All routes now use the same data scoping logic, reducing inconsistencies
2. **Maintainability**: Changes to scoping rules only need to be made in one place (`lib/data-scoping-utils.ts`)
3. **Security**: Centralized logic ensures no routes accidentally bypass access controls
4. **Correctness**: Proper handling of edge cases (missing staffId, no directorate/unit, etc.)

## Data Scoping Utilities Used

### `buildStaffWhereClause(user, additionalFilters?)`
- Returns a Prisma `where` clause for staff queries
- Handles all role types: EMPLOYEE, SUPERVISOR, UNIT_HEAD, DIRECTOR, HR roles, etc.
- Returns `{ where, hasAccess }` to indicate if user has any access

### `buildLeaveWhereClause(user, additionalFilters?)`
- Returns a Prisma `where` clause for leave request queries
- Uses staff scoping to determine which leave requests are accessible
- Returns `{ where, hasAccess }` to indicate if user has any access

## Migration Pattern

All migrations followed this pattern:

```typescript
// Before
const normalizedRole = mapToMoFARole(user.role)
let where: any = {}
if (normalizedRole === 'EMPLOYEE') {
  where.staffId = user.staffId
} else if (normalizedRole === 'SUPERVISOR') {
  // Complex logic...
}
// ... more role checks

// After
import { buildStaffWhereClause } from '@/lib/data-scoping-utils'

const additionalFilters: Record<string, any> = {}
// Add any query parameter filters here

const { where, hasAccess } = await buildStaffWhereClause({
  id: user.id,
  role: user.role,
  staffId: user.staffId,
}, additionalFilters)

if (!hasAccess) {
  return NextResponse.json([]) // or appropriate empty response
}
```

## Testing Recommendations

1. **Role-Based Access Testing**: Verify each role sees only their scoped data
2. **Edge Cases**: Test users without staffId, directorate, or unit assignments
3. **Additional Filters**: Verify query parameters (department, unit, status) work correctly with scoping
4. **Cross-Unit Access**: Verify users cannot see data from other units/directorates
5. **Export Security**: Verify that export filters cannot bypass data scoping (especially for staff and leave exports)

## Remaining Routes to Consider

The following routes may benefit from migration but were not identified as high-priority:

- Other specialized routes that query staff or leave data

## Notes

- All migrations maintain backward compatibility with existing query parameters
- Additional filters (department, unit, etc.) are applied after base scoping to ensure they don't bypass access controls
- Empty arrays are returned when users have no access (rather than errors) for better UX

