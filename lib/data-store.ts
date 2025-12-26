// Client-side data store with Neon database API calls
import { useEffect, useState, useCallback } from 'react'
import { applySelectiveUpdate, updateItemInArray, addItemToArray, removeItemFromArray } from './update-diff'

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
  employmentStatus?: string
  terminationDate?: string
  terminationReason?: string
  joinDate: string
  createdAt: string
}

export interface LeaveRequest {
  id: string
  staffId: string
  staffName: string
  leaveType: 'Annual' | 'Sick' | 'Unpaid' | 'Special Service' | 'Training' | 'Study' | 'Maternity' | 'Paternity' | 'Compassionate'
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
  study: number
  maternity: number
  paternity: number
  compassionate: number
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
  leaveType: 'Annual' | 'Sick' | 'Unpaid' | 'Special Service' | 'Training' | 'Study' | 'Maternity' | 'Paternity' | 'Compassionate'
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
  leaveType: 'Annual' | 'Sick' | 'Unpaid' | 'Special Service' | 'Training' | 'Study' | 'Maternity' | 'Paternity' | 'Compassionate'
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

export function useDataStore(options?: { enablePolling?: boolean; pollingInterval?: number }) {
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
  
  // Polling configuration
  const enablePolling = options?.enablePolling ?? true
  const pollingInterval = options?.pollingInterval ?? 60000 // Default: 60 seconds

  // Fetch all data from API
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true)
      const [staffRes, leavesRes, balancesRes, payslipsRes, reviewsRes, policiesRes, holidaysRes, templatesRes, auditRes] = await Promise.all([
        fetch('/api/staff', { credentials: 'include' }).catch(() => ({ ok: false } as Response)),
        fetch('/api/leaves', { credentials: 'include' }).catch(() => ({ ok: false } as Response)),
        fetch('/api/balances', { credentials: 'include' }).catch(() => ({ ok: false } as Response)),
        fetch('/api/payslips', { credentials: 'include' }).catch(() => ({ ok: false } as Response)),
        fetch('/api/performance-reviews', { credentials: 'include' }).catch(() => ({ ok: false } as Response)),
        fetch('/api/leave-policies', { credentials: 'include' }).catch(() => ({ ok: false } as Response)),
        fetch('/api/holidays', { credentials: 'include' }).catch(() => ({ ok: false } as Response)),
        fetch('/api/leave-templates', { credentials: 'include' }).catch(() => ({ ok: false } as Response)),
        fetch('/api/audit-logs?limit=100', { credentials: 'include' }).catch(() => ({ ok: false } as Response)),
      ])

