'use client'

import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { LogOut, Shield, Users, UserCheck } from 'lucide-react'
import { APP_CONFIG } from '@/lib/app-config'

interface HeaderProps {
  onLogout?: () => void
  userRole?: 'hr' | 'manager' | 'employee'
}

export default function Header({ onLogout, userRole }: HeaderProps) {
  const getRoleConfig = (role?: string) => {
    const configMap = {
      hr: {
        label: 'HR Officer',
        bgColor: 'bg-green-600',
        icon: Users,
        subtitle: 'Human Resources Portal',
      },
      manager: {
        label: 'Manager',
        bgColor: 'bg-amber-600',
        icon: UserCheck,
        subtitle: 'Team Management Portal',
      },
      employee: {
        label: 'Employee',
        bgColor: 'bg-blue-600',
        icon: UserCheck,
        subtitle: 'Employee Self-Service Portal',
      },
    }
    return configMap[role as keyof typeof configMap] || {
      label: '',
      bgColor: 'bg-primary',
      icon: Shield,
      subtitle: APP_CONFIG.appDescription,
    }
  }

  const config = getRoleConfig(userRole)
  const Icon = config.icon

  return (
    <header className={`${config.bgColor} text-white shadow-lg`}>
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 relative flex-shrink-0">
              <Image
                src="/mofa-logo.png"
                alt={`${APP_CONFIG.organizationName} Logo`}
                fill
                className="object-contain"
                priority
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{APP_CONFIG.organizationNameShort}</h1>
              <p className="text-sm opacity-90">{config.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <p className="font-semibold">{config.label}</p>
              <p className="opacity-75 text-xs">Role-based Access</p>
            </div>
            {onLogout && (
              <Button
                onClick={onLogout}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
