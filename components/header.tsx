'use client'

import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { LogOut, Shield, Users, UserCheck } from 'lucide-react'
import { APP_CONFIG } from '@/lib/app-config'
import { useIsMobile } from '@/components/ui/use-mobile'

import type { UserRole } from '@/lib/permissions'

interface HeaderProps {
  onLogout?: () => void
  userRole?: UserRole
}

export default function Header({ onLogout, userRole }: HeaderProps) {
  const isMobile = useIsMobile()
  
  const getRoleConfig = (role?: string) => {
    // MoFA: All roles use blue theme (Government Blue)
    const configMap = {
      hr: {
        label: 'HR Officer',
        bgColor: 'bg-primary', // Government Blue
        icon: Users,
        subtitle: 'MoFA Staff Management & Leave Portal',
      },
      hr_assistant: {
        label: 'HR Assistant',
        bgColor: 'bg-primary', // Government Blue
        icon: Users,
        subtitle: 'MoFA Staff Management & Leave Portal',
      },
      manager: {
        label: 'Manager',
        bgColor: 'bg-primary', // Government Blue
        icon: UserCheck,
        subtitle: 'MoFA Staff Management & Leave Portal',
      },
      deputy_director: {
        label: 'Deputy Director',
        bgColor: 'bg-primary', // Government Blue
        icon: UserCheck,
        subtitle: 'MoFA Staff Management & Leave Portal',
      },
      employee: {
        label: 'Employee',
        bgColor: 'bg-primary', // Government Blue
        icon: UserCheck,
        subtitle: 'MoFA Staff Management & Leave Portal',
      },
      admin: {
        label: 'System Administrator',
        bgColor: 'bg-primary', // Government Blue
        icon: Shield,
        subtitle: 'MoFA Staff Management & Leave Portal',
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 sm:w-16 sm:h-16 relative flex-shrink-0">
              <Image
                src="/mofa-logo.png"
                alt={`${APP_CONFIG.organizationName} Logo`}
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold truncate">{APP_CONFIG.organizationNameShort}</h1>
              <p className="text-xs sm:text-sm opacity-90 hidden sm:block">{config.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {!isMobile && (
              <div className="text-right text-sm hidden md:block">
                <p className="font-semibold">{config.label}</p>
                <p className="opacity-75 text-xs">Role-based Access</p>
              </div>
            )}
            {onLogout && (
              <Button
                onClick={onLogout}
                variant="ghost"
                size={isMobile ? "icon" : "sm"}
                className="text-white hover:bg-white/20"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
                {!isMobile && <span className="ml-2 hidden lg:inline">Logout</span>}
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
