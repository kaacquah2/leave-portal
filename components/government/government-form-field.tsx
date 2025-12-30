/**
 * Government Form Field Component
 * 
 * Ghana Government Compliance: Form fields with legal references and accessibility
 * Ensures forms are usable with low bandwidth and screen readers
 */

'use client'

import { Label } from '@/components/ui/label'
import { LegalReference } from './legal-reference'
import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface GovernmentFormFieldProps {
  label: string
  required?: boolean
  statutoryMinimum?: {
    leaveType: string
    minimum: number
    currentValue?: number
  }
  legalReference?: {
    act: string
    section?: string
    description?: string
  }
  helpText?: string
  error?: string
  children: React.ReactNode
  className?: string
  id?: string
}

export function GovernmentFormField({
  label,
  required = false,
  statutoryMinimum,
  legalReference,
  helpText,
  error,
  children,
  className,
  id,
}: GovernmentFormFieldProps) {
  const fieldId = id || `field-${label.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <Label htmlFor={fieldId} className="text-sm font-medium">
          {label}
          {required && <span className="ml-1 text-red-600">*</span>}
        </Label>
        
        {legalReference && (
          <LegalReference
            act={legalReference.act}
            section={legalReference.section}
            description={legalReference.description}
            variant="tooltip"
            size="sm"
          />
        )}

        {helpText && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 cursor-help text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{helpText}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {statutoryMinimum && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-2 text-xs">
          <div className="flex items-center gap-2">
            <Info className="h-3 w-3 text-blue-600" />
            <span className="font-medium text-blue-900">
              Statutory Minimum: {statutoryMinimum.minimum} days
            </span>
            <LegalReference
              act="Labour Act 651"
              section="Section 57-60"
              variant="inline"
              size="sm"
            />
          </div>
          {statutoryMinimum.currentValue !== undefined && (
            <p className="mt-1 text-blue-700">
              Current policy: {statutoryMinimum.currentValue} days
              {statutoryMinimum.currentValue > statutoryMinimum.minimum && ' (exceeds minimum)'}
            </p>
          )}
        </div>
      )}

      <div aria-describedby={error ? `${fieldId}-error` : undefined}>
        {children}
      </div>

      {error && (
        <p
          id={`${fieldId}-error`}
          className="text-sm text-red-600"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}

      {helpText && !legalReference && (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}
    </div>
  )
}

