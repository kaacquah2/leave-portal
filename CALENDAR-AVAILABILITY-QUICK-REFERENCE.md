# Team Calendar & Availability Dashboard - Quick Reference

## 🎯 Quick Summary

### Features to Integrate
1. **Team Leave Calendar** - Visual calendar with conflict detection
2. **Workforce Availability Dashboard** - Real-time availability tracking

### Role-Based Access

| Role | Calendar Access | Availability Access |
|------|----------------|---------------------|
| **EMPLOYEE** | Own leave only | Own availability |
| **SUPERVISOR** | Direct reports | Team availability |
| **UNIT_HEAD** | Unit staff | Unit availability |
| **DIVISION_HEAD** | Division staff | Division availability |
| **DIRECTOR** | Directorate staff | Directorate availability |
| **REGIONAL_MANAGER** | Regional staff | Regional availability |
| **HR_OFFICER** | All staff | All availability |
| **HR_DIRECTOR** | All staff | All availability |
| **CHIEF_DIRECTOR** | All staff | All availability |
| **AUDITOR** | All (read-only) | All (read-only) |

---

## 📋 API Endpoints Summary

### Calendar APIs
- `GET /api/calendar/leave-calendar` - Get calendar data
- `GET /api/calendar/conflicts` - Get conflict detection

### Availability APIs
- `GET /api/availability/today` - Who's on leave today
- `GET /api/availability/upcoming` - Upcoming critical absences
- `GET /api/availability/density` - Leave density analytics

---

## 🔑 Key Permissions to Add

```typescript
'calendar:view:own'
'calendar:view:team'
'calendar:view:department'
'calendar:view:organization'
'availability:view:own'
'availability:view:team'
'availability:view:all'
```

---

## 📁 Files to Create

### Backend
- `app/api/calendar/leave-calendar/route.ts`
- `app/api/calendar/conflicts/route.ts`
- `app/api/availability/today/route.ts`
- `app/api/availability/upcoming/route.ts`
- `app/api/availability/density/route.ts`
- `lib/calendar-utils.ts`
- `lib/conflict-detection.ts`

### Frontend
- `components/team-leave-calendar.tsx`
- `components/workforce-availability-dashboard.tsx`

---

## 🔧 Files to Modify

1. `lib/permissions.ts` - Add new permissions
2. `components/portal.tsx` - Add calendar/availability tabs
3. `components/navigation.tsx` - Add nav items
4. Role-specific dashboards - Add widgets

---

## 📊 Database Usage

**No schema changes needed!** Uses existing tables:
- `LeaveRequest` - For leave data
- `StaffMember` - For staff info
- `Holiday` - For public holidays
- `ApprovalStep` - For approval status

---

## 🚀 Implementation Phases

1. **Phase 1**: Backend APIs (Week 1-2)
2. **Phase 2**: UI Components (Week 2-3)
3. **Phase 3**: Testing & Refinement (Week 3-4)
4. **Phase 4**: Documentation & Deployment (Week 4)

---

## 📦 New Dependencies

```json
{
  "react-big-calendar": "^1.8.0",
  "date-fns": "^2.30.0"
}
```

---

## ⚙️ Conflict Detection Thresholds

- **Low**: < 20% on leave
- **Medium**: 20-30% on leave
- **High**: 30-50% on leave
- **Critical**: > 50% on leave

---

## ✅ Key Benefits

- ✅ No database migration required
- ✅ Uses existing RBAC system
- ✅ Follows existing code patterns
- ✅ Maintains security & compliance
- ✅ Scalable architecture

---

**For detailed implementation plan, see**: `TEAM-CALENDAR-AVAILABILITY-INTEGRATION-PLAN.md`

