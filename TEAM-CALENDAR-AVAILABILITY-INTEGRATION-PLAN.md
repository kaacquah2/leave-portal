# Team Leave Calendar & Workforce Availability Dashboard - Integration Plan

## Executive Summary

This document outlines the integration plan for two new features:
1. **Team Leave Calendar** - Department/organization-wide view with conflict detection
2. **Workforce Availability Dashboard** - Real-time availability tracking and analytics

Both features will integrate seamlessly with the existing MoFA leave management system, leveraging the current role-based access control (RBAC) system and database schema.

---

## 1. Feature Overview

### 1.1 Team Leave Calendar

**Purpose**: Provide a visual calendar view of all leave requests across the organization with role-based visibility.

**Key Features**:
- Department/organization-wide calendar view
- Public holidays + weekends visualization
- Conflict detection (too many people on leave simultaneously)
- Role-based visibility (HR sees all, managers see team)
- Filter by department, unit, leave type
- Export capabilities

### 1.2 Workforce Availability Dashboard

**Purpose**: Real-time view of workforce availability with analytics and alerts.

**Key Features**:
- Who is on leave today (real-time)
- Upcoming critical absences
- Leave density analytics
- Department/unit availability metrics
- Critical role coverage alerts
- Historical availability trends

---

## 2. Database Schema Changes

### 2.1 New Tables (Optional - for caching/performance)

```prisma
// Optional: Calendar Cache for performance
model CalendarCache {
  id            String   @id @default(cuid())
  date          DateTime
  department    String?
  unit          String?
  leaveCount    Int      // Number of people on leave
  staffOnLeave  Json     // Array of staff IDs on leave
  conflictLevel String?  // 'low' | 'medium' | 'high' | 'critical'
  lastUpdated   DateTime @default(now())
  
  @@unique([date, department, unit])
  @@index([date])
  @@index([department, date])
  @@index([conflictLevel])
}

// Optional: Availability Analytics Cache
model AvailabilityAnalytics {
  id              String   @id @default(cuid())
  date            DateTime
  department      String?
  unit            String?
  totalStaff      Int
  staffOnLeave    Int
  staffAvailable  Int
  availabilityRate Float   // Percentage available
  criticalRolesVacant Int  // Critical roles with no coverage
  lastUpdated     DateTime @default(now())
  
  @@unique([date, department, unit])
  @@index([date])
  @@index([availabilityRate])
}
```

**Note**: These cache tables are optional. The system can query `LeaveRequest` and `StaffMember` tables directly. Cache tables would improve performance for large organizations.

### 2.2 Existing Schema Usage

The system will leverage existing tables:
- `LeaveRequest` - For all leave data
- `StaffMember` - For staff information and organizational structure
- `Holiday` - For public holidays
- `ApprovalStep` - For approval status tracking

**No schema migration required** - we can use existing tables.

---

## 3. API Endpoints

### 3.1 Team Leave Calendar APIs

#### GET `/api/calendar/leave-calendar`
**Purpose**: Get leave calendar data for the current user's scope

**Query Parameters**:
- `startDate` (required): ISO date string
- `endDate` (required): ISO date string
- `department` (optional): Filter by department
- `unit` (optional): Filter by unit
- `leaveType` (optional): Filter by leave type
- `view` (optional): 'team' | 'department' | 'organization' (default based on role)

**Response**:
```typescript
{
  leaves: Array<{
    id: string
    staffId: string
    staffName: string
    leaveType: string
    startDate: string
    endDate: string
    days: number
    status: string
    department: string
    unit: string
    position: string
  }>
  holidays: Array<{
    id: string
    name: string
    date: string
    type: string
  }>
  conflicts: Array<{
    date: string
    department?: string
    unit?: string
    leaveCount: number
    threshold: number
    level: 'low' | 'medium' | 'high' | 'critical'
    staffOnLeave: Array<{
      staffId: string
      staffName: string
      position: string
    }>
  }>
  weekends: Array<string> // Array of weekend dates
}
```

