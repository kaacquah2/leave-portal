'use client'

import { useState } from 'react'
import { LayoutDashboard, Users, FileText, Settings, LogOut, Shield, KeyRound, Menu, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useIsMobile } from '@/components/ui/use-mobile'
import { hasPermission, type UserRole, type Permission } from '@/lib/permissions'

interface AdminNavigationProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  onLogout?: () => void
  userRole?: UserRole // Optional for future permission checks
}

interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  permission?: Permission
}

export default function AdminNavigation({ activeTab, setActiveTab, onLogout, userRole = 'admin' }: AdminNavigationProps) {
  const isMobile = useIsMobile()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'system:reports:view' },
    { id: 'users', label: 'User Management', icon: Users, permission: 'system:users:manage' },
    { id: 'password-resets', label: 'Password Resets', icon: KeyRound, permission: 'system:users:manage' },
    { id: 'audit-logs', label: 'Audit Logs', icon: FileText, permission: 'system:audit:view' },
    { id: '2fa', label: '2FA Setup', icon: Lock, permission: 'system:users:manage' },
    { id: 'settings', label: 'System Settings', icon: Settings, permission: 'system:config:manage' },
  ]

  // Filter by permission if specified (admin has all permissions, but this allows for future role restrictions)
  const visibleItems = navItems.filter(item => 
    !item.permission || hasPermission(userRole, item.permission)
  )

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
      <div className="p-4 md:p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <h2 className="font-bold text-foreground">Admin Portal</h2>
        </div>
      </div>
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
                  ? 'bg-primary hover:bg-primary/90 text-white border-l-4 border-primary' 
                  : 'text-foreground hover:bg-muted'
              }`}
              onClick={() => handleTabChange(item.id)}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Button>
          )
        })}
      </nav>

      <div className="p-4 md:p-6 border-t border-border">
        {onLogout && (
          <Button
            variant="destructive"
            className="w-full justify-start gap-2"
            onClick={handleLogout}
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
          <div className="bg-white min-h-screen flex flex-col">
            <NavContent />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop: Regular sidebar
  return (
    <aside className="hidden md:flex w-64 bg-white border-r border-border min-h-screen flex flex-col">
      <NavContent />
    </aside>
  )
}

