/**
 * Tax Calculation API (GRA Compliant)
 * 
 * Ghana Government Compliance:
 * - Ghana Revenue Authority (GRA) tax calculation standards
 * - Controller and Accountant General's Department (CAGD) requirements
 * - Tax brackets and rates per GRA guidelines
 * 
 * Legal References:
 * - Ghana Revenue Authority (GRA) Tax Calculation Standards
 * - Income Tax Act, 2015 (Act 896)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { logDataAccess } from '@/lib/data-access-logger'

// Force static export configuration (required for static export mode)

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'
/**
 * Ghana Revenue Authority (GRA) Tax Brackets (2024)
 * Per Income Tax Act, 2015 (Act 896)
 */
const GRA_TAX_BRACKETS = [
  { min: 0, max: 365, rate: 0 }, // First GHS 365 - 0%
  { min: 365, max: 475, rate: 5 }, // Next GHS 110 - 5%
  { min: 475, max: 685, rate: 10 }, // Next GHS 210 - 10%
  { min: 685, max: 895, rate: 17.5 }, // Next GHS 210 - 17.5%
  { min: 895, max: Infinity, rate: 25 }, // Above GHS 895 - 25%
]

/**
 * POST /api/payroll/tax-calculate
 * Calculate tax based on GRA standards
 */
export async function POST(request: NextRequest) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      const body = await req.json()
      const { grossSalary, taxRelief = 0 } = body

      if (!grossSalary || grossSalary < 0) {
        return NextResponse.json(
          { error: 'Invalid gross salary amount' },
          { status: 400 }
        )
      }

      // Get IP and user agent
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
      const userAgent = req.headers.get('user-agent') || undefined

      // Calculate taxable income (annual)
      const annualGross = grossSalary * 12
      const annualTaxable = Math.max(0, annualGross - (taxRelief * 12))

      // Calculate tax using GRA brackets
      let annualTax = 0
      let remainingIncome = annualTaxable

      for (const bracket of GRA_TAX_BRACKETS) {
        if (remainingIncome <= 0) break

        const bracketRange = bracket.max === Infinity 
          ? remainingIncome 
          : Math.min(remainingIncome, bracket.max - bracket.min)
        
        const bracketTax = (bracketRange * bracket.rate) / 100
        annualTax += bracketTax
        remainingIncome -= bracketRange
      }

      // Monthly tax
      const monthlyTax = annualTax / 12

      // Log data access (Data Protection Act 843 compliance)
      await logDataAccess({
        userId: user.id,
        userRole: user.role,
        dataType: 'salary',
        action: 'view',
        ip,
        userAgent,
        metadata: {
          type: 'tax_calculation',
          grossSalary,
          annualTax,
          monthlyTax,
        },
      })

      return NextResponse.json({
        success: true,
        calculation: {
          grossSalary,
          annualGross: annualGross,
          taxRelief: taxRelief * 12, // Annual relief
          annualTaxable,
          annualTax,
          monthlyTax: Math.round(monthlyTax * 100) / 100, // Round to 2 decimal places
          netSalary: grossSalary - Math.round(monthlyTax * 100) / 100,
          taxRate: annualTaxable > 0 ? (annualTax / annualTaxable) * 100 : 0,
        },
        brackets: GRA_TAX_BRACKETS,
        legalReference: 'Income Tax Act, 2015 (Act 896) - GRA Tax Calculation Standards',
      })
    } catch (error) {
      console.error('Error calculating tax:', error)
      return NextResponse.json(
        { error: 'Failed to calculate tax' },
        { status: 500 }
      )
    }
  })(request)
}