**Access Control**:
- `EMPLOYEE`: Own leave only
- `SUPERVISOR`: Direct reports
- `UNIT_HEAD`: Unit staff
- `DIVISION_HEAD`: Division staff
- `DIRECTOR`: Directorate staff
- `HR_OFFICER`, `HR_DIRECTOR`, `CHIEF_DIRECTOR`: All staff
- `AUDITOR`: Read-only, all staff

#### GET `/api/calendar/conflicts`
**Purpose**: Get conflict detection data

**Query Parameters**:
- `startDate` (required)
- `endDate` (required)
- `department` (optional)
- `unit` (optional)
- `threshold` (optional): Percentage threshold for conflict (default: 30%)

**Response**:
```typescript
{
  conflicts: Array<{
    date: string
    department?: string
    unit?: string
    totalStaff: number
    staffOnLeave: number
    percentage: number
    level: 'low' | 'medium' | 'high' | 'critical'
    staffOnLeave: Array<{
      staffId: string
      staffName: string
      position: string
      leaveType: string
    }>
  }>
}
```

### 3.2 Workforce Availability Dashboard APIs

#### GET `/api/availability/today`
**Purpose**: Get who is on leave today

**Query Parameters**:
- `department` (optional)
- `unit` (optional)

**Response**:
```typescript
{
  date: string
  totalStaff: number
  staffOnLeave: number
  staffAvailable: number
  availabilityRate: number
  staffOnLeave: Array<{
    staffId: string
    staffName: string
    department: string
    unit: string
    position: string
    leaveType: string
    startDate: string
    endDate: string
    days: number
  }>
  byDepartment: Array<{
    department: string
    totalStaff: number
    staffOnLeave: number
    availabilityRate: number
  }>
  byUnit: Array<{
    unit: string
    totalStaff: number
    staffOnLeave: number
    availabilityRate: number
  }>
}
```

#### GET `/api/availability/upcoming`
**Purpose**: Get upcoming critical absences

**Query Parameters**:
- `days` (optional): Look ahead days (default: 30)
- `department` (optional)
- `unit` (optional)
- `criticalOnly` (optional): Only show critical roles (default: false)

**Response**:
```typescript
{
  upcoming: Array<{
    date: string
    staffId: string
    staffName: string
    position: string
    department: string
    unit: string
    leaveType: string
    startDate: string
    endDate: string
    days: number
    isCritical: boolean
    coverageAvailable: boolean
  }>
  criticalAbsences: Array<{
    date: string
    department: string
    unit: string
    criticalRole: string
    staffOnLeave: Array<{
      staffId: string
      staffName: string
    }>
    coverageStaff: Array<{
      staffId: string
      staffName: string
    }>
  }>
}
```

#### GET `/api/availability/density`
**Purpose**: Get leave density analytics

**Query Parameters**:
- `startDate` (required)
- `endDate` (required)
- `department` (optional)
- `unit` (optional)
- `granularity` (optional): 'day' | 'week' | 'month' (default: 'day')

**Response**:
```typescript
{
  density: Array<{
    period: string // Date or week/month identifier
    totalStaff: number
    avgStaffOnLeave: number
    peakDays: number
    peakDate?: string
    availabilityRate: number
    trend: 'increasing' | 'decreasing' | 'stable'
  }>
  peakPeriods: Array<{
    period: string
    date: string
    staffOnLeave: number
    percentage: number
  }>
  trends: {
    overall: 'increasing' | 'decreasing' | 'stable'
    byDepartment: Array<{
      department: string
      trend: 'increasing' | 'decreasing' | 'stable'
    }>
  }
}
```

---

## 4. Role-Based Access Control

### 4.1 Permission Definitions

Add to `lib/permissions.ts`:

```typescript
export type Permission =
  // ... existing permissions ...
  | 'calendar:view:own'           // View own leave on calendar
  | 'calendar:view:team'           // View team calendar
  | 'calendar:view:department'     // View department calendar
  | 'calendar:view:organization'   // View organization-wide calendar
  | 'availability:view:own'         // View own availability
  | 'availability:view:team'      // View team availability
  | 'availability:view:all'       // View all availability
```

### 4.2 Role Permissions Matrix

