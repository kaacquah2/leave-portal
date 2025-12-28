'use client'

import { useState } from 'react'
import { LayoutDashboard, Calendar, FileText, User, LogOut, Bell, Menu, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useIsMobile } from '@/components/ui/use-mobile'

interface EmployeeNavigationProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  onLogout?: () => void
}

export default function EmployeeNavigation({ activeTab, setActiveTab, onLogout }: EmployeeNavigationProps) {
  const isMobile = useIsMobile()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Government HR: Simplified employee navigation - core features only
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'apply-leave', label: 'Apply for Leave', icon: Plus },
    { id: 'leave-balances', label: 'Leave Balances', icon: Calendar },
    { id: 'leave-history', label: 'Leave History', icon: Calendar },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'profile', label: 'View Profile', icon: User },
    { id: 'documents', label: 'My Documents', icon: FileText },
  ]

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
      <nav className="p-4 md:p-6 space-y-2 flex-1 overflow-y-auto">
        {navItems.map(item => {
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

