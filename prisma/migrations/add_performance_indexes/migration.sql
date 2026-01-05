-- Add performance indexes identified in end-to-end audit
-- These indexes optimize common query patterns and role-based filtering

-- LeaveRequest indexes for common query patterns
CREATE INDEX IF NOT EXISTS "idx_leave_request_staff_status_created" 
ON "LeaveRequest"("staffId", "status", "createdAt");

-- StaffMember indexes for unit/directorate filtering
CREATE INDEX IF NOT EXISTS "idx_staff_member_unit_active" 
ON "StaffMember"("unit", "active");

CREATE INDEX IF NOT EXISTS "idx_staff_member_directorate_active" 
ON "StaffMember"("directorate", "active");

-- Composite index for supervisor queries (if not already covered)
CREATE INDEX IF NOT EXISTS "idx_staff_member_manager_active" 
ON "StaffMember"("managerId", "active") 
WHERE "managerId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_staff_member_supervisor_active" 
ON "StaffMember"("immediateSupervisorId", "active") 
WHERE "immediateSupervisorId" IS NOT NULL;

-- LeaveBalance indexes for pagination and filtering
CREATE INDEX IF NOT EXISTS "idx_leave_balance_staff_created" 
ON "LeaveBalance"("staffId", "createdAt");

-- User indexes for role-based queries (if not already exists)
CREATE INDEX IF NOT EXISTS "idx_user_role_active" 
ON "User"("role", "active");

-- Notification indexes for unread notifications (if not already exists)
CREATE INDEX IF NOT EXISTS "idx_notification_user_read_created" 
ON "Notification"("userId", "read", "createdAt");

-- Payroll indexes for period queries
CREATE INDEX IF NOT EXISTS "idx_payroll_period_status" 
ON "Payroll"("period", "status");

CREATE INDEX IF NOT EXISTS "idx_payroll_item_staff_period" 
ON "PayrollItem"("staffId", "payrollId");

-- SalaryStructure indexes for active structures
CREATE INDEX IF NOT EXISTS "idx_salary_structure_staff_active" 
ON "SalaryStructure"("staffId", "effectiveDate", "endDate");

