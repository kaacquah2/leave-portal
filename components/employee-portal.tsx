'use client'

import { useState } from 'react'
import { useDataStore } from '@/lib/data-store'
import Header from '@/components/header'
import EmployeeNavigation from '@/components/employee-navigation'
import EmployeeDashboard from '@/components/employee-dashboard'
import EmployeeLeaveBalances from '@/components/employee-leave-balances'
import EmployeeLeaveHistory from '@/components/employee-leave-history'
import EmployeePayslips from '@/components/employee-payslips'
import EmployeePersonalInfo from '@/components/employee-personal-info'
import EmployeePerformanceReviews from '@/components/employee-performance-reviews'

interface EmployeePortalProps {
  staffId: string
  onLogout: () => void
}

export default function EmployeePortal({ staffId, onLogout }: EmployeePortalProps) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const store = useDataStore()
  
  const currentStaff = store.staff.find(s => s.staffId === staffId)

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <EmployeeDashboard store={store} staffId={staffId} />
      case 'leave-balances':
        return <EmployeeLeaveBalances store={store} staffId={staffId} />
      case 'leave-history':
        return <EmployeeLeaveHistory store={store} staffId={staffId} />
      case 'payslips':
        return <EmployeePayslips store={store} staffId={staffId} />
      case 'personal-info':
        return <EmployeePersonalInfo store={store} staffId={staffId} />
      case 'performance':
        return <EmployeePerformanceReviews store={store} staffId={staffId} />
      default:
        return <EmployeeDashboard store={store} staffId={staffId} />
    }
  }

  if (!currentStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Staff member not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-background to-blue-50/30">
      <Header onLogout={onLogout} userRole="employee" />
      <div className="flex">
        <EmployeeNavigation activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout} />
        <main className="flex-1 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}

