/**
 * Legal Reference Component
 * 
 * Ghana Government Compliance: Displays legal references with tooltips
 * Used throughout the system to show legal basis for requirements
 */

'use client'

import { Info, BookOpen } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface LegalReferenceProps {
  act: string
  section?: string
  description?: string
  className?: string
  variant?: 'tooltip' | 'badge' | 'inline'
  size?: 'sm' | 'md' | 'lg'
}

const LEGAL_REFERENCES: Record<string, { name: string; fullName: string; url?: string }> = {
  'Labour Act 651': {
    name: 'Labour Act 651',
    fullName: 'Labour Act, 2003 (Act 651)',
  },
  'Act 843': {
    name: 'Data Protection Act 843',
    fullName: 'Data Protection Act, 2012 (Act 843)',
  },
  'Act 772': {
    name: 'Electronic Transactions Act 772',
    fullName: 'Electronic Transactions Act, 2008 (Act 772)',
  },
  'PSC': {
    name: 'PSC Conditions',
    fullName: 'Public Services Commission (PSC) Conditions of Service',
  },
  'OHCS': {
    name: 'OHCS Guidelines',
    fullName: 'Office of the Head of Civil Service (OHCS) HR Guidelines',
  },
}

export function LegalReference({
  act,
  section,
  description,
  className,
  variant = 'tooltip',
  size = 'sm',
}: LegalReferenceProps) {
  const legalInfo = LEGAL_REFERENCES[act] || { name: act, fullName: act }
  const fullReference = section 
    ? `${legalInfo.fullName}, ${section}`
    : legalInfo.fullName

  if (variant === 'badge') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                'cursor-help border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
                size === 'sm' && 'text-xs',
                size === 'md' && 'text-sm',
                className
              )}
            >
              <BookOpen className="mr-1 h-3 w-3" />
              {legalInfo.name}
              {section && ` ${section}`}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-1">
              <p className="font-semibold">{fullReference}</p>
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (variant === 'inline') {
    return (
      <span className={cn('inline-flex items-center gap-1 text-sm text-muted-foreground', className)}>
        <Info className="h-3 w-3" />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help underline decoration-dotted">
                {fullReference}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              {description && <p className="text-sm">{description}</p>}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </span>
    )
  }

  // Default: tooltip variant
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('inline-flex cursor-help items-center gap-1', className)}>
            <Info className="h-3 w-3 text-blue-600" />
            <span className="text-xs text-blue-600 underline decoration-dotted">
              Legal Reference
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold">{fullReference}</p>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Statutory Minimum Indicator
 * Shows when a field has a statutory minimum that cannot be reduced
 */
interface StatutoryMinimumProps {
  leaveType: string
  currentValue: number
  minimum: number
  className?: string
}

export function StatutoryMinimumIndicator({
  leaveType,
  currentValue,
  minimum,
  className,
}: StatutoryMinimumProps) {
  const isAtMinimum = currentValue === minimum
  const isAboveMinimum = currentValue > minimum

  return (
    <div className={cn('rounded-md border border-blue-200 bg-blue-50 p-2', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">
            Statutory Minimum (Locked)
          </span>
        </div>
        <Badge variant="outline" className="border-blue-300 bg-white text-blue-700">
          {minimum} days
        </Badge>
      </div>
      <p className="mt-1 text-xs text-blue-700">
        As required by{' '}
        <LegalReference
          act="Labour Act 651"
          section="Section 57-60"
          variant="inline"
          size="sm"
        />
        . Current policy: {currentValue} days
        {isAboveMinimum && ' (exceeds minimum)'}
      </p>
    </div>
  )
}

