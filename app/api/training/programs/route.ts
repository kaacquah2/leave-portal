/**
 * Training Program Management API
 * 
 * Ghana Government Compliance:
 * - Public Services Commission (PSC) training guidelines
 * - Office of the Head of Civil Service (OHCS) development programs
 * - Government training budget allocation standards
 * 
 * Legal References:
 * - Public Services Commission (PSC) Training Guidelines
 * - Office of the Head of Civil Service (OHCS) Development Programs
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth'
import { logDataAccess } from '@/lib/data-access-logger'
import { hasPermission } from '@/lib/roles'
import { mapToMoFARole } from '@/lib/roles'

// Force static export configuration (required for static export mode)

// API routes are dynamic by default - explicitly mark as dynamic to prevent prerendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
/**
 * GET /api/training/programs
 * Get training programs
 */
export async function GET(request: NextRequest) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      const { searchParams } = new URL(req.url)
      const category = searchParams.get('category')
      const status = searchParams.get('status')

      // Build where clause
      const where: any = {}
      if (category) where.category = category
      if (status) where.status = status

      // Get training programs (using existing TrainingProgram model)
      const programs = await prisma.trainingProgram.findMany({
        where,
        orderBy: { startDate: 'desc' },
        include: {
          attendees: {
            include: {
              staff: {
                select: {
                  staffId: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      })

      return NextResponse.json({ programs })
    } catch (error) {
      console.error('Error fetching training programs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch training programs' },
        { status: 500 }
      )
    }
  })(request)
}

/**
 * POST /api/training/programs
 * Create training program
 */
export async function POST(request: NextRequest) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Only HR can create training programs
      const normalizedRole = mapToMoFARole(user.role)
      if (!hasPermission(normalizedRole, 'employee:update') && 
          normalizedRole !== 'HR_OFFICER' && 
          user.role !== 'hr' && 
          user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden - Only HR can create training programs' },
          { status: 403 }
        )
      }

      const body = await req.json()
      const {
        name,
        description,
        category,
        provider,
        duration,
        cost,
        startDate,
        endDate,
        location,
        maxParticipants,
        status = 'planned',
      } = body

      if (!name || !category) {
        return NextResponse.json(
          { error: 'Missing required fields: name, category' },
          { status: 400 }
        )
      }

      // Get IP and user agent
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
      const userAgent = req.headers.get('user-agent') || undefined

      // Create training program
      const program = await prisma.trainingProgram.create({
        data: {
          title: name,
          description: description || '',
          category: category || null,
          provider: provider || '',
          type: 'internal', // Default type
          duration: duration ? parseInt(duration) : null,
          cost: cost ? parseFloat(cost) : null,
          startDate: startDate ? new Date(startDate) : new Date(),
          endDate: endDate ? new Date(endDate) : new Date(),
          location: location || null,
          maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
          status,
          createdBy: user.email,
        },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'TRAINING_PROGRAM_CREATED',
          user: user.email,
          details: `HR ${user.email} created training program: ${name}`,
          ip,
        },
      })

      return NextResponse.json({
        success: true,
        program,
        message: 'Training program created successfully',
      })
    } catch (error) {
      console.error('Error creating training program:', error)
      return NextResponse.json(
        { error: 'Failed to create training program' },
        { status: 500 }
      )
    }
  })(request)
}