      if (staffRes.ok && 'json' in staffRes) {
        const data = transformDates(await staffRes.json())
        setStaff(prev => applySelectiveUpdate(prev, data))
      }
      if (leavesRes.ok && 'json' in leavesRes) {
        const data = transformDates(await leavesRes.json())
        // Use selective update to minimize re-renders
        setLeaves(prev => applySelectiveUpdate(prev, data))
      }
      if (balancesRes.ok && 'json' in balancesRes) {
        const data = transformDates(await balancesRes.json()) as LeaveBalance[]
        // Use selective update to minimize re-renders
        // For LeaveBalance, use staffId as the key since id is optional
        setBalances(prev => {
          // Create a map for efficient lookup by staffId
          const prevMap = new Map<string, LeaveBalance>()
          prev.forEach(b => prevMap.set(b.staffId, b))
          
          const updated: LeaveBalance[] = []
          const processedStaffIds = new Set<string>()
          
          // Process existing items
          prev.forEach(item => {
            processedStaffIds.add(item.staffId)
            const updatedItem = data.find(d => d.staffId === item.staffId)
            if (updatedItem) {
              // Check if changed (simple comparison)
              if (JSON.stringify(item) !== JSON.stringify(updatedItem)) {
                updated.push(updatedItem)
              } else {
                updated.push(item) // Keep original reference
              }
            }
          })
          
          // Add new items
          data.forEach(item => {
            if (!processedStaffIds.has(item.staffId)) {
              updated.push(item)
            }
          })
          
          return updated
        })
      }
      if (payslipsRes.ok && 'json' in payslipsRes) {
        const data = transformDates(await payslipsRes.json())
        setPayslips(prev => applySelectiveUpdate(prev, data))
      }
      if (reviewsRes.ok && 'json' in reviewsRes) {
        const data = transformDates(await reviewsRes.json())
        setPerformanceReviews(prev => applySelectiveUpdate(prev, data))
      }
      if (policiesRes.ok && 'json' in policiesRes) {
        const data = transformDates(await policiesRes.json())
        setLeavePolicies(prev => applySelectiveUpdate(prev, data))
      }
      if (holidaysRes.ok && 'json' in holidaysRes) {
        const data = transformDates(await holidaysRes.json())
        setHolidays(prev => applySelectiveUpdate(prev, data))
      }
      if (templatesRes.ok && 'json' in templatesRes) {
        const data = transformDates(await templatesRes.json())
        setLeaveTemplates(prev => applySelectiveUpdate(prev, data))
      }
      if (auditRes.ok && 'json' in auditRes) {
        const data = transformDates(await auditRes.json())
        // Audit logs are append-only, so prepend new ones
        setAuditLogs(prev => {
          const newLogs = data.filter((newLog: AuditLog) => 
            !prev.some(existing => existing.id === newLog.id)
          )
          return [...newLogs, ...prev].slice(0, 100) // Keep last 100
        })
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
      setInitialized(true)
    }
  }, [])

  // Fetch critical data only (for polling)
  const fetchCritical = useCallback(async () => {
    try {
      const [leavesRes, balancesRes] = await Promise.all([
        fetch('/api/leaves', { credentials: 'include' }).catch(() => ({ ok: false } as Response)),
        fetch('/api/balances', { credentials: 'include' }).catch(() => ({ ok: false } as Response)),
      ])

      if (leavesRes.ok && 'json' in leavesRes) {
        const data = await leavesRes.json()
        setLeaves(transformDates(data))
      }
      if (balancesRes.ok && 'json' in balancesRes) {
        const data = await balancesRes.json()
        setBalances(transformDates(data))
      }
    } catch (error) {
      console.error('Error fetching critical data:', error)
    }
  }, [])

  // Initialize from API
  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Set up automatic polling for critical data
  useEffect(() => {
    if (!enablePolling || !initialized) return

    const interval = setInterval(() => {
      fetchCritical()
    }, pollingInterval)

    return () => clearInterval(interval)
  }, [enablePolling, initialized, pollingInterval, fetchCritical])

  const addStaff = async (member: Omit<StaffMember, 'id' | 'createdAt'>) => {
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(member),
      })
      if (!res.ok) throw new Error('Failed to create staff')
      const newMember = transformDates(await res.json())
      // Use selective add to preserve other items' references
      setStaff((prev) => addItemToArray(prev, newMember))
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
        credentials: 'include',
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update staff')
      const updated = transformDates(await res.json())
      // Use selective update to preserve other items' references
      setStaff((prev) => updateItemInArray(prev, updated))
      await logAudit('UPDATE_STAFF', 'HR Officer', id, `Updated staff member details`)
    } catch (error) {
      console.error('Error updating staff:', error)
      throw error
    }
  }

  const terminateStaff = async (
    id: string,
    terminationDate: string,
    terminationReason: string,
    employmentStatus: string
  ) => {
    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          terminationDate,
          terminationReason,
          employmentStatus,
        }),
      })
      if (!res.ok) {
        const errorData = await res.json()
        const error = new Error(errorData.error || 'Failed to terminate staff')
        ;(error as any).errorData = errorData
        throw error
      }
      const result = await res.json()
      const updated = transformDates(result.staff)
      // Use selective update to preserve other items' references
      setStaff((prev) => updateItemInArray(prev, updated))
      await logAudit(
        'TERMINATE_STAFF',
        'HR Officer',
        updated.staffId,
        `Terminated staff member: ${terminationReason}`
      )
    } catch (error) {
      console.error('Error terminating staff:', error)
      throw error
    }
  }

  const addLeaveRequest = async (request: Omit<LeaveRequest, 'id' | 'createdAt' | 'status'>) => {
    // Optimistic update: create temporary ID
    const tempId = `temp-${Date.now()}`
    const optimisticRequest: LeaveRequest = {
      id: tempId,
      ...request,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    
    // Update UI immediately
    setLeaves((prev) => [...prev, optimisticRequest])
    
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(request),
      })
      if (!res.ok) {
        // Revert optimistic update on error
        setLeaves((prev) => prev.filter((l) => l.id !== tempId))
        const errorData = await res.json().catch(() => ({}))
        const error = new Error(errorData?.error || 'Failed to create leave request')
        ;(error as any).errorData = errorData
        throw error
      }
      const newRequest = transformDates(await res.json())
      // Replace optimistic update with real data using selective update
      setLeaves((prev) => {
        // Remove temp item and add real item
        const withoutTemp = removeItemFromArray(prev, tempId)
        return addItemToArray(withoutTemp, newRequest)
      })
      await logAudit('CREATE_LEAVE', 'Staff', request.staffId, `Submitted ${request.leaveType} leave request for ${request.days} days`)
      return newRequest
    } catch (error) {
      console.error('Error adding leave request:', error)
      throw error
    }
  }

  const updateLeaveRequest = async (id: string, status: 'approved' | 'rejected', approvedBy: string, level?: number) => {
    // Optimistic update: store previous state for rollback
    const previousLeave = leaves.find((l) => l.id === id)
    if (!previousLeave) throw new Error('Leave request not found')

    // Create optimistic update
    const optimisticUpdate: LeaveRequest = {
      ...previousLeave,
      status,
      approvedBy,
      approvalDate: new Date().toISOString(),
      approvalLevels: level !== undefined && previousLeave.approvalLevels
        ? previousLeave.approvalLevels.map((al) =>
            al.level === level
              ? { ...al, status, approverName: approvedBy, approvalDate: new Date().toISOString() }
              : al
          )
        : previousLeave.approvalLevels,
    }

    // Update UI immediately
    setLeaves((prev) => prev.map((l) => (l.id === id ? optimisticUpdate : l)))

    try {
      const res = await fetch(`/api/leaves/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, approvedBy, level }),
      })
      if (!res.ok) {
        // Revert optimistic update on error
        setLeaves((prev) => prev.map((l) => (l.id === id ? previousLeave : l)))
        throw new Error('Failed to update leave request')
      }
      const updated = transformDates(await res.json())
      // Replace optimistic update with real data using selective update
      setLeaves((prev) => updateItemInArray(prev, updated))
      await logAudit('UPDATE_LEAVE', approvedBy, id, `${status === 'approved' ? 'Approved' : 'Rejected'} leave request`)
      return updated
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
        credentials: 'include',
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
        credentials: 'include',
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
        credentials: 'include',
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
        credentials: 'include',
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
        credentials: 'include',
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
        credentials: 'include',
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
        credentials: 'include',
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
        credentials: 'include',
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
    terminateStaff,
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
    refreshCritical: fetchCritical,
  }
}

export type DataStoreReturnType = ReturnType<typeof useDataStore>