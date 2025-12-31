'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Search, Users, FileText, BarChart3, UserCheck, Shield, Clock, CheckCircle, AlertCircle, TrendingUp, Calendar, Activity } from 'lucide-react'
import { hasPermission, type UserRole, type Permission } from '@/lib/permissions'
import { PermissionGate } from '@/components/permission-gate'

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
      { label: 'Add Staff', icon: Users, action: 'staff', permission: 'employee:create' as Permission },
      { label: 'Process Leaves', icon: FileText, action: 'leave', permission: 'leave:view:all' as Permission },
      { label: 'View Reports', icon: BarChart3, action: 'reports', permission: 'reports:hr:view' as Permission },
    ],
    hr_assistant: [
      { label: 'View Staff', icon: Users, action: 'staff', permission: 'employee:view:all' as Permission },
      { label: 'View Leaves', icon: FileText, action: 'leave', permission: 'leave:view:all' as Permission },
      { label: 'View Reports', icon: BarChart3, action: 'reports', permission: 'reports:hr:view' as Permission },
    ],
    manager: [
      { label: 'View Team', icon: Users, action: 'staff', permission: 'employee:view:team' as Permission },
      { label: 'Approve Leaves', icon: FileText, action: 'leave', permission: 'leave:view:team' as Permission },
    ],
    deputy_director: [
      { label: 'View Directorate', icon: Users, action: 'staff', permission: 'employee:view:team' as Permission },
      { label: 'Approve Leaves', icon: FileText, action: 'leave', permission: 'leave:view:team' as Permission },
    ],
  }

  // Filter actions based on permissions
  const roleActions = quickActions[userRole as 'hr' | 'hr_assistant' | 'manager' | 'deputy_director'] || []
  const currentActions = roleActions.filter(action => {
    if (!action.permission) return true
    return hasPermission(userRole as UserRole, action.permission)
  })

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

  // Show loading state - check if still loading or not initialized yet
  if (store.loading || !store.initialized) {
    return (
      <div className="p-8 space-y-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Show error state if data failed to load
  if (store.error) {
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

  const metrics = getMetrics()
  const pendingLeaves = store.leaves.filter((l: any) => l.status === 'pending').length     
  const totalStaff = store.staff.filter((s: any) => s.active).length
  const activeRequests = store.leaves.filter((l: any) => l.status === 'approved').length

  // Get recent pending leaves for preview
  const recentPendingLeaves = store.leaves
    .filter((l: any) => l.status === 'pending')
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  // Get approved leaves this month
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const approvedThisMonth = store.leaves.filter((l: any) => {
    if (l.status !== 'approved' || !l.approvalDate) return false
    const approvalDate = new Date(l.approvalDate)
    return approvalDate.getMonth() === currentMonth && approvalDate.getFullYear() === currentYear
  }).length

  return (
    <div className={`min-h-screen p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 bg-gradient-to-br ${theme.gradient} via-background to-background`}>
      {/* Welcome Section - Enhanced */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 ${theme.iconBg} rounded-xl shadow-sm`}>
              <WelcomeIcon className={`w-6 h-6 sm:w-7 sm:h-7 ${theme.iconColor}`} />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-1">Welcome Back</h1>
              <p className="text-muted-foreground text-sm sm:text-base">{roleDescriptions[userRole as 'hr' | 'hr_assistant' | 'manager' | 'deputy_director'] || 'Welcome to the HR Leave Portal'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-block px-4 py-2 ${theme.badgeBg} ${theme.badgeText} font-semibold rounded-full text-sm capitalize shadow-sm`}>
              {userRole.replace(/_/g, ' ')} Role
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards - Role Specific - Enhanced Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {(userRole === 'hr' || userRole === 'hr_assistant') && (
          <>
            <Card className={`border-2 ${theme.border} hover:shadow-lg transition-all duration-200 overflow-hidden relative`}>
              <div className={`absolute top-0 right-0 w-32 h-32 ${theme.iconBg} opacity-10 rounded-full -mr-16 -mt-16`}></div>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Staff</CardTitle>
                  <Users className={`w-5 h-5 ${theme.iconColor} opacity-60`} />
                </div>
              </CardHeader>
              <CardContent>
                <p className={`text-4xl font-bold ${theme.accent} mb-2`}>{metrics.totalStaff ?? 0}</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${(store.staff || []).filter((s: any) => s.active).length > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <p className="text-xs text-muted-foreground">
                    {(metrics.totalStaff ?? 0) > 0 
                      ? `${(store.staff || []).filter((s: any) => s.active).length} active employees`
                      : 'No staff members'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className={`border-2 ${theme.border} hover:shadow-lg transition-all duration-200 overflow-hidden relative ${(metrics.pendingLeaves ?? 0) > 0 ? 'border-amber-300 bg-amber-50/30' : ''}`}>
              <div className={`absolute top-0 right-0 w-32 h-32 bg-amber-100 opacity-10 rounded-full -mr-16 -mt-16`}></div>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Pending Processing</CardTitle>
                  <Clock className="w-5 h-5 text-amber-600 opacity-60" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2 mb-2">
                  <p className={`text-4xl font-bold ${(metrics.pendingLeaves ?? 0) > 0 ? 'text-amber-600' : theme.accent}`}>{metrics.pendingLeaves ?? 0}</p>
                  {(metrics.hrPendingLeaves ?? 0) > 0 && (metrics.hrPendingLeaves ?? 0) < (metrics.pendingLeaves ?? 0) && (
                    <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                      {metrics.hrPendingLeaves} need HR
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-1">Leave requests</p>
                {(metrics.hrPendingLeaves ?? 0) > 0 && (
                  <p className="text-xs text-amber-600 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {metrics.hrPendingLeaves} awaiting your approval
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className={`border-2 ${theme.border} hover:shadow-lg transition-all duration-200 overflow-hidden relative`}>
              <div className={`absolute top-0 right-0 w-32 h-32 bg-green-100 opacity-10 rounded-full -mr-16 -mt-16`}></div>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Processed</CardTitle>
                  <CheckCircle className="w-5 h-5 text-green-600 opacity-60" />
                </div>
              </CardHeader>
              <CardContent>
                <p className={`text-4xl font-bold text-green-600 mb-2`}>{metrics.activeRequests}</p>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3 h-3 text-green-600" />
                  <p className="text-xs text-muted-foreground">{approvedThisMonth} approved this month</p>
                </div>
              </CardContent>
            </Card>
            <Card className={`border-2 ${theme.border} hover:shadow-lg transition-all duration-200 overflow-hidden relative`}>
              <div className={`absolute top-0 right-0 w-32 h-32 ${theme.iconBg} opacity-10 rounded-full -mr-16 -mt-16`}></div>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Activities</CardTitle>
                  <Activity className={`w-5 h-5 ${theme.iconColor} opacity-60`} />
                </div>
              </CardHeader>
              <CardContent>
                <p className={`text-4xl font-bold ${theme.accent} mb-2`}>{metrics.totalAudits}</p>
                <p className="text-xs text-muted-foreground">Recent activities logged</p>
              </CardContent>
            </Card>
          </>
        )}
        {(userRole === 'manager' || userRole === 'deputy_director') && (
          <>
            <Card className={`border-2 ${theme.border} hover:shadow-lg transition-all duration-200 overflow-hidden relative`}>
              <div className={`absolute top-0 right-0 w-32 h-32 ${theme.iconBg} opacity-10 rounded-full -mr-16 -mt-16`}></div>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Team Members</CardTitle>
                  <Users className={`w-5 h-5 ${theme.iconColor} opacity-60`} />
                </div>
              </CardHeader>
              <CardContent>
                <p className={`text-4xl font-bold ${theme.accent} mb-2`}>{metrics.teamMembers}</p>
                <p className="text-xs text-muted-foreground">In your team</p>
              </CardContent>
            </Card>
            <Card className={`border-2 ${theme.border} hover:shadow-lg transition-all duration-200 overflow-hidden relative ${(metrics.pendingApprovals ?? 0) > 0 ? 'border-amber-300 bg-amber-50/30' : ''}`}>
              <div className={`absolute top-0 right-0 w-32 h-32 bg-amber-100 opacity-10 rounded-full -mr-16 -mt-16`}></div>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approvals</CardTitle>
                  <Clock className="w-5 h-5 text-amber-600 opacity-60" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2 mb-2">
                  <p className={`text-4xl font-bold ${(metrics.pendingApprovals ?? 0) > 0 ? 'text-amber-600' : theme.accent}`}>{metrics.pendingApprovals ?? 0}</p>
                  {(metrics.managerPendingLeaves ?? 0) > 0 && (
                    <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                      {metrics.managerPendingLeaves} ready
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-1">Awaiting your review</p>
                {(metrics.managerPendingLeaves ?? 0) > 0 && (
                  <p className="text-xs text-amber-600 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {metrics.managerPendingLeaves} ready for approval
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className={`border-2 ${theme.border} hover:shadow-lg transition-all duration-200 overflow-hidden relative`}>
              <div className={`absolute top-0 right-0 w-32 h-32 bg-green-100 opacity-10 rounded-full -mr-16 -mt-16`}></div>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Approved This Month</CardTitle>
                  <Calendar className="w-5 h-5 text-green-600 opacity-60" />
                </div>
              </CardHeader>
              <CardContent>
                <p className={`text-4xl font-bold text-green-600 mb-2`}>{approvedThisMonth}</p>
                <p className="text-xs text-muted-foreground">Team leaves approved</p>
              </CardContent>
            </Card>
            <Card className={`border-2 ${theme.border} hover:shadow-lg transition-all duration-200 overflow-hidden relative`}>
              <div className={`absolute top-0 right-0 w-32 h-32 ${theme.iconBg} opacity-10 rounded-full -mr-16 -mt-16`}></div>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Leaves</CardTitle>
                  <FileText className={`w-5 h-5 ${theme.iconColor} opacity-60`} />
                </div>
              </CardHeader>
              <CardContent>
                <p className={`text-4xl font-bold ${theme.accent} mb-2`}>{metrics.teamLeaves}</p>
                <p className="text-xs text-muted-foreground">All team requests</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Quick Actions - Enhanced */}
      {onNavigate && currentActions.length > 0 && (
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-1 h-6 ${theme.iconBg} rounded-full`}></div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentActions.map((action, idx) => {
              const Icon = action.icon
              return (
                <Card
                  key={idx}
                  className={`border-2 ${theme.border} hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer group`}
                  onClick={() => onNavigate(action.action)}
                >
                  <CardContent className="p-6 flex flex-col items-center gap-4">
                    <div className={`p-4 ${theme.iconBg} rounded-xl group-hover:scale-110 transition-transform duration-200`}>
                      <Icon className={`w-8 h-8 ${theme.iconColor}`} />
                    </div>
                    <span className="text-base font-semibold text-center text-foreground group-hover:text-primary transition-colors">
                      {action.label}
                    </span>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent Pending Leaves Preview - For Managers and HR */}
      {recentPendingLeaves.length > 0 && (
        <Card className={`border-2 ${theme.border} hover:shadow-lg transition-all duration-200`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className={`w-5 h-5 ${theme.iconColor}`} />
                  Recent Pending Requests
                </CardTitle>
                <CardDescription className="mt-1">Latest leave requests awaiting action</CardDescription>
              </div>
              {onNavigate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate('leave')}
                  className="gap-2"
                >
                  View All
                  <FileText className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {recentPendingLeaves.map((leave: any) => (
                <div
                  key={leave.id}
                  className="flex items-start justify-between p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors cursor-pointer"
                  onClick={() => onNavigate && onNavigate('leave')}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm text-foreground">{leave.staffName}</p>
                      <Badge variant="outline" className="text-xs">
                        {leave.leaveType}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {leave.days} {leave.days === 1 ? 'day' : 'days'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className="bg-amber-100 text-amber-800 text-xs">Pending</Badge>
                    <p className="text-xs text-muted-foreground">
                      {new Date(leave.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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

      {/* Recent Activities - Enhanced */}
      <Card className={`border-2 ${theme.border} hover:shadow-lg transition-all duration-200`}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className={`w-1 h-6 ${theme.iconBg} rounded-full`}></div>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className={`w-5 h-5 ${theme.iconColor}`} />
                {(userRole === 'hr' || userRole === 'hr_assistant') && 'Recent Activities'}
                {(userRole === 'manager' || userRole === 'deputy_director') && 'Team Activities'}
              </CardTitle>
              <CardDescription className="mt-1">
                {(userRole === 'hr' || userRole === 'hr_assistant') && 'Recent HR activities and changes'}
                {(userRole === 'manager' || userRole === 'deputy_director') && 'Recent team leave activities'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {store.auditLogs.length > 0 ? (
              store.auditLogs.slice(0, 10).map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${theme.iconBg}`}></div>
                      <p className="font-semibold text-sm text-foreground">{log.action.replace(/_/g, ' ')}</p>
                    </div>
                    <p className="text-xs text-muted-foreground ml-4">{log.details}</p>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                    {new Date(log.timestamp).toLocaleDateString()}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-muted-foreground text-sm">No recent activities</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
