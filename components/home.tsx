'use client'

import { Shield, Users, FileText, BarChart3, CheckCircle, Clock, AlertCircle, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useDataStore } from '@/lib/data-store'

interface HomeProps {
  userRole: 'hr' | 'manager'
  onNavigate: (tab: string) => void
}

export default function Home({ userRole, onNavigate }: HomeProps) {
  const store = useDataStore()

  const stats = {
    hr: [
      { label: 'Total Staff', value: store.staff.length, icon: Users, color: 'bg-blue-100 text-blue-600' },
      { label: 'Pending Leaves', value: store.leaves.filter(l => l.status === 'pending').length, icon: Clock, color: 'bg-yellow-100 text-yellow-600' },
      { label: 'Approved Leaves', value: store.leaves.filter(l => l.status === 'approved').length, icon: CheckCircle, color: 'bg-green-100 text-green-600' },
      { label: 'Recent Activities', value: store.auditLogs.slice(0, 5).length, icon: FileText, color: 'bg-indigo-100 text-indigo-600' },
    ],
    manager: [
      { label: 'Team Members', value: store.staff.length, icon: Users, color: 'bg-blue-100 text-blue-600' },
      { label: 'Pending Approvals', value: store.leaves.filter(l => l.status === 'pending').length, icon: Clock, color: 'bg-yellow-100 text-yellow-600' },
      { label: 'Approved This Month', value: store.leaves.filter(l => l.status === 'approved').length, icon: CheckCircle, color: 'bg-green-100 text-green-600' },
    ],
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

  const roleDescriptions = {
    hr: 'Manage staff records, process leave requests, and generate reports.',
    manager: 'Review team leaves and approve or reject leave requests.',
  }

  const currentStats = stats[userRole]
  const currentActions = quickActions[userRole]

  const getRoleTheme = () => {
    switch (userRole) {
      case 'hr':
        return {
          gradient: 'from-green-50 via-background to-green-50/30',
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          badgeBg: 'bg-green-100',
          badgeText: 'text-green-700',
          welcomeIcon: Users,
        }
      case 'manager':
        return {
          gradient: 'from-amber-50 via-background to-amber-50/30',
          iconBg: 'bg-amber-100',
          iconColor: 'text-amber-600',
          badgeBg: 'bg-amber-100',
          badgeText: 'text-amber-700',
          welcomeIcon: UserCheck,
        }
      default:
        return {
          gradient: 'from-background to-secondary/5',
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

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.gradient} p-8`}>
      <div className="max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-8">
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
          <p className="text-muted-foreground text-lg">{roleDescriptions[userRole]}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {currentStats.map((stat, idx) => {
            const Icon = stat.icon
            return (
              <Card key={idx} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-muted-foreground text-sm font-medium mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              </Card>
            )
          })}
        </div>

        {/* Quick Actions */}
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

        {/* Recent Activity */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Recent Activity</h2>
          <Card className="p-6">
            {store.auditLogs.length > 0 ? (
              <div className="space-y-4">
                {store.auditLogs.slice(0, 5).map(log => (
                  <div key={log.id} className="flex items-start gap-4 pb-4 border-b border-border last:border-b-0">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm">{log.action.replace(/_/g, ' ')}</p>
                      <p className="text-muted-foreground text-sm">{log.details}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-muted-foreground">No recent activity</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
