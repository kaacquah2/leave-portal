/**
 * Common Data Types
 * 
 * Shared type definitions for common data structures used across the application.
 * These types should match the Prisma schema where applicable.
 */

/**
 * Staff Member interface
 * Matches Prisma StaffMember model
 */
export interface StaffMember {
  id: string
  staffId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  department: string
  position: string
  grade: string
  level: string
  rank?: string | null
  step?: string | null
  directorate?: string | null
  division?: string | null
  unit?: string | null
  dutyStation?: string | null
  photoUrl?: string | null
  active: boolean
  employmentStatus?: string | null
  terminationDate?: string | null
  terminationReason?: string | null
  joinDate: string
  managerId?: string | null
  immediateSupervisorId?: string | null
  createdAt: string
  updatedAt?: string | null
}

/**
 * Leave Request interface
 * Matches Prisma LeaveRequest model
 */
export interface LeaveRequest {
  id: string
  staffId: string
  staffName: string
  leaveType: 'Annual' | 'Sick' | 'Unpaid' | 'Special Service' | 'Training' | 'Study' | 'Maternity' | 'Paternity' | 'Compassionate'
  startDate: string
  endDate: string
  days: number
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  approvedBy?: string | null
  approvalDate?: string | null
  approvalLevels?: LeaveApprovalLevel[] | null
  templateId?: string | null
  officerTakingOver?: string | null
  handoverNotes?: string | null
  declarationAccepted?: boolean | null
  payrollImpactFlag?: boolean | null
  locked?: boolean | null
  createdAt: string
  updatedAt?: string | null
}

/**
 * Leave Approval Level
 */
export interface LeaveApprovalLevel {
  level: number
  approverRole: string
  approverId?: string | null
  approverName?: string | null
  status: 'pending' | 'approved' | 'rejected'
  comments?: string | null
  approvedAt?: string | null
}

/**
 * Leave Balance interface
 * Matches Prisma LeaveBalance model
 */
export interface LeaveBalance {
  id?: string
  staffId: string
  annual: number
  sick: number
  unpaid: number
  specialService: number
  training: number
  study: number
  maternity: number
  paternity: number
  compassionate: number
}

/**
 * Audit Log interface
 * Matches Prisma AuditLog model
 */
export interface AuditLog {
  id: string
  action: string
  user: string
  userRole?: string | null
  staffId?: string | null
  leaveRequestId?: string | null
  details: string
  timestamp: string
  ip?: string | null
  userAgent?: string | null
  metadata?: any
}

/**
 * Payslip interface
 */
export interface Payslip {
  id: string
  staffId: string
  month: string // YYYY-MM format
  year: number
  basicSalary: number
  allowances: number
  deductions: number
  netSalary: number
  tax: number
  pension: number
  createdAt: string
  pdfUrl?: string | null
}

/**
 * Performance Review interface
 */
export interface PerformanceReview {
  id: string
  staffId: string
  reviewPeriod: string // e.g., "2024 Q1"
  rating: number
  comments?: string | null
  reviewerId?: string | null
  createdAt: string
}

/**
 * User Context for data scoping
 */
export interface UserContext {
  id: string
  role: string
  staffId?: string | null
}

/**
 * Staff Context for organizational scoping
 */
export interface StaffContext {
  staffId: string
  unit?: string | null
  directorate?: string | null
  division?: string | null
  dutyStation?: string | null
  managerId?: string | null
  immediateSupervisorId?: string | null
}

/**
 * Leave Approval Level
 */
export interface LeaveApprovalLevel {
  level: number
  approverRole: string
  approverId?: string | null
  approverName?: string | null
  status: 'pending' | 'approved' | 'rejected'
  comments?: string | null
  approvedAt?: string | null
}

