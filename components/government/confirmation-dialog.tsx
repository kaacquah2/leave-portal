/**
 * Government Confirmation Dialog
 * 
 * Ghana Government Compliance: Confirmation dialogs for irreversible actions
 * Uses clear government language and includes legal context where applicable
 */

'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AlertTriangle, Shield, FileText } from 'lucide-react'
import { LegalReference } from './legal-reference'
import { cn } from '@/lib/utils'

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive' | 'warning' | 'legal'
  legalReference?: {
    act: string
    section?: string
    description?: string
  }
  requiresJustification?: boolean
  justificationLabel?: string
  onJustificationChange?: (value: string) => void
  justificationValue?: string
  justificationMinLength?: number
  isLoading?: boolean
}

export function GovernmentConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  legalReference,
  requiresJustification = false,
  justificationLabel = 'Justification (required)',
  onJustificationChange,
  justificationValue = '',
  justificationMinLength = 20,
  isLoading = false,
}: ConfirmationDialogProps) {
  const isJustificationValid = 
    !requiresJustification || 
    (justificationValue.trim().length >= justificationMinLength)

  const handleConfirm = () => {
    if (requiresJustification && !isJustificationValid) {
      return
    }
    onConfirm()
  }

  const variantStyles = {
    default: {
      icon: Shield,
      iconColor: 'text-blue-600',
      buttonVariant: 'default' as const,
    },
    destructive: {
      icon: AlertTriangle,
      iconColor: 'text-red-600',
      buttonVariant: 'destructive' as const,
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-amber-600',
      buttonVariant: 'default' as const,
    },
    legal: {
      icon: FileText,
      iconColor: 'text-blue-600',
      buttonVariant: 'default' as const,
    },
  }

  const style = variantStyles[variant]
  const Icon = style.icon

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <Icon className={cn('h-5 w-5', style.iconColor)} />
            <AlertDialogTitle className="text-lg font-semibold">
              {title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 pt-2">
            <p className="text-sm leading-relaxed">{description}</p>
            
            {legalReference && (
              <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                <p className="mb-2 text-xs font-medium text-blue-900">
                  Legal Basis:
                </p>
                <LegalReference
                  act={legalReference.act}
                  section={legalReference.section}
                  description={legalReference.description}
                  variant="inline"
                />
              </div>
            )}

            {requiresJustification && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {justificationLabel}
                  <span className="ml-1 text-red-600">*</span>
                </label>
                <textarea
                  value={justificationValue}
                  onChange={(e) => onJustificationChange?.(e.target.value)}
                  placeholder={`Please provide a detailed justification (minimum ${justificationMinLength} characters)...`}
                  className="min-h-[100px] w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {justificationValue.length} / {justificationMinLength} characters
                  {!isJustificationValid && (
                    <span className="ml-2 text-red-600">
                      (Minimum {justificationMinLength} characters required)
                    </span>
                  )}
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading || (requiresJustification && !isJustificationValid)}
            className={variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {isLoading ? 'Processing...' : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

