'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Search, Users, FileText, BarChart3, UserCheck, Shield } from 'lucide-react'

interface DashboardProps {
  store: ReturnType<typeof import('@/lib/data-store').useDataStore>
  userRole: string
  onNavigate?: (tab: string) => void
}

export default function Dashboard({ store, userRole, onNavigate }: DashboardProps) {
  const [searchId, setSearchId] = useState('')
  const [searchResult, setSearchResult] = useState<any>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = () => {
    const trimmedId = searchId.trim()
    if (!trimmedId) {
      setSearchResult(null)
      setHasSearched(false)
      return
    }
    
    setHasSearched(true)
    
    // Check if staff array is available
    if (!store.staff || store.staff.length === 0) {
      setSearchResult(null)
      return
    }
    
    // Normalize search: trim whitespace, convert to uppercase, and handle variations
    const normalizedSearch = trimmedId.toUpperCase()
    
    const found = store.staff.find((s: any) => {
      if (!s || !s.staffId) return false
      // Case-insensitive comparison with normalized staffId
      const normalizedStaffId = s.staffId.trim().toUpperCase()
      return normalizedStaffId === normalizedSearch
    })
    
    setSearchResult(found || null)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchId(value)
    // Clear search result when input changes
    if (hasSearched) {
      setSearchResult(null)
      setHasSearched(false)
    }
  }

  const getRoleTheme = () => {
    switch (userRole) {
      case 'hr':
      case 'hr_assistant':
        return {
          gradient: 'from-green-50 to-background',
          accent: 'text-green-600',
          border: 'border-green-200',
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          badgeBg: 'bg-green-100',
          badgeText: 'text-green-700',
          welcomeIcon: Users,
        }
      case 'manager':
      case 'deputy_director':
        return {
          gradient: 'from-amber-50 to-background',
          accent: 'text-amber-600',
          border: 'border-amber-200',
          iconBg: 'bg-amber-100',
          iconColor: 'text-amber-600',
          badgeBg: 'bg-amber-100',
          badgeText: 'text-amber-700',
          welcomeIcon: UserCheck,
        }
      default:
        return {
          gradient: 'from-background to-background',
          accent: 'text-primary',
          border: 'border-border',
          iconBg: 'bg-primary/10',
          iconColor: 'text-primary',
          badgeBg: 'bg-primary/10',
          badgeText: 'text-primary',
          welcomeIcon: Shield,
        }
    }
  }

  const theme = getRoleTheme()
  const WelcomeIcon = theme.welcomeIcon

  const roleDescriptions = {
    hr: 'Manage staff records, process leave requests, and generate reports.',
    hr_assistant: 'View staff records, upload documents, and assist with leave management.',
    manager: 'Review team leaves and approve or reject leave requests.',
    deputy_director: 'Review directorate leaves and approve or reject leave requests.',
  }

  const quickActions = {
    hr: [
      { label: 'Add Staff', icon: Users, action: 'staff' },
      { label: 'Process Leaves', icon: FileText, action: 'leave' },
      { label: 'View Reports', icon: BarChart3, action: 'reports' },
    ],
    hr_assistant: [
      { label: 'View Staff', icon: Users, action: 'staff' },
      { label: 'View Leaves', icon: FileText, action: 'leave' },
      { label: 'View Reports', icon: BarChart3, action: 'reports' },
    ],
    manager: [
      { label: 'View Team', icon: Users, action: 'staff' },
      { label: 'Approve Leaves', icon: FileText, action: 'leave' },
    ],
    deputy_director: [
      { label: 'View Directorate', icon: Users, action: 'staff' },
      { label: 'Approve Leaves', icon: FileText, action: 'leave' },
    ],
  }

  const currentActions = quickActions[userRole as 'hr' | 'hr_assistant' | 'manager' | 'deputy_director'] || []

  // Role-specific metrics
  const getMetrics = () => {
    switch (userRole) {
      case 'hr':
      case 'hr_assistant':
        // Count leaves that need HR approval (multi-level where manager approved, or single-level HR approval)
        const hrPendingLeaves = store.leaves.filter((l: any) => {
          if (l.status !== 'pending') return false
          if (!l.approvalLevels || l.approvalLevels.length === 0) {
            // Single level - HR can approve all
            return true
          }
          // Multi-level: check if there's an HR level pending and manager has approved
          const hrLevel = l.approvalLevels.find((al: any) => al.approverRole === 'hr' && al.status === 'pending')
          if (!hrLevel) return false
          // Check if manager level (if exists) is approved
          const managerLevel = l.approvalLevels.find((al: any) => al.approverRole === 'manager')
          if (managerLevel) {
            return managerLevel.status === 'approved'
          }
          return true
        }).length
        
        return {
          totalStaff: (store.staff || []).length, // Total staff count (all staff, not just active)
          pendingLeaves: store.leaves.filter((l: any) => l.status === 'pending').length,   
          hrPendingLeaves, // Leaves specifically needing HR approval
          activeRequests: store.leaves.filter((l: any) => l.status === 'approved').length,
          totalAudits: store.auditLogs.length,
        }
      case 'manager':
      case 'deputy_director':
        // Count leaves that need manager/deputy director approval
        const managerPendingLeaves = store.leaves.filter((l: any) => {
          if (l.status !== 'pending') return false
          if (!l.approvalLevels || l.approvalLevels.length === 0) {
            // Single level - manager/deputy director can approve team/directorate leaves
            return true
          }
          // Multi-level: check if there's a manager or deputy_director level pending
          const approverRole = userRole === 'deputy_director' ? 'deputy_director' : 'manager'
          const managerLevel = l.approvalLevels.find((al: any) => 
            (al.approverRole === 'manager' || al.approverRole === 'deputy_director') && 
            al.status === 'pending'
          )
          if (!managerLevel) return false
          // Check if previous levels are approved (should be none for level 1)
          const previousLevels = l.approvalLevels.filter((al: any) => al.level < managerLevel.level)
          return previousLevels.every((al: any) => al.status === 'approved')
        }).length
        
        return {
          teamMembers: store.staff.length, // In real app, filter by team/department/directorate
          pendingApprovals: managerPendingLeaves, // Leaves specifically needing approval
          managerPendingLeaves, // Leaves specifically needing approval
          approvedThisMonth: store.leaves.filter((l: any) => l.status === 'approved').length,
          teamLeaves: store.leaves.length,
          totalStaff: store.staff.filter((s: any) => s.active).length,
        }
      default:
        return {}
    }
  }

  // Show error state if data failed to load
  if (store.error && !store.loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Failed to Load Data</h2>
          <p className="text-red-700 mb-4">{store.error}</p>
          <Button onClick={() => store.refresh?.()} variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  // Show loading state
  if (store.loading && !store.initialized) {
    return (
      <div className="p-8 space-y-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const metrics = getMetrics()
  const pendingLeaves = store.leaves.filter((l: any) => l.status === 'pending').length     
  const totalStaff = store.staff.filter((s: any) => s.active).length
  const activeRequests = store.leaves.filter((l: any) => l.status === 'approved').length

  return (
    <div className={`p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 bg-gradient-to-b ${theme.gradient}`}>
      {/* Welcome Section */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className={`p-2 ${theme.iconBg} rounded-lg`}>
            <WelcomeIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${theme.iconColor}`} />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">Welcome Back</h1>
        </div>
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <span className={`inline-block px-2 sm:px-3 py-1 ${theme.badgeBg} ${theme.badgeText} font-semibold rounded-full text-xs sm:text-sm capitalize`}>
            {userRole} Role
          </span>
        </div>
        <p className="text-muted-foreground text-sm sm:text-base md:text-lg">{roleDescriptions[userRole as 'hr' | 'hr_assistant' | 'manager' | 'deputy_director'] || 'Welcome to the HR Leave Portal'}</p>
      </div>

      {/* KPI Cards - Role Specific */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {(userRole === 'hr' || userRole === 'hr_assistant') && (
          <>
            <Card className={`border-2 ${theme.border}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Staff</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${theme.accent}`}>{metrics.totalStaff ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(metrics.totalStaff ?? 0) > 0 
                    ? `${(store.staff || []).filter((s: any) => s.active).length} active employees`
                    : 'No staff members'
                  }
                </p>
              </CardContent>
            </Card>
            <Card className={`border-2 ${theme.border}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Processing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <p className={`text-3xl font-bold ${theme.accent}`}>{metrics.pendingLeaves ?? 0}</p>
                  {(metrics.hrPendingLeaves ?? 0) > 0 && (metrics.hrPendingLeaves ?? 0) < (metrics.pendingLeaves ?? 0) && (
                    <Badge variant="secondary" className="text-xs">
                      {metrics.hrPendingLeaves} need HR
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Leave requests</p>
                {(metrics.hrPendingLeaves ?? 0) > 0 && (
                  <p className="text-xs text-amber-600 font-medium mt-1">
                    {metrics.hrPendingLeaves} awaiting your approval
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className={`border-2 ${theme.border}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Processed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${theme.accent}`}>{metrics.activeRequests}</p>
                <p className="text-xs text-muted-foreground mt-1">Approved leaves</p>
              </CardContent>
            </Card>
            <Card className={`border-2 ${theme.border}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Activities</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${theme.accent}`}>{metrics.totalAudits}</p>
                <p className="text-xs text-muted-foreground mt-1">Recent activities</p>
              </CardContent>
            </Card>
          </>
        )}
        {(userRole === 'manager' || userRole === 'deputy_director') && (
          <>
            <Card className={`border-2 ${theme.border}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Team Members</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${theme.accent}`}>{metrics.teamMembers}</p>
                <p className="text-xs text-muted-foreground mt-1">In your team</p>
              </CardContent>
            </Card>
            <Card className={`border-2 ${theme.border}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approvals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <p className={`text-3xl font-bold ${theme.accent}`}>{metrics.pendingApprovals ?? 0}</p>
                  {(metrics.managerPendingLeaves ?? 0) > 0 && (
                    <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                      {metrics.managerPendingLeaves} ready
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Awaiting your review</p>
                {(metrics.managerPendingLeaves ?? 0) > 0 && (
                  <p className="text-xs text-amber-600 font-medium mt-1">
                    {metrics.managerPendingLeaves} ready for manager approval
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className={`border-2 ${theme.border}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Approved This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${theme.accent}`}>{metrics.approvedThisMonth}</p>
                <p className="text-xs text-muted-foreground mt-1">Team leaves</p>
              </CardContent>
            </Card>
            <Card className={`border-2 ${theme.border}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Leaves</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${theme.accent}`}>{metrics.teamLeaves}</p>
                <p className="text-xs text-muted-foreground mt-1">All team requests</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Quick Actions */}
      {onNavigate && currentActions.length > 0 && (
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3 sm:mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {currentActions.map((action, idx) => {
              const Icon = action.icon
              return (
                <Button
                  key={idx}
                  onClick={() => onNavigate(action.action)}
                  variant="outline"
                  className="h-auto p-6 flex flex-col items-center gap-3 hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <Icon className="w-8 h-8" />
                  <span className="text-base font-semibold text-center">{action.label}</span>
                </Button>
              )
            })}
          </div>
        </div>
      )}

      {/* Staff Search - Only for HR and HR Assistant */}
      {(userRole === 'hr' || userRole === 'hr_assistant') && (
      <Card className={theme.border ? `border-2 ${theme.border}` : ''}>
        <CardHeader>
          <CardTitle>Staff Lookup</CardTitle>
          <CardDescription>Search employee by Staff ID</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Enter Staff ID (e.g., MFA-001)"
              value={searchId}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} className="gap-2">
              <Search className="w-4 h-4" />
              Search
            </Button>
          </div>

          {searchResult && (
            <div className="bg-secondary/10 p-4 rounded-lg space-y-3 border border-secondary/20">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  {searchResult.photoUrl ? (
                    <AvatarImage src={searchResult.photoUrl} alt={`${searchResult.firstName} ${searchResult.lastName}`} />
                  ) : null}
                  <AvatarFallback className="text-lg">
                    {searchResult.firstName[0]}{searchResult.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{searchResult.firstName} {searchResult.lastName}</h3>
                  <p className="text-sm text-muted-foreground">{searchResult.staffId}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{searchResult.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Department</p>
                  <p className="font-medium">{searchResult.department}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Position</p>
                  <p className="font-medium">{searchResult.position}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Grade</p>
                  <p className="font-medium">{searchResult.grade}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={searchResult.active ? 'default' : 'secondary'}>
                    {searchResult.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {hasSearched && !searchResult && (
            <div className="space-y-2">
              <p className="text-destructive text-sm">No staff member found with ID: {searchId}</p>
              {store.staff && store.staff.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Available staff IDs: {store.staff.map((s: any) => s.staffId).join(', ')}
                </p>
              )}
            </div>
          )}
          
          {store.staff && store.staff.length === 0 && (
            <p className="text-muted-foreground text-sm">No staff members available. Please add staff members first.</p>
          )}
        </CardContent>
      </Card>
      )}

      {/* Recent Activities - Different for each role */}
      <Card className={theme.border ? `border-2 ${theme.border}` : ''}>
        <CardHeader>
          <CardTitle>
            {(userRole === 'hr' || userRole === 'hr_assistant') && 'Recent Activities'}
            {(userRole === 'manager' || userRole === 'deputy_director') && 'Team Activities'}
          </CardTitle>
          <CardDescription>
            {(userRole === 'hr' || userRole === 'hr_assistant') && 'Recent HR activities and changes'}
            {(userRole === 'manager' || userRole === 'deputy_director') && 'Recent team leave activities'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {store.auditLogs.slice(0, 10).map((log: any) => (
              <div key={log.id} className="flex items-start justify-between py-2 border-b border-border last:border-0">
                <div className="space-y-1 flex-1">
                  <p className="font-medium text-sm">{log.action}</p>
                  <p className="text-xs text-muted-foreground">{log.details}</p>
                </div>
                <p className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
