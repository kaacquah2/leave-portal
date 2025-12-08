// Client-side data store with Neon database API calls
import { useEffect, useState, useCallback } from 'react'

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
  photoUrl?: string
  active: boolean
  joinDate: string
  createdAt: string
}

export interface LeaveRequest {
  id: string
  staffId: string
  staffName: string
  leaveType: 'Annual' | 'Sick' | 'Unpaid' | 'Special Service' | 'Training'
  startDate: string
  endDate: string
  days: number
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  approvedBy?: string
  approvalDate?: string
  approvalLevels?: LeaveApprovalLevel[]
  templateId?: string
  createdAt: string
}

export interface LeaveBalance {
  id?: string
  staffId: string
  annual: number
  sick: number
  unpaid: number
  specialService: number
  training: number
}

export interface AuditLog {
  id: string
  action: string
  user: string
  staffId?: string
  details: string
  timestamp: string
  ip?: string
}

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
  pdfUrl?: string
}

export interface PerformanceReview {
  id: string
  staffId: string
  reviewPeriod: string // e.g., "2024 Q1"
  reviewDate: string
  reviewedBy: string
  rating: number // 1-5
  strengths: string[]
  areasForImprovement: string[]
  goals: string[]
  comments: string
  status: 'draft' | 'completed'
  createdAt: string
}

export interface LeavePolicy {
  id: string
  leaveType: 'Annual' | 'Sick' | 'Unpaid' | 'Special Service' | 'Training'
  maxDays: number
  accrualRate: number // days per month
  carryoverAllowed: boolean
  maxCarryover: number
  requiresApproval: boolean
  approvalLevels: number // 1 = manager, 2 = manager + HR
  active: boolean
  createdAt: string
}

export interface Holiday {
  id: string
  name: string
  date: string // YYYY-MM-DD
  type: 'public' | 'company' | 'regional'
  recurring: boolean
  year?: number | null // null if recurring
  createdAt: string
}

export interface LeaveApprovalLevel {
  level: number
  approverRole: 'manager' | 'hr'
  status: 'pending' | 'approved' | 'rejected'
  approverName?: string
  approvalDate?: string
  comments?: string
}

export interface LeaveRequestTemplate {
  id: string
  name: string
  leaveType: 'Annual' | 'Sick' | 'Unpaid' | 'Special Service' | 'Training'
  defaultDays: number
  defaultReason: string
  department?: string | null // optional: department-specific
  active: boolean
  createdAt: string
}

// Helper function to transform database dates to strings
function transformDates(data: any): any {
  if (!data) return data
  if (Array.isArray(data)) {
    return data.map(transformDates)
  }
  if (typeof data === 'object') {
    const transformed: any = {}
    for (const [key, value] of Object.entries(data)) {
      if (value instanceof Date) {
        transformed[key] = value.toISOString()
      } else if (key === 'date' && typeof value === 'string') {
        // Keep date strings as-is
        transformed[key] = value
      } else if (key === 'startDate' || key === 'endDate' || key === 'joinDate' || key === 'reviewDate' || key === 'approvalDate') {
        transformed[key] = value instanceof Date ? value.toISOString() : value
      } else if (Array.isArray(value)) {
        transformed[key] = value.map(transformDates)
      } else if (value && typeof value === 'object') {
        transformed[key] = transformDates(value)
      } else {
        transformed[key] = value
      }
    }
    return transformed
  }
  return data
}

export function useDataStore() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [performanceReviews, setPerformanceReviews] = useState<PerformanceReview[]>([])
  const [leavePolicies, setLeavePolicies] = useState<LeavePolicy[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [leaveTemplates, setLeaveTemplates] = useState<LeaveRequestTemplate[]>([])
  const [initialized, setInitialized] = useState(false)
  const [loading, setLoading] = useState(true)

  // Fetch all data from API
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true)
      const [staffRes, leavesRes, balancesRes, payslipsRes, reviewsRes, policiesRes, holidaysRes, templatesRes, auditRes] = await Promise.all([
        fetch('/api/staff').catch(() => ({ ok: false })),
        fetch('/api/leaves').catch(() => ({ ok: false })),
        fetch('/api/balances').catch(() => ({ ok: false })),
        fetch('/api/payslips').catch(() => ({ ok: false })),
        fetch('/api/performance-reviews').catch(() => ({ ok: false })),
        fetch('/api/leave-policies').catch(() => ({ ok: false })),
        fetch('/api/holidays').catch(() => ({ ok: false })),
        fetch('/api/leave-templates').catch(() => ({ ok: false })),
        fetch('/api/audit-logs?limit=100').catch(() => ({ ok: false })),
      ])

      if (staffRes.ok) {
        const data = await staffRes.json()
        setStaff(transformDates(data))
      }
      if (leavesRes.ok) {
        const data = await leavesRes.json()
        setLeaves(transformDates(data))
      }
      if (balancesRes.ok) {
        const data = await balancesRes.json()
        setBalances(transformDates(data))
      }
      if (payslipsRes.ok) {
        const data = await payslipsRes.json()
        setPayslips(transformDates(data))
      }
      if (reviewsRes.ok) {
        const data = await reviewsRes.json()
        setPerformanceReviews(transformDates(data))
      }
      if (policiesRes.ok) {
        const data = await policiesRes.json()
        setLeavePolicies(transformDates(data))
      }
      if (holidaysRes.ok) {
        const data = await holidaysRes.json()
        setHolidays(transformDates(data))
      }
      if (templatesRes.ok) {
        const data = await templatesRes.json()
        setLeaveTemplates(transformDates(data))
      }
      if (auditRes.ok) {
        const data = await auditRes.json()
        setAuditLogs(transformDates(data))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
      setInitialized(true)
    }
  }, [])

  // Initialize from API
  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const addStaff = async (member: Omit<StaffMember, 'id' | 'createdAt'>) => {
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(member),
      })
      if (!res.ok) throw new Error('Failed to create staff')
      const newMember = transformDates(await res.json())
      setStaff((prev) => [...prev, newMember])
      await logAudit('CREATE_STAFF', 'HR Officer', member.staffId, `Created staff member ${member.firstName} ${member.lastName}`)
      return newMember
    } catch (error) {
      console.error('Error adding staff:', error)
      throw error
    }
  }

  const updateStaff = async (id: string, updates: Partial<StaffMember>) => {
    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update staff')
      const updated = transformDates(await res.json())
      setStaff((prev) => prev.map((s) => (s.id === id ? updated : s)))
      await logAudit('UPDATE_STAFF', 'HR Officer', id, `Updated staff member details`)
    } catch (error) {
      console.error('Error updating staff:', error)
      throw error
    }
  }

  const addLeaveRequest = async (request: Omit<LeaveRequest, 'id' | 'createdAt' | 'status'>) => {
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })
      if (!res.ok) throw new Error('Failed to create leave request')
      const newRequest = transformDates(await res.json())
      setLeaves((prev) => [...prev, newRequest])
      await logAudit('CREATE_LEAVE', 'Staff', request.staffId, `Submitted ${request.leaveType} leave request for ${request.days} days`)
      return newRequest
    } catch (error) {
      console.error('Error adding leave request:', error)
      throw error
    }
  }

  const updateLeaveRequest = async (id: string, status: 'approved' | 'rejected', approvedBy: string, level?: number) => {
    try {
      const res = await fetch(`/api/leaves/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, approvedBy, level }),
      })
      if (!res.ok) throw new Error('Failed to update leave request')
      const updated = transformDates(await res.json())
      setLeaves((prev) => prev.map((l) => (l.id === id ? updated : l)))
      await logAudit('UPDATE_LEAVE', approvedBy, id, `${status === 'approved' ? 'Approved' : 'Rejected'} leave request`)
    } catch (error) {
      console.error('Error updating leave request:', error)
      throw error
    }
  }

  const addLeavePolicy = async (policy: Omit<LeavePolicy, 'id' | 'createdAt'>) => {
    try {
      const res = await fetch('/api/leave-policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policy),
      })
      if (!res.ok) throw new Error('Failed to create leave policy')
      const newPolicy = transformDates(await res.json())
      setLeavePolicies((prev) => [...prev, newPolicy])
      await logAudit('CREATE_LEAVE_POLICY', 'HR Officer', undefined, `Created leave policy for ${policy.leaveType}`)
      return newPolicy
    } catch (error) {
      console.error('Error adding leave policy:', error)
      throw error
    }
  }

  const updateLeavePolicy = async (id: string, updates: Partial<LeavePolicy>) => {
    try {
      const res = await fetch(`/api/leave-policies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update leave policy')
      const updated = transformDates(await res.json())
      setLeavePolicies((prev) => prev.map((p) => (p.id === id ? updated : p)))
      await logAudit('UPDATE_LEAVE_POLICY', 'HR Officer', undefined, `Updated leave policy`)
    } catch (error) {
      console.error('Error updating leave policy:', error)
      throw error
    }
  }

  const addHoliday = async (holiday: Omit<Holiday, 'id' | 'createdAt'>) => {
    try {
      const res = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(holiday),
      })
      if (!res.ok) throw new Error('Failed to create holiday')
      const newHoliday = transformDates(await res.json())
      setHolidays((prev) => [...prev, newHoliday])
      await logAudit('CREATE_HOLIDAY', 'HR Officer', undefined, `Created holiday: ${holiday.name}`)
      return newHoliday
    } catch (error) {
      console.error('Error adding holiday:', error)
      throw error
    }
  }

  const updateHoliday = async (id: string, updates: Partial<Holiday>) => {
    try {
      const res = await fetch(`/api/holidays/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update holiday')
      const updated = transformDates(await res.json())
      setHolidays((prev) => prev.map((h) => (h.id === id ? updated : h)))
      await logAudit('UPDATE_HOLIDAY', 'HR Officer', undefined, `Updated holiday`)
    } catch (error) {
      console.error('Error updating holiday:', error)
      throw error
    }
  }

  const deleteHoliday = async (id: string) => {
    try {
      const res = await fetch(`/api/holidays/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete holiday')
      setHolidays((prev) => prev.filter((h) => h.id !== id))
      await logAudit('DELETE_HOLIDAY', 'HR Officer', undefined, `Deleted holiday`)
    } catch (error) {
      console.error('Error deleting holiday:', error)
      throw error
    }
  }

  const addLeaveTemplate = async (template: Omit<LeaveRequestTemplate, 'id' | 'createdAt'>) => {
    try {
      const res = await fetch('/api/leave-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      })
      if (!res.ok) throw new Error('Failed to create leave template')
      const newTemplate = transformDates(await res.json())
      setLeaveTemplates((prev) => [...prev, newTemplate])
      await logAudit('CREATE_LEAVE_TEMPLATE', 'HR Officer', undefined, `Created leave template: ${template.name}`)
      return newTemplate
    } catch (error) {
      console.error('Error adding leave template:', error)
      throw error
    }
  }

  const updateLeaveTemplate = async (id: string, updates: Partial<LeaveRequestTemplate>) => {
    try {
      const res = await fetch(`/api/leave-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update leave template')
      const updated = transformDates(await res.json())
      setLeaveTemplates((prev) => prev.map((t) => (t.id === id ? updated : t)))
      await logAudit('UPDATE_LEAVE_TEMPLATE', 'HR Officer', undefined, `Updated leave template`)
    } catch (error) {
      console.error('Error updating leave template:', error)
      throw error
    }
  }

  const logAudit = async (action: string, user: string, staffId: string | undefined, details: string) => {
    try {
      const res = await fetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
      action,
      user,
      staffId,
      details,
        }),
      })
      if (res.ok) {
        const log = transformDates(await res.json())
        setAuditLogs((prev) => [log, ...prev])
      }
    } catch (error) {
      console.error('Error logging audit:', error)
    }
  }

  return {
    staff,
    leaves,
    balances,
    auditLogs,
    payslips,
    performanceReviews,
    leavePolicies,
    holidays,
    leaveTemplates,
    initialized,
    loading,
    addStaff,
    updateStaff,
    addLeaveRequest,
    updateLeaveRequest,
    addLeavePolicy,
    updateLeavePolicy,
    addHoliday,
    updateHoliday,
    deleteHoliday,
    addLeaveTemplate,
    updateLeaveTemplate,
    logAudit,
    refresh: fetchAll,
  }
}
