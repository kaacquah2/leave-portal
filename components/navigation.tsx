'use client'

import { useState } from 'react'
import { LayoutDashboard, Users, Calendar, BarChart3, LogOut, FileText, CalendarDays, FileCheck, CalendarCheck, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useIsMobile } from '@/components/ui/use-mobile'

interface NavigationProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  userRole: 'hr' | 'manager' | 'employee' | 'admin'
  onLogout?: () => void
}

export default function Navigation({ activeTab, setActiveTab, userRole, onLogout }: NavigationProps) {
  const isMobile = useIsMobile()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // MoFAD: All roles use consistent blue/white theme
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

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['hr', 'manager'] },
    { id: 'staff', label: userRole === 'hr' ? 'Staff Management' : 'My Team', icon: Users, roles: ['hr', 'manager'] },
    { id: 'leave', label: userRole === 'manager' ? 'Approve Leaves' : 'Leave Management', icon: Calendar, roles: ['hr', 'manager'] },
    { id: 'leave-calendar', label: 'Leave Calendar', icon: CalendarDays, roles: ['hr', 'manager'] },
    { id: 'leave-policies', label: 'Leave Policies', icon: FileCheck, roles: ['hr'] },
    { id: 'holidays', label: 'Holidays', icon: CalendarCheck, roles: ['hr'] },
    { id: 'leave-templates', label: 'Leave Templates', icon: FileText, roles: ['hr'] },
    { id: 'reports', label: 'Reports', icon: BarChart3, roles: ['hr', 'manager'] },
  ]

  const visibleItems = navItems.filter(item => item.roles.includes(userRole))

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
              {item.label}
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
