'use client'

import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { APP_CONFIG } from '@/lib/app-config'

interface LandingProps {
  onSignIn: () => void
}

export default function Landing({ onSignIn }: LandingProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-secondary to-accent">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-12">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 relative">
            <Image
              src="/mofa-logo.png"
              alt={`${APP_CONFIG.organizationName} Logo`}
              fill
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-xl font-bold text-primary-foreground">{APP_CONFIG.appNameShort}</h1>
        </div>
        <Button onClick={onSignIn} variant="secondary" size="lg">
          Sign In
        </Button>
      </nav>

      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center px-4 sm:px-6 py-12 sm:py-20 md:px-12 md:py-32 max-w-7xl mx-auto">
        {/* Left Column */}
        <div className="space-y-6 sm:space-y-8">
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground text-balance">
              Streamlined Staff & Leave Management
            </h2>
            <p className="text-base sm:text-lg text-primary-foreground/90 leading-relaxed">
              Manage your workforce efficiently. Handle staff records, leave requests, and approvals all in one unified platform designed for the {APP_CONFIG.organizationName}.
            </p>
          </div>

          {/* Features List */}
          <ul className="space-y-3 sm:space-y-4">
            {[
              { title: 'Staff Management', desc: 'Comprehensive employee records and profiles' },
              { title: 'Leave Tracking', desc: 'Request, approve, and manage leave with ease' },
              { title: 'Role-Based Access', desc: 'Admin, HR Officer, and Manager permissions' },
              { title: 'Real-Time Reports', desc: 'Instant insights into staffing and leave data' },
            ].map((feature) => (
              <li key={feature.title} className="flex gap-2 sm:gap-3">
                <div className="h-2 w-2 rounded-full bg-primary-foreground flex-shrink-0 mt-2" />
                <div>
                  <h3 className="font-semibold text-primary-foreground text-sm sm:text-base">{feature.title}</h3>
                  <p className="text-xs sm:text-sm text-primary-foreground/80">{feature.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <Button onClick={onSignIn} size="lg" variant="secondary" className="w-full sm:w-fit">
            Get Started
          </Button>
        </div>

        {/* Right Column - Stats */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6">
          {[
            { value: '500+', label: 'Staff Members', icon: '👥' },
            { value: '2,400+', label: 'Leave Requests', icon: '📋' },
            { value: '100%', label: 'Uptime', icon: '✓' },
            { value: '24/7', label: 'Support', icon: '🔧' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 text-center border border-white/20"
            >
              <div className="text-2xl sm:text-3xl mb-2">{stat.icon}</div>
              <p className="text-xl sm:text-2xl font-bold text-primary-foreground">{stat.value}</p>
              <p className="text-xs sm:text-sm text-primary-foreground/80 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-20 py-8 px-6 md:px-12">
        <div className="text-center text-primary-foreground/70 text-sm">
          <p>© {APP_CONFIG.copyrightYear} {APP_CONFIG.organizationName}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
