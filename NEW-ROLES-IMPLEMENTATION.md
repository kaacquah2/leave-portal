# New Roles Implementation
## Deputy Director & HR Assistant Roles

**Implementation Date:** December 2024  
**Status:** ✅ **COMPLETE**

---

## 📋 Summary

Two new roles have been added to better align with the Ministry of Fisheries and Aquaculture Development organizational structure:

1. **Deputy Director** (`deputy_director`)
2. **HR Assistant** (`hr_assistant`)

---

## 🎯 Deputy Director Role

### **Purpose:**
- Represents Deputy Directors in the Ministry structure
- Provides directorate-level approval capabilities
- Sits between Manager and HR in the hierarchy

### **Permissions:**
- ✅ View all employees in their directorate
- ✅ Approve leave for entire directorate
- ✅ View directorate leave calendar
- ✅ Review directorate performance
- ✅ Approve directorate timesheets
- ✅ View directorate reports
- ✅ Manage directorate disciplinary actions
- ✅ Delegate approvals

### **Ministry Mapping:**
- Deputy Directors of Directorates
- Can approve across multiple units/sections within their directorate

### **Approval Workflow:**
- Supports 3-level approval: Supervisor → Deputy Director → Director → HR
- Can approve leaves that require directorate-level approval

---

## 👥 HR Assistant Role

### **Purpose:**
- Restricted HR access for data entry and document management
- Separation of duties for HR functions
- Security best practice

### **Permissions:**
- ✅ View all employees
- ✅ Update basic employee information (not salary/contracts)
- ✅ Upload documents
- ✅ View all leaves
- ✅ Create leave requests on behalf of staff
- ✅ View performance reviews
- ✅ View attendance data
- ✅ View HR reports

### **Restrictions:**
- ❌ Cannot delete employees
- ❌ Cannot terminate employees
- ❌ Cannot edit salaries/contracts
- ❌ Cannot approve leaves (unless delegated)
- ❌ Cannot manage leave policies
- ❌ Cannot manage disciplinary actions

### **Ministry Mapping:**
- HR Assistants
- Junior HR staff
- Data entry personnel

---

## 🔧 Implementation Details

### **Files Updated:**

1. **`lib/permissions.ts`**
   - Added `deputy_director` and `hr_assistant` to `UserRole` type
   - Added permission matrices for both roles
   - Updated `ROLE_PERMISSIONS` record

2. **`prisma/schema.prisma`**
   - Updated User model role comment to include new roles

3. **`app/page.tsx`**
   - Updated role type definitions
   - Added routing for new roles (hr_assistant → /hr, deputy_director → /manager)

4. **`components/portal.tsx`**
   - Updated `PortalProps` interface
   - Added role handling for new roles
   - Updated role background colors

5. **`components/navigation.tsx`**
   - Updated role type
   - Added navigation items for new roles
   - Updated role-based menu visibility

6. **`components/header.tsx`**
   - Updated role type
   - Added role configurations for new roles

7. **`components/leave-calendar-view.tsx`**
   - Updated role type

---

## 📊 Role Hierarchy

```
Admin (Full System Access)
  │
  ├── HR (Full HR Access)
  │     │
  │     └── HR Assistant (Restricted HR Access)
  │
  ├── Deputy Director (Directorate-Level Access)
  │     │
  │     └── Manager (Team-Level Access)
  │
  └── Employee (Self-Service Only)
```

---

## ✅ Testing Checklist

- [x] Role types updated in permissions system
- [x] Database schema updated
- [x] Authentication routing updated
- [x] Portal component updated
- [x] Navigation updated
- [x] Header updated
- [ ] User creation with new roles (requires database migration)
- [ ] Permission checks tested
- [ ] Approval workflow tested with new roles

---

## 🚀 Next Steps

1. **Database Migration:**
   - No migration needed (role is stored as String)
   - Existing users can be updated via admin panel

2. **User Creation:**
   - Create users with new roles via admin panel
   - Or update existing users' roles

3. **Testing:**
   - Test deputy_director approval workflow
   - Test hr_assistant restricted access
   - Verify navigation and permissions

---

## 📝 Usage Examples

### **Creating a Deputy Director User:**
```typescript
// Via API or admin panel
{
  email: "deputy.director@mofad.gov.gh",
  role: "deputy_director",
  staffId: "MFA-DD-001"
}
```

### **Creating an HR Assistant User:**
```typescript
// Via API or admin panel
{
  email: "hr.assistant@mofad.gov.gh",
  role: "hr_assistant",
  staffId: "MFA-HRA-001"
}
```

---

## ✅ Status

**Implementation:** ✅ **COMPLETE**  
**Testing:** ⚠️ **PENDING**  
**Documentation:** ✅ **COMPLETE**

---

**Ready for testing and deployment!** 🚀

