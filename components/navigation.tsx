'use client'

import { useState } from 'react'
import { LayoutDashboard, Users, Calendar, BarChart3, LogOut, FileText, CalendarDays, FileCheck, CalendarCheck, Menu, UserCheck, CalendarClock, UserCog, Building2, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useIsMobile } from '@/components/ui/use-mobile'
import { hasPermission, type UserRole, type Permission } from '@/lib/roles'

interface NavigationProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  userRole: 'hr' | 'hr_assistant' | 'manager' | 'deputy_director' | 'employee' | 'admin' | 
            'EMPLOYEE' | 'SUPERVISOR' | 'UNIT_HEAD' | 'DIVISION_HEAD' | 'DIRECTOR' | 
            'REGIONAL_MANAGER' | 'HR_OFFICER' | 'HR_DIRECTOR' | 'CHIEF_DIRECTOR' | 'AUDITOR' | 'SYS_ADMIN'
  onLogout?: () => void
}

interface NavItem {
  id: string
  label: string | ((role: string) => string)
  icon: React.ComponentType<{ className?: string }>
  roles?: string[]
  permission?: Permission
}

export default function Navigation({ activeTab, setActiveTab, userRole, onLogout }: NavigationProps) {
  const isMobile = useIsMobile()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // MoFA: All roles use consistent blue/white theme
  const getRoleTheme = () => {
    return {
      bg: 'bg-white border-border', // White sidebar background
      activeBg: 'bg-primary hover:bg-primary/90', // Government Blue for active items
      text: 'text-foreground', // Dark Blue/Charcoal text
      border: 'border-border', // Light Grey borders
      activeBorder: 'border-l-4 border-primary', // Blue left border for active items
    }
  }

  const theme = getRoleTheme()

  const navItems: NavItem[] = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard, 
      roles: ['hr', 'hr_assistant', 'manager', 'deputy_director', 'EMPLOYEE', 'SUPERVISOR', 'UNIT_HEAD', 'DIVISION_HEAD', 'DIRECTOR', 'REGIONAL_MANAGER', 'HR_OFFICER', 'HR_DIRECTOR', 'CHIEF_DIRECTOR', 'AUDITOR', 'SYS_ADMIN'],
      // Dashboard accessible to all - no specific permission required
    },
    { 
      id: 'staff', 
      label: (userRole === 'hr' || userRole === 'hr_assistant' || userRole === 'HR_OFFICER' || userRole === 'HR_DIRECTOR' || (userRole as string) === 'hr_officer' || (userRole as string) === 'hr_director') ? 'Staff Management' : 
             (userRole === 'CHIEF_DIRECTOR' || (userRole as string) === 'chief_director') ? 'Staff Directory' : 'My Team', 
      icon: Users, 
      roles: ['hr', 'hr_assistant', 'manager', 'deputy_director', 'SUPERVISOR', 'UNIT_HEAD', 'DIVISION_HEAD', 'DIRECTOR', 'REGIONAL_MANAGER', 'HR_OFFICER', 'HR_DIRECTOR', 'CHIEF_DIRECTOR', 'AUDITOR', 'SYS_ADMIN', 'hr_officer', 'hr_director', 'chief_director'],
      // Check both view:all (HR) and view:team (managers/supervisors)
      permission: undefined // Will be checked in portal component
    },
    { 
      id: 'manager-assignment', 
      label: 'Manager Assignment', 
      icon: UserCog, 
      roles: ['hr'],
      permission: 'employee:update' // Only HR can assign managers
    },
    { 
      id: 'leave', 
      label: (userRole === 'manager' || userRole === 'deputy_director' || userRole === 'SUPERVISOR' || userRole === 'UNIT_HEAD' || userRole === 'DIVISION_HEAD' || userRole === 'DIRECTOR' || userRole === 'REGIONAL_MANAGER') ? 'Approve Leaves' : 'Leave Management', 
      icon: Calendar, 
      roles: ['hr', 'hr_assistant', 'manager', 'deputy_director', 'EMPLOYEE', 'SUPERVISOR', 'UNIT_HEAD', 'DIVISION_HEAD', 'DIRECTOR', 'REGIONAL_MANAGER', 'HR_OFFICER', 'HR_DIRECTOR', 'CHIEF_DIRECTOR', 'AUDITOR', 'SYS_ADMIN'],
      // Check both view:all (HR) and view:team (managers/supervisors)
      permission: undefined // Will be checked in portal component
    },
    { 
      id: 'delegation', 
      label: 'Delegation', 
      icon: UserCheck,
      roles: ['hr', 'manager', 'deputy_director', 'SUPERVISOR', 'UNIT_HEAD', 'DIVISION_HEAD', 'DIRECTOR', 'REGIONAL_MANAGER', 'HR_OFFICER', 'HR_DIRECTOR', 'CHIEF_DIRECTOR'],
      permission: 'leave:approve:team' // Can delegate approvals
    },
    { 
      id: 'deferment', 
      label: 'Deferment Request', 
      icon: Calendar,
      roles: ['EMPLOYEE', 'employee', 'SUPERVISOR', 'UNIT_HEAD', 'DIVISION_HEAD', 'DIRECTOR', 'REGIONAL_MANAGER', 'HR_OFFICER', 'HR_DIRECTOR', 'supervisor', 'manager'],
      // Employees can create, supervisors/HR can view
    },
    { 
      id: 'encashment', 
      label: 'Encashment', 
      icon: DollarSign,
      roles: ['HR_DIRECTOR', 'CHIEF_DIRECTOR', 'hr_director', 'chief_director'],
      // Only HR Director or Chief Director
    },
    { 
      id: 'holidays', 
      label: 'Holidays', 
      icon: CalendarCheck, 
      roles: ['hr', 'hr_assistant', 'HR_OFFICER', 'HR_DIRECTOR', 'hr_officer', 'hr_director'],
      permission: 'leave:policy:manage' // Part of policy management
    },
    { 
      id: 'leave-templates', 
      label: 'Leave Templates', 
      icon: FileText, 
      roles: ['hr', 'hr_assistant', 'HR_OFFICER', 'HR_DIRECTOR', 'hr_officer', 'hr_director'],
      permission: 'leave:policy:manage' // Part of policy management
    },
    { 
      id: 'year-end', 
      label: 'Year-End Processing', 
      icon: CalendarClock, 
      roles: ['hr', 'hr_assistant', 'HR_OFFICER', 'HR_DIRECTOR', 'hr_officer', 'hr_director'],
      permission: 'leave:policy:manage' // Year-end processing
    },
    { 
      id: 'calendar', 
      label: 'Leave Calendar', 
      icon: CalendarDays, 
      roles: ['hr', 'hr_assistant', 'manager', 'deputy_director', 'EMPLOYEE', 'SUPERVISOR', 'UNIT_HEAD', 'DIVISION_HEAD', 'DIRECTOR', 'REGIONAL_MANAGER', 'HR_OFFICER', 'HR_DIRECTOR', 'CHIEF_DIRECTOR', 'AUDITOR', 'SYS_ADMIN'],
      permission: undefined // Will be checked in portal component
    },
    { 
      id: 'availability', 
      label: 'Availability', 
      icon: Users, 
      roles: ['hr', 'hr_assistant', 'manager', 'deputy_director', 'EMPLOYEE', 'SUPERVISOR', 'UNIT_HEAD', 'DIVISION_HEAD', 'DIRECTOR', 'REGIONAL_MANAGER', 'HR_OFFICER', 'HR_DIRECTOR', 'CHIEF_DIRECTOR', 'AUDITOR', 'SYS_ADMIN'],
      permission: undefined // Will be checked in portal component
    },
    { 
      id: 'reports', 
      label: 'Reports', 
      icon: BarChart3, 
      roles: ['hr', 'hr_assistant', 'manager', 'deputy_director', 'SUPERVISOR', 'UNIT_HEAD', 'DIVISION_HEAD', 'DIRECTOR', 'REGIONAL_MANAGER', 'HR_OFFICER', 'HR_DIRECTOR', 'CHIEF_DIRECTOR', 'AUDITOR', 'SYS_ADMIN'],
      // Check both hr:view (HR) and team:view (managers/supervisors)
      permission: undefined // Will be checked in portal component
    },
    { 
      id: 'organizational-structure', 
      label: 'Organizational Structure', 
      icon: Building2, 
      roles: ['hr', 'hr_assistant', 'manager', 'deputy_director', 'employee', 'admin', 'SUPERVISOR', 'UNIT_HEAD', 'DIVISION_HEAD', 'DIRECTOR', 'REGIONAL_MANAGER', 'HR_OFFICER', 'HR_DIRECTOR', 'CHIEF_DIRECTOR', 'AUDITOR', 'SYS_ADMIN', 'EMPLOYEE'],
      // Supervisors can view own unit, so allow this
      permission: undefined // Will be checked in portal component
    },
  ]

  // Filter by both role and permission with better error handling
  const visibleItems = navItems.filter(item => {
    // First check if role is allowed
    if (item.roles && !item.roles.includes(userRole)) {
      return false
    }
    // Then check permission if specified
    if (item.permission) {
      const hasAccess = hasPermission(userRole as UserRole, item.permission)
      // Log in development if permission check fails
      if (process.env.NODE_ENV === 'development' && !hasAccess) {
        console.debug(`[Navigation] User ${userRole} lacks permission ${item.permission} for ${item.id}`)
      }
      return hasAccess
    }
    // For items without explicit permission, check based on item type
    if (item.id === 'staff') {
      // Staff view: check for view:all (HR) or view:team (managers/supervisors)
      return hasPermission(userRole as UserRole, 'employee:view:all') || 
             hasPermission(userRole as UserRole, 'employee:view:team')
    }
    if (item.id === 'leave') {
      // Leave view: check for view:all (HR) or view:team (managers/supervisors) or view:own (employees)
      return hasPermission(userRole as UserRole, 'leave:view:all') || 
             hasPermission(userRole as UserRole, 'leave:view:team') ||
             hasPermission(userRole as UserRole, 'employee:leave:view:own')
    }
    if (item.id === 'reports') {
      // Reports: check for hr:view (HR) or team:view (managers/supervisors) or system:view (executives)
      return hasPermission(userRole as UserRole, 'reports:hr:view') || 
             hasPermission(userRole as UserRole, 'reports:team:view') ||
             hasPermission(userRole as UserRole, 'reports:system:view')
    }
    if (item.id === 'organizational-structure') {
      // Org structure: check for view:all (HR) or view:own (managers/supervisors)
      return hasPermission(userRole as UserRole, 'org:view:all') || 
             hasPermission(userRole as UserRole, 'unit:view:own') ||
             hasPermission(userRole as UserRole, 'directorate:view:own') ||
             hasPermission(userRole as UserRole, 'region:view:own')
    }
    // Dashboard and other items without explicit permission are accessible
    return true
  })

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    if (isMobile) {
      setMobileMenuOpen(false)
    }
  }

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
    }
    if (isMobile) {
      setMobileMenuOpen(false)
    }
  }

  const NavContent = () => (
    <>
      <nav className="p-4 md:p-6 space-y-2 flex-1">
        {visibleItems.map(item => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <Button
              key={item.id}
              variant={isActive ? 'default' : 'ghost'}
              className={`w-full justify-start gap-3 ${
                isActive 
                  ? `${theme.activeBg} text-white ${theme.activeBorder}` 
                  : `${theme.text} hover:bg-muted`
              }`}
              onClick={() => handleTabChange(item.id)}
            >
              <Icon className="w-5 h-5" />
              {typeof item.label === 'function' ? item.label(userRole) : item.label}
            </Button>
          )
        })}
      </nav>

      <div className={`p-4 md:p-6 border-t ${theme.border}`}>
        {onLogout && (
          <Button
            onClick={handleLogout}
            variant="destructive"
            className="w-full justify-start gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        )}
      </div>
    </>
  )

  // Mobile: Use Sheet drawer
  if (isMobile) {
    return (
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden fixed top-4 left-4 z-50 bg-white shadow-md"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className={`${theme.bg} min-h-screen flex flex-col`}>
            <NavContent />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop: Regular sidebar
  return (
    <aside className={`hidden md:flex w-64 ${theme.bg} border-r ${theme.border} min-h-screen flex-col`}>
      <NavContent />
    </aside>
  )
}
