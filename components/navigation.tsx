'use client'

import { LayoutDashboard, Users, Calendar, BarChart3, LogOut, FileText, CalendarDays, FileCheck, CalendarCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NavigationProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  userRole: 'hr' | 'manager'
  onLogout?: () => void
}

export default function Navigation({ activeTab, setActiveTab, userRole, onLogout }: NavigationProps) {
  const getRoleTheme = () => {
    switch (userRole) {
      case 'hr':
        return {
          bg: 'bg-green-50 border-green-200',
          activeBg: 'bg-green-600 hover:bg-green-700',
          text: 'text-green-700',
          border: 'border-green-300',
        }
      case 'manager':
        return {
          bg: 'bg-amber-50 border-amber-200',
          activeBg: 'bg-amber-600 hover:bg-amber-700',
          text: 'text-amber-700',
          border: 'border-amber-300',
        }
      default:
        return {
          bg: 'bg-card border-border',
          activeBg: 'bg-primary hover:bg-primary/90',
          text: 'text-foreground',
          border: 'border-border',
        }
    }
  }

  const theme = getRoleTheme()

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['hr', 'manager'] },
    { id: 'staff', label: userRole === 'hr' ? 'Staff Management' : 'Staff Directory', icon: Users, roles: ['hr'] },
    { id: 'leave', label: userRole === 'manager' ? 'Team Leaves' : 'Leave Management', icon: Calendar, roles: ['hr', 'manager'] },
    { id: 'leave-calendar', label: 'Leave Calendar', icon: CalendarDays, roles: ['hr', 'manager'] },
    { id: 'leave-policies', label: 'Leave Policies', icon: FileCheck, roles: ['hr'] },
    { id: 'holidays', label: 'Holidays', icon: CalendarCheck, roles: ['hr'] },
    { id: 'leave-templates', label: 'Leave Templates', icon: FileText, roles: ['hr'] },
    { id: 'reports', label: 'Reports', icon: BarChart3, roles: ['hr'] },
  ]

  const visibleItems = navItems.filter(item => item.roles.includes(userRole))

  return (
    <aside className={`w-64 ${theme.bg} border-r ${theme.border} min-h-screen flex flex-col`}>
      <nav className="p-6 space-y-2 flex-1">
        {visibleItems.map(item => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <Button
              key={item.id}
              variant={isActive ? 'default' : 'ghost'}
              className={`w-full justify-start gap-3 ${
                isActive 
                  ? `${theme.activeBg} text-white` 
                  : `${theme.text} hover:${theme.bg}`
              }`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Button>
          )
        })}
      </nav>

      <div className={`p-6 border-t ${theme.border}`}>
        {onLogout && (
          <Button
            onClick={onLogout}
            variant="destructive"
            className="w-full justify-start gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        )}
      </div>
    </aside>
  )
}