| Role | Calendar View | Availability View | Conflict Detection |
|------|--------------|-------------------|-------------------|
| **EMPLOYEE** | Own leave only | Own availability | No |
| **SUPERVISOR** | Direct reports | Team availability | Team conflicts only |
| **UNIT_HEAD** | Unit staff | Unit availability | Unit conflicts |
| **DIVISION_HEAD** | Division staff | Division availability | Division conflicts |
| **DIRECTOR** | Directorate staff | Directorate availability | Directorate conflicts |
| **REGIONAL_MANAGER** | Regional staff | Regional availability | Regional conflicts |
| **HR_OFFICER** | All staff | All availability | All conflicts |
| **HR_DIRECTOR** | All staff | All availability | All conflicts |
| **CHIEF_DIRECTOR** | All staff | All availability | All conflicts |
| **AUDITOR** | All staff (read-only) | All availability (read-only) | All conflicts (read-only) |

### 4.3 Permission Updates

Update `ROLE_PERMISSIONS` in `lib/permissions.ts`:

```typescript
EMPLOYEE: [
  // ... existing permissions ...
  'calendar:view:own',
  'availability:view:own',
],

SUPERVISOR: [
  // ... existing permissions ...
  'calendar:view:team',
  'availability:view:team',
],

UNIT_HEAD: [
  // ... existing permissions ...
  'calendar:view:team', // Unit level
  'availability:view:team', // Unit level
],

DIVISION_HEAD: [
  // ... existing permissions ...
  'calendar:view:team', // Division level
  'availability:view:team', // Division level
],

DIRECTOR: [
  // ... existing permissions ...
  'calendar:view:team', // Directorate level
  'availability:view:team', // Directorate level
],

REGIONAL_MANAGER: [
  // ... existing permissions ...
  'calendar:view:team', // Regional level
  'availability:view:team', // Regional level
],

HR_OFFICER: [
  // ... existing permissions ...
  'calendar:view:organization',
  'availability:view:all',
],

HR_DIRECTOR: [
  // ... existing permissions ...
  'calendar:view:organization',
  'availability:view:all',
],

CHIEF_DIRECTOR: [
  // ... existing permissions ...
  'calendar:view:organization',
  'availability:view:all',
],

AUDITOR: [
  // ... existing permissions ...
  'calendar:view:organization', // Read-only
  'availability:view:all', // Read-only
],
```

---

## 5. UI Components

### 5.1 Team Leave Calendar Component

**File**: `components/team-leave-calendar.tsx`

**Features**:
- Full calendar view (month/week/day)
- Color-coded leave types
- Public holidays highlighted
- Weekends grayed out
- Conflict indicators (red/yellow badges)
- Filter controls (department, unit, leave type)
- Role-based data scope
- Export to PDF/Excel
- Click to view leave details

**Props**:
```typescript
interface TeamLeaveCalendarProps {
  userRole: UserRole
  staffId?: string
  department?: string
  unit?: string
  view?: 'month' | 'week' | 'day'
}
```

### 5.2 Workforce Availability Dashboard Component

**File**: `components/workforce-availability-dashboard.tsx`

**Features**:
- Today's availability summary cards
- Upcoming critical absences list
- Leave density chart (line/bar chart)
- Department/unit availability breakdown
- Real-time updates
- Alert badges for critical situations
- Export capabilities

**Props**:
```typescript
interface WorkforceAvailabilityDashboardProps {
  userRole: UserRole
  staffId?: string
  department?: string
  unit?: string
}
```

### 5.3 Integration Points

#### Portal Integration (`components/portal.tsx`)

Add new tabs to the portal:

```typescript
case 'calendar':
  return (
    <PermissionGate permission="calendar:view:team" fallback={<UnauthorizedMessage />}>
      <TeamLeaveCalendar 
        userRole={userRole} 
        staffId={staffId}
        department={currentStaff?.department}
        unit={currentStaff?.unit}
      />
    </PermissionGate>
  )

case 'availability':
  return (
    <PermissionGate permission="availability:view:team" fallback={<UnauthorizedMessage />}>
      <WorkforceAvailabilityDashboard 
        userRole={userRole} 
        staffId={staffId}
        department={currentStaff?.department}
        unit={currentStaff?.unit}
      />
    </PermissionGate>
  )
```

