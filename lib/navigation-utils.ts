/**
 * Navigation Utilities
 * Maps role portal pages to navigation items
 */

import { getRolePages, getRolePortalConfig } from './role-portals-config'
import { type UserRole } from './permissions'
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  BarChart3, 
  FileText,
  CalendarDays,
  UserCheck,
  Building2,
  CheckCircle,
  Clock,
  Settings,
  Eye,
  Bell
} from 'lucide-react'

export interface NavItemConfig {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  page?: string // Maps to role portal page name
}

/**
 * Map role portal page names to navigation items
 */
const pageToNavItem: Record<string, NavItemConfig> = {
  'My Leave Requests': {
    id: 'leave',
    label: 'My Leave Requests',
    icon: Calendar,
  },
  'Apply Leave': {
    id: 'leave',
    label: 'Apply Leave',
    icon: Calendar,
  },
  'Leave Balance': {
    id: 'leave',
    label: 'Leave Balance',
    icon: Calendar,
  },
  'Notifications': {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
  },
  'Pending Approvals': {
    id: 'leave',
    label: 'Pending Approvals',
    icon: Clock,
  },
  'Team Leave Calendar': {
    id: 'calendar',
    label: 'Team Leave Calendar',
    icon: CalendarDays,
  },
  'Leave History of Subordinates': {
    id: 'leave',
    label: 'Leave History',
    icon: FileText,
  },
  'Unit Pending Approvals': {
    id: 'leave',
    label: 'Unit Pending Approvals',
    icon: Clock,
  },
  'Acting Officer Assignment': {
    id: 'acting-appointments',
    label: 'Acting Officer Assignment',
    icon: UserCheck,
  },
  'Unit Leave Calendar': {
    id: 'calendar',
    label: 'Unit Leave Calendar',
    icon: CalendarDays,
  },
  'Directorate Leave Approvals': {
    id: 'leave',
    label: 'Directorate Leave Approvals',
    icon: Clock,
  },
  'Leave Analytics': {
    id: 'reports',
    label: 'Leave Analytics',
    icon: BarChart3,
  },
  'Acting Officer Assignments': {
    id: 'acting-appointments',
    label: 'Acting Officer Assignments',
    icon: UserCheck,
  },
  'Staff Leave History': {
    id: 'leave',
    label: 'Staff Leave History',
    icon: FileText,
  },
  'Pending Leave Approvals': {
    id: 'leave',
    label: 'Pending Leave Approvals',
    icon: Clock,
  },
  'Acting Officer Management': {
    id: 'acting-appointments',
    label: 'Acting Officer Management',
    icon: UserCheck,
  },
  'Leave Reports': {
    id: 'reports',
    label: 'Leave Reports',
    icon: BarChart3,
  },
  'Unit Head Leave Approvals': {
    id: 'leave',
    label: 'Unit Head Leave Approvals',
    icon: Clock,
  },
  'Directorate Leave Overview': {
    id: 'leave',
    label: 'Directorate Leave Overview',
    icon: Calendar,
  },
  'Pending HR Validation': {
    id: 'hr-validation',
    label: 'Pending HR Validation',
    icon: CheckCircle,
  },
  'Leave Balance Checks': {
    id: 'leave',
    label: 'Leave Balance Checks',
    icon: Calendar,
  },
  'Reports & Audit': {
    id: 'reports',
    label: 'Reports & Audit',
    icon: BarChart3,
  },
  'PSC/OHCS Export': {
    id: 'reports',
    label: 'PSC/OHCS Export',
    icon: FileText,
  },
  'HR Staff Leave Approvals': {
    id: 'leave',
    label: 'HR Staff Leave Approvals',
    icon: Clock,
  },
  'Directorate Reports': {
    id: 'reports',
    label: 'Directorate Reports',
    icon: BarChart3,
  },
  'Acting Officer Oversight': {
    id: 'acting-appointments',
    label: 'Acting Officer Oversight',
    icon: UserCheck,
  },
  'Final Leave Approvals': {
    id: 'leave',
    label: 'Final Leave Approvals',
    icon: Clock,
  },
  'Ministry Leave Overview': {
    id: 'leave',
    label: 'Ministry Leave Overview',
    icon: Calendar,
  },
  'Reports / Audit': {
    id: 'reports',
    label: 'Reports / Audit',
    icon: BarChart3,
  },
  'PSC/OHCS Notifications': {
    id: 'leave',
    label: 'PSC/OHCS Notifications',
    icon: Bell,
  },
  'Audit Leave Requests': {
    id: 'leave',
    label: 'Audit Leave Requests',
    icon: Eye,
  },
  'Export Reports': {
    id: 'reports',
    label: 'Export Reports',
    icon: FileText,
  },
  'Audit Trails': {
    id: 'audit-logs',
    label: 'Audit Trails',
    icon: FileText,
  },
  'User Management': {
    id: 'admin',
    label: 'User Management',
    icon: Users,
  },
  'Role Assignment': {
    id: 'admin',
    label: 'Role Assignment',
    icon: Settings,
  },
  'System Settings': {
    id: 'admin',
    label: 'System Settings',
    icon: Settings,
  },
  'Logs': {
    id: 'admin',
    label: 'Logs',
    icon: FileText,
  },
}

/**
 * Get navigation items for a role based on role portal pages
 */
export function getRoleNavigationItems(role: UserRole): NavItemConfig[] {
  const pages = getRolePages(role)
  const navItems: NavItemConfig[] = []

  // Always include dashboard
  navItems.push({
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  })

  // Map pages to navigation items
  const seenIds = new Set<string>(['dashboard'])
  pages.forEach((page) => {
    const navItem = pageToNavItem[page]
    if (navItem && !seenIds.has(navItem.id)) {
      navItems.push(navItem)
      seenIds.add(navItem.id)
    }
  })

  return navItems
}

/**
 * Check if a role has access to a specific navigation item
 */
export function roleHasNavItem(role: UserRole, navItemId: string): boolean {
  const navItems = getRoleNavigationItems(role)
  return navItems.some(item => item.id === navItemId)
}

