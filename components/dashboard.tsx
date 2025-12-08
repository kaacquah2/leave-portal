'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Search, Users, FileText, BarChart3, UserCheck, Shield } from 'lucide-react'
import type { ReturnType } from '@/lib/data-store'

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
    
    const found = store.staff.find(s => {
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
    manager: 'Review team leaves and approve or reject leave requests.',
  }

  const quickActions = {
    hr: [
      { label: 'Add Staff', icon: Users, action: 'staff' },
      { label: 'Process Leaves', icon: FileText, action: 'leave' },
      { label: 'View Reports', icon: BarChart3, action: 'reports' },
    ],
    manager: [
      { label: 'View Team', icon: Users, action: 'staff' },
      { label: 'Approve Leaves', icon: FileText, action: 'leave' },
    ],
  }

  const currentActions = quickActions[userRole as 'hr' | 'manager'] || []

  // Role-specific metrics
  const getMetrics = () => {
    switch (userRole) {
      case 'hr':
        // Count leaves that need HR approval (multi-level where manager approved, or single-level HR approval)
        const hrPendingLeaves = store.leaves.filter(l => {
          if (l.status !== 'pending') return false
          if (!l.approvalLevels || l.approvalLevels.length === 0) {
            // Single level - HR can approve all
            return true
          }
          // Multi-level: check if there's an HR level pending and manager has approved
          const hrLevel = l.approvalLevels.find(al => al.approverRole === 'hr' && al.status === 'pending')
          if (!hrLevel) return false
          // Check if manager level (if exists) is approved
          const managerLevel = l.approvalLevels.find(al => al.approverRole === 'manager')
          if (managerLevel) {
            return managerLevel.status === 'approved'
          }
          return true
        }).length
        
        return {
          totalStaff: store.staff.filter(s => s.active).length,
          pendingLeaves: store.leaves.filter(l => l.status === 'pending').length,
          hrPendingLeaves, // Leaves specifically needing HR approval
          activeRequests: store.leaves.filter(l => l.status === 'approved').length,
          totalAudits: store.auditLogs.length,
        }
      case 'manager':
        // Count leaves that need manager approval
        const managerPendingLeaves = store.leaves.filter(l => {
          if (l.status !== 'pending') return false
          if (!l.approvalLevels || l.approvalLevels.length === 0) {
            // Single level - manager can approve team leaves
            return true
          }
          // Multi-level: check if there's a manager level pending
          const managerLevel = l.approvalLevels.find(al => al.approverRole === 'manager' && al.status === 'pending')
          if (!managerLevel) return false
          // Check if previous levels are approved (should be none for level 1)
          const previousLevels = l.approvalLevels.filter(al => al.level < managerLevel.level)
          return previousLevels.every(al => al.status === 'approved')
        }).length
        
        return {
          teamMembers: store.staff.length, // In real app, filter by team
          pendingApprovals: store.leaves.filter(l => l.status === 'pending').length,
          managerPendingLeaves, // Leaves specifically needing manager approval
          approvedThisMonth: store.leaves.filter(l => l.status === 'approved').length,
          teamLeaves: store.leaves.length,
        }
      default:
        return {}
    }
  }

  const metrics = getMetrics()
  const pendingLeaves = store.leaves.filter(l => l.status === 'pending').length
  const totalStaff = store.staff.filter(s => s.active).length
  const activeRequests = store.leaves.filter(l => l.status === 'approved').length

  return (
    <div className={`p-8 space-y-8 bg-gradient-to-b ${theme.gradient}`}>
      {/* Welcome Section */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 ${theme.iconBg} rounded-lg`}>
            <WelcomeIcon className={`w-6 h-6 ${theme.iconColor}`} />
          </div>
          <h1 className="text-4xl font-bold text-foreground">Welcome Back</h1>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <span className={`inline-block px-3 py-1 ${theme.badgeBg} ${theme.badgeText} font-semibold rounded-full text-sm capitalize`}>
            {userRole} Role
          </span>
        </div>
        <p className="text-muted-foreground text-lg">{roleDescriptions[userRole as 'hr' | 'manager']}</p>
      </div>

      {/* KPI Cards - Role Specific */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {userRole === 'hr' && (
          <>
            <Card className={`border-2 ${theme.border}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Staff</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${theme.accent}`}>{metrics.totalStaff}</p>
                <p className="text-xs text-muted-foreground mt-1">Active employees</p>
              </CardContent>
            </Card>
            <Card className={`border-2 ${theme.border}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Processing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <p className={`text-3xl font-bold ${theme.accent}`}>{metrics.pendingLeaves}</p>
                  {metrics.hrPendingLeaves > 0 && metrics.hrPendingLeaves < metrics.pendingLeaves && (
                    <Badge variant="secondary" className="text-xs">
                      {metrics.hrPendingLeaves} need HR
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Leave requests</p>
                {metrics.hrPendingLeaves > 0 && (
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
        {userRole === 'manager' && (
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
                  <p className={`text-3xl font-bold ${theme.accent}`}>{metrics.pendingApprovals}</p>
                  {metrics.managerPendingLeaves > 0 && (
                    <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                      {metrics.managerPendingLeaves} ready
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Awaiting your review</p>
                {metrics.managerPendingLeaves > 0 && (
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
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {/* Staff Search - Only for HR */}
      {userRole === 'hr' && (
      <Card className={theme.border ? `border-2 ${theme.border}` : ''}>
        <CardHeader>
          <CardTitle>Staff Lookup</CardTitle>
          <CardDescription>Search employee by Staff ID</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
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
                  Available staff IDs: {store.staff.map(s => s.staffId).join(', ')}
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
            {userRole === 'hr' && 'Recent Activities'}
            {userRole === 'manager' && 'Team Activities'}
          </CardTitle>
          <CardDescription>
            {userRole === 'hr' && 'Recent HR activities and changes'}
            {userRole === 'manager' && 'Recent team leave activities'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {store.auditLogs.slice(0, 10).map(log => (
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