#### Navigation Integration (`components/navigation.tsx`)

Add navigation items based on permissions:

```typescript
{hasPermission(userRole, 'calendar:view:team') && (
  <NavigationItem href="?tab=calendar" icon={Calendar}>
    Leave Calendar
  </NavigationItem>
)}

{hasPermission(userRole, 'availability:view:team') && (
  <NavigationItem href="?tab=availability" icon={Users}>
    Availability
  </NavigationItem>
)}
```

#### Dashboard Integration

Add widgets to role-specific dashboards:

- **Supervisor Dashboard**: Add "Team Calendar" and "Today's Availability" widgets
- **Unit Head Dashboard**: Add "Unit Calendar" and "Unit Availability" widgets
- **Director Dashboard**: Add "Directorate Calendar" and "Directorate Availability" widgets
- **HR Dashboards**: Add "Organization Calendar" and "Organization Availability" widgets

---

## 6. Implementation Steps

### Phase 1: Backend APIs (Week 1-2)

1. **Create Calendar API** (`app/api/calendar/leave-calendar/route.ts`)
   - Implement role-based filtering
   - Query `LeaveRequest` table with date range
   - Include holidays from `Holiday` table
   - Calculate weekends
   - Return formatted calendar data

2. **Create Conflict Detection API** (`app/api/calendar/conflicts/route.ts`)
   - Calculate conflicts based on threshold
   - Group by department/unit
   - Return conflict levels

3. **Create Availability APIs**
   - `app/api/availability/today/route.ts`
   - `app/api/availability/upcoming/route.ts`
   - `app/api/availability/density/route.ts`

4. **Update Permissions** (`lib/permissions.ts`)
   - Add new permission types
   - Update role permissions matrix

### Phase 2: UI Components (Week 2-3)

1. **Create Team Leave Calendar Component**
   - Use a calendar library (e.g., `react-big-calendar`, `fullcalendar`, or custom)
   - Implement filters
   - Add conflict indicators
   - Add export functionality

2. **Create Workforce Availability Dashboard**
   - Create summary cards
   - Create charts (use `recharts` - already in project)
   - Create upcoming absences list
   - Add real-time updates

3. **Integrate into Portal**
   - Add tabs to `portal.tsx`
   - Add navigation items
   - Add dashboard widgets

### Phase 3: Testing & Refinement (Week 3-4)

1. **Unit Tests**
   - Test API endpoints
   - Test permission checks
   - Test data filtering

2. **Integration Tests**
   - Test calendar view for each role
   - Test availability dashboard for each role
   - Test conflict detection

3. **Performance Optimization**
   - Add caching if needed
   - Optimize database queries
   - Add pagination for large datasets

### Phase 4: Documentation & Deployment (Week 4)

1. **User Documentation**
   - Create user guides
   - Add tooltips/help text
   - Create video tutorials (optional)

2. **Deployment**
   - Deploy to staging
   - User acceptance testing
   - Deploy to production

---

## 7. Technical Considerations

### 7.1 Calendar Library Selection

**Options**:
1. **react-big-calendar** - Popular, feature-rich
2. **fullcalendar** - Full-featured, good for complex views
3. **Custom implementation** - Full control, but more work

**Recommendation**: Use `react-big-calendar` for its simplicity and React integration.

### 7.2 Conflict Detection Algorithm

**Thresholds**:
- **Low**: < 20% of staff on leave
- **Medium**: 20-30% of staff on leave
- **High**: 30-50% of staff on leave
- **Critical**: > 50% of staff on leave

**Configuration**: Make thresholds configurable via `SystemSettings` table.

### 7.3 Performance Optimization

**For Large Organizations**:
1. Implement pagination for calendar views
2. Cache calendar data (optional `CalendarCache` table)
3. Use database indexes on `startDate`, `endDate`, `department`, `unit`
4. Implement lazy loading for calendar months

**Database Indexes** (already exist in schema):
- `LeaveRequest`: Index on `startDate`, `endDate`, `status`
- `StaffMember`: Index on `department`, `unit`

### 7.4 Real-Time Updates

**Implementation**:
- Use existing `useRealtime` hook
- Subscribe to leave request updates
- Refresh calendar/availability on changes
- Use WebSocket or polling (already implemented)

