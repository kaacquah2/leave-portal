'use client'

import { LayoutDashboard, Calendar, FileText, DollarSign, User, Award, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmployeeNavigationProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  onLogout?: () => void
}

export default function EmployeeNavigation({ activeTab, setActiveTab, onLogout }: EmployeeNavigationProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'leave-balances', label: 'Leave Balances', icon: Calendar },
    { id: 'leave-history', label: 'Leave History', icon: Calendar },
    { id: 'payslips', label: 'Payslips', icon: DollarSign },
    { id: 'personal-info', label: 'Personal Info', icon: User },
    { id: 'performance', label: 'Performance', icon: Award },
  ]

  return (
    <aside className="w-64 bg-blue-50 border-r border-blue-200 min-h-screen flex flex-col">
      <nav className="p-6 space-y-2 flex-1">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <Button
              key={item.id}
              variant={isActive ? 'default' : 'ghost'}
              className={`w-full justify-start gap-3 ${
                isActive 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'text-blue-700 hover:bg-blue-50'
              }`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Button>
          )
        })}
      </nav>

      <div className="p-6 border-t border-blue-200">
        {onLogout && (
          <Button
            variant="destructive"
            className="w-full justify-start gap-2"
            onClick={onLogout}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        )}
      </div>
    </aside>
  )
}

