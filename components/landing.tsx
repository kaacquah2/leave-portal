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

      {/* Header Section - Full Width */}
      <div className="w-full bg-white/5 backdrop-blur-sm border-b border-white/10 py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12">
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground text-center">
            Staff Management and Leave Portal
          </h2>
        </div>
      </div>

      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center px-4 sm:px-6 py-12 sm:py-20 md:px-12 md:py-32 max-w-7xl mx-auto">
        {/* Left Column */}
        <div className="space-y-6 sm:space-y-8">
          <div className="space-y-4 sm:space-y-6">
            <p className="text-xl sm:text-2xl md:text-3xl text-primary-foreground/90 leading-relaxed font-medium">
              Manage your workforce efficiently. Handle staff records, leave requests, and approvals all in one unified platform designed for the {APP_CONFIG.organizationName}.
            </p>
          </div>

          {/* Features List */}
          <ul className="space-y-4 sm:space-y-5">
            {[
              { title: 'Staff Management', desc: 'Comprehensive employee records and profiles' },
              { title: 'Leave Tracking', desc: 'Request, approve, and manage leave with ease' },
              { title: 'Administrator Privileges Only', desc: 'Admin, HR Officer, and Manager permissions' },
              { title: 'Real-Time Reports', desc: 'Instant insights into staffing and leave data' },
            ].map((feature) => (
              <li key={feature.title} className="flex gap-3 sm:gap-4">
                <div className="h-3 w-3 rounded-full bg-primary-foreground flex-shrink-0 mt-2" />
                <div>
                  <h3 className="font-semibold text-primary-foreground text-base sm:text-lg md:text-xl">{feature.title}</h3>
                  <p className="text-sm sm:text-base text-primary-foreground/80 mt-1">{feature.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <Button onClick={onSignIn} size="lg" variant="secondary" className="w-full sm:w-fit text-base sm:text-lg px-8 py-6">
            Get Started
          </Button>
        </div>

        {/* Right Column - Stats */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {[
            { value: '50+', label: 'Staff Members', icon: '👥' },
            { value: '20+', label: 'Leave Requests', icon: '📋' },
            { value: '100%', label: 'Uptime', icon: '✓' },
            { value: '24/7', label: 'Support', icon: '🔧' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 sm:p-8 text-center border border-white/20 hover:bg-white/15 transition-colors"
            >
              <div className="text-3xl sm:text-4xl md:text-5xl mb-3">{stat.icon}</div>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary-foreground mb-2">{stat.value}</p>
              <p className="text-sm sm:text-base md:text-lg text-primary-foreground/80 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Content Section - Fill Space */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-12 sm:py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 sm:p-8 border border-white/10">
            <h3 className="text-xl sm:text-2xl font-bold text-primary-foreground mb-3">Secure Access</h3>
            <p className="text-base sm:text-lg text-primary-foreground/80">
              Enterprise-grade security with role-based access control and administrator privileges.
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 sm:p-8 border border-white/10">
            <h3 className="text-xl sm:text-2xl font-bold text-primary-foreground mb-3">Efficient Workflow</h3>
            <p className="text-base sm:text-lg text-primary-foreground/80">
              Streamlined approval processes and automated notifications for faster decision-making.
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 sm:p-8 border border-white/10">
            <h3 className="text-xl sm:text-2xl font-bold text-primary-foreground mb-3">Comprehensive Tracking</h3>
            <p className="text-base sm:text-lg text-primary-foreground/80">
              Real-time monitoring of staff records, leave balances, and approval statuses.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-12 sm:mt-16 md:mt-20 py-8 sm:py-10 px-6 md:px-12">
        <div className="text-center text-primary-foreground/70 text-base sm:text-lg">
          <p>© {APP_CONFIG.copyrightYear} {APP_CONFIG.organizationName}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