---

## 8. Security & Compliance

### 8.1 Data Privacy

- **Role-based filtering**: Enforced at API level
- **Audit logging**: Log all calendar/availability views (use existing `AuditLog` table)
- **Data access logs**: Track who viewed what (use existing `DataAccessLog` table)

### 8.2 Access Control

- **API-level RBAC**: All endpoints check permissions
- **UI-level gates**: Use `PermissionGate` component
- **Data filtering**: Server-side filtering based on role

### 8.3 Compliance

- **MoFA Requirements**: Follow existing approval workflow
- **Data Protection**: Comply with Data Protection Act 843
- **Audit Trail**: All views logged for compliance

---

## 9. User Experience Enhancements

### 9.1 Calendar Features

- **Color coding**: Different colors for leave types
- **Tooltips**: Show leave details on hover
- **Quick filters**: Preset filters (This Month, Next Month, This Quarter)
- **Export options**: PDF, Excel, iCal

### 9.2 Availability Dashboard Features

- **Alert badges**: Visual indicators for critical situations
- **Trend indicators**: Up/down arrows for availability trends
- **Drill-down**: Click to see detailed breakdown
- **Notifications**: Alert managers when conflicts detected

---

## 10. Success Metrics

### 10.1 Adoption Metrics

- % of managers using calendar weekly
- % of HR using availability dashboard daily
- Average session time on calendar/availability pages

### 10.2 Business Impact

- Reduction in leave conflicts
- Improved workforce planning
- Faster response to availability issues

---

## 11. Future Enhancements

### 11.1 Advanced Features

- **Leave request from calendar**: Click date to request leave
- **Coverage assignment**: Assign coverage for critical absences
- **Predictive analytics**: Predict future availability issues
- **Mobile app integration**: Calendar/availability on mobile

### 11.2 Integrations

- **Outlook/Google Calendar**: Sync leave calendar
- **Slack/Teams**: Availability notifications
- **HRIS Integration**: Sync with external HR systems

---

## 12. Files to Create/Modify

### New Files

1. `app/api/calendar/leave-calendar/route.ts`
2. `app/api/calendar/conflicts/route.ts`
3. `app/api/availability/today/route.ts`
4. `app/api/availability/upcoming/route.ts`
5. `app/api/availability/density/route.ts`
6. `components/team-leave-calendar.tsx`
7. `components/workforce-availability-dashboard.tsx`
8. `lib/calendar-utils.ts` (utility functions)
9. `lib/conflict-detection.ts` (conflict detection logic)

### Modified Files

1. `lib/permissions.ts` - Add new permissions
2. `components/portal.tsx` - Add calendar/availability tabs
3. `components/navigation.tsx` - Add navigation items
4. `components/supervisor-dashboard.tsx` - Add widgets
5. `components/unit-head-dashboard.tsx` - Add widgets
6. `components/director-dashboard.tsx` - Add widgets
7. `components/hr-officer-dashboard.tsx` - Add widgets
8. `components/hr-director-dashboard.tsx` - Add widgets

---

## 13. Dependencies

### New NPM Packages

```json
{
  "react-big-calendar": "^1.8.0",
  "date-fns": "^2.30.0" // If not already installed
}
```

### Existing Packages (Already in Project)

- `recharts` - For charts
- `lucide-react` - For icons
- `@radix-ui/*` - For UI components

---

## 14. Conclusion

This integration plan provides a comprehensive roadmap for adding Team Leave Calendar and Workforce Availability Dashboard features to the MoFA leave management system. The implementation leverages existing infrastructure, follows established patterns, and maintains security and compliance requirements.

**Key Benefits**:
- ✅ No database schema changes required (uses existing tables)
- ✅ Leverages existing RBAC system
- ✅ Follows existing code patterns
- ✅ Maintains security and compliance
- ✅ Scalable and performant
- ✅ Role-based access control enforced

**Next Steps**:
1. Review and approve this plan
2. Assign development resources
3. Begin Phase 1 implementation
4. Schedule regular progress reviews

---

**Document Version**: 1.0  
**Last Updated**: December 2024  
**Status**: Ready for Implementation

