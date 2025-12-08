'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Users, UserCheck } from 'lucide-react'

interface RoleSelectionProps {
  onRoleSelected: (role: 'hr' | 'manager') => void
  onBack: () => void
}

export default function RoleSelection({ onRoleSelected, onBack }: RoleSelectionProps) {
  const roles = [
    {
      id: 'hr',
      title: 'HR Officer',
      icon: Users,
      description: 'Manage employee lifecycle, HR data, payroll input, and compliance.',
      permissions: ['Employee Records', 'Salary & Contracts', 'Leave Processing', 'HR Reports', 'Performance Management'],
      color: 'bg-green-100 text-green-700 border-green-200',
      buttonColor: 'bg-green-600 hover:bg-green-700',
    },
    {
      id: 'manager',
      title: 'Manager',
      icon: UserCheck,
      description: 'Supervise team members, approve operational requests, and conduct performance reviews.',
      permissions: ['Team Leave Approval', 'Team Performance', 'Team Attendance', 'Team Reports'],
      color: 'bg-amber-100 text-amber-700 border-amber-200',
      buttonColor: 'bg-amber-600 hover:bg-amber-700',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="w-full max-w-4xl mb-12">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-primary hover:text-primary/80 mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Select Your Role</h1>
          <p className="text-muted-foreground text-lg">
            Choose your role to access the HR Management Portal. Each role has specific permissions and features.
          </p>
        </div>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mb-8">
        {roles.map((role) => {
          const Icon = role.icon
          return (
            <Card
              key={role.id}
              className={`p-6 border-2 cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${role.color}`}
              onClick={() => onRoleSelected(role.id as 'hr' | 'manager')}
            >
              <div className="flex flex-col h-full gap-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold">{role.title}</h2>
                  </div>
                  <Icon className="h-8 w-8 opacity-40" />
                </div>

                <p className="text-sm opacity-80">{role.description}</p>

                <div className="flex-1">
                  <p className="text-xs font-semibold opacity-60 mb-2">PERMISSIONS</p>
                  <ul className="space-y-1">
                    {role.permissions.map((perm) => (
                      <li key={perm} className="text-xs opacity-70 flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0 opacity-50" />
                        {perm}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button className={`w-full text-white ${role.buttonColor}`}>
                  Sign In as {role.title.split(' ')[0]}
                </Button>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Demo Note */}
      <div className="w-full max-w-4xl bg-muted/50 rounded-lg p-4 text-center text-sm text-muted-foreground">
        This is a demo environment. All data is stored locally and will reset on browser refresh.
      </div>
    </div>
  )
}
