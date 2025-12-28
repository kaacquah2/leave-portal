# API Documentation
## HR Leave Portal - REST API Reference

**Base URL**: `http://localhost:3000/api` (development)  
**Version**: 1.0

---

## 🔐 Authentication

All API endpoints require authentication via session cookie.

### Login
```
POST /api/auth/login
Body: { email, password }
Response: { user, token }
```

### Logout
```
POST /api/auth/logout
Response: { success: true }
```

### Get Current User
```
GET /api/auth/me
Response: { id, email, role, staffId }
```

---

## 👥 Staff Management

### Get All Staff
```
GET /api/staff
Roles: hr, admin, manager
Response: StaffMember[]
```

### Get Single Staff
```
GET /api/staff/[id]
Roles: hr, admin, manager
Response: StaffMember
```

### Create Staff
```
POST /api/staff
Roles: hr, admin
Body: { staffId, firstName, lastName, email, phone, department, position, grade, level, joinDate, managerId? }
Response: StaffMember
```

### Update Staff
```
PATCH /api/staff/[id]
Roles: hr, admin
Body: { ...updates }
Response: StaffMember
```

### Assign Manager
```
PATCH /api/staff/[id]/assign-manager
Roles: hr, admin
Body: { managerId: string | null }
Response: StaffMember
```

### Bulk Assign Manager
```
POST /api/staff/bulk-assign-manager
Roles: hr, admin
Body: { staffIds: string[], managerId: string | null }
Response: { success, processed, failed, results }
```

---

## 📝 Leave Management

### Get All Leaves
```
GET /api/leaves
Roles: hr, admin, employee, manager
Query: ?status=pending&department=IT
Response: LeaveRequest[]
```

### Get Single Leave
```
GET /api/leaves/[id]
Roles: hr, admin, employee, manager
Response: LeaveRequest
```

### Create Leave Request
```
POST /api/leaves
Roles: hr, admin, employee, manager
Body: {
  staffId, staffName, leaveType, startDate, endDate,
  days, reason, templateId?, approvalLevels?
}
Response: LeaveRequest
```

### Update Leave (Approve/Reject)
```
PATCH /api/leaves/[id]
Roles: hr, admin, manager
Body: { status: 'approved' | 'rejected', approvedBy, comments?, level? }
Response: LeaveRequest
```

### Cancel Leave
```
POST /api/leaves/[id]/cancel
Roles: hr, admin, employee
Response: LeaveRequest
```

### Bulk Approve/Reject
```
POST /api/leaves/bulk
Roles: hr, admin
Body: { leaveIds: string[], action: 'approved' | 'rejected', comments? }
Response: { success, processed, failed, results }
```

### Calculate Leave Days
```
GET /api/leaves/calculate-days?startDate=2024-01-01&endDate=2024-01-10
Roles: hr, admin, employee, manager
Response: { totalDays, workingDays, holidays }
```

---

## 💰 Leave Balances

### Get All Balances
```
GET /api/balances
Roles: hr, admin
Response: LeaveBalance[]
```

### Get Staff Balance
```
GET /api/balances/[staffId]
Roles: hr, admin, employee, manager
Response: LeaveBalance
```

### Update Balance
```
POST /api/balances
Roles: hr, admin
Body: { staffId, annual?, sick?, ... }
Response: LeaveBalance
```

---

## ⚙️ Leave Policies

### Get All Policies
```
GET /api/leave-policies
Roles: hr, admin
Response: LeavePolicy[]
```

### Create Policy
```
POST /api/leave-policies
Roles: hr, admin
Body: { leaveType, maxDays, accrualRate, ... }
Response: LeavePolicy
```

### Update Policy
```
PATCH /api/leave-policies/[id]
Roles: hr, admin
Body: { ...updates }
Response: LeavePolicy
```

---

## 📅 Holidays

### Get All Holidays
```
GET /api/holidays
Roles: hr, admin
Response: Holiday[]
```

### Create Holiday
```
POST /api/holidays
Roles: hr, admin
Body: { name, date, type, recurring, year? }
Response: Holiday
```

---

## ✅ Approvals

### Get Approval History
```
GET /api/approvals/history?leaveRequestId=xxx
Roles: hr, admin, employee, manager
Response: ApprovalHistory[]
```

### Send Reminders
```
POST /api/approvals/reminders
Roles: hr, admin
Body: { leaveIds: string[], sendEmail: boolean }
Response: { success, notified, failed, results }
```

### Get Pending Reminders
```
GET /api/approvals/reminders
Roles: hr, admin
Response: { pendingLeaves, reminderDays, thresholdDate }
```

---

## 📊 Monitoring

### System Health
```
GET /api/monitoring/health
Roles: hr, admin
Response: { health: SystemHealth, alerts: BusinessAlert[] }
```

---

## 📋 Audit Logs

### Get Audit Logs
```
GET /api/audit-logs?limit=100
Roles: hr, admin
Response: AuditLog[]
```

### Get Single Audit Log
```
GET /api/audit-logs/[id]
Roles: hr, admin
Response: AuditLog
```

**Note**: Audit logs are immutable - DELETE and PATCH return 403.

---

## 🔄 Accrual

### Process Accrual
```
POST /api/accrual/process
Roles: hr, admin
Body: {
  accrualDate?, staffIds?, leaveTypes?,
  processExpiration?, processCarryForward?
}
Response: { success, processed, results, errors }
```

### Get Accrual Status
```
GET /api/accrual/process
Roles: hr, admin
Response: { lastAccrualDate, recentHistory, statistics }
```

---

## 📄 Error Responses

All errors follow this format:
```json
{
  "error": "Error message",
  "errorCode": "ERROR_CODE",
  "troubleshooting": ["Step 1", "Step 2", ...]
}
```

### Common Error Codes

- `PERMISSION_DENIED`: User doesn't have required role
- `VALIDATION_ERROR`: Invalid input data
- `INSUFFICIENT_BALANCE`: Insufficient leave balance
- `OVERLAPPING_LEAVE`: Overlapping leave request exists
- `LEAVE_NOT_FOUND`: Leave request not found
- `STAFF_NOT_FOUND`: Staff member not found
- `IMMUTABLE_RECORD`: Record cannot be modified/deleted

---

**End of API Documentation**

