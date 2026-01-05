/**
 * Workflow Management API
 * 
 * CRUD operations for database-driven workflow definitions
 * Only HR Director and System Admin can manage workflows
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth'
import { 
  createWorkflowDefinition, 
  getAllWorkflowDefinitions,
  getActiveWorkflowDefinitions 
} from '@/lib/workflow-engine'
import { HR_DIRECTOR, SYSTEM_ADMIN } from '@/lib/roles'

// Force dynamic execution (required for Prisma database access)
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs' // Explicitly set to nodejs runtime

const ALLOWED_ROLES = [HR_DIRECTOR, SYSTEM_ADMIN, 'HR_DIRECTOR', 'hr_director', 'SYSTEM_ADMIN', 'admin', 'SYS_ADMIN']

/**
 * GET /api/workflows
 * Get all workflow definitions
 */
export async function GET(request: NextRequest) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Only HR Director and System Admin can view workflows
      if (!ALLOWED_ROLES.includes(user.role)) {
        return NextResponse.json(
          { error: 'Forbidden - Only HR Director and System Admin can view workflows' },
          { status: 403 }
        )
      }

      const { searchParams } = new URL(req.url)
      const mdaId = searchParams.get('mdaId') || undefined
      const activeOnly = searchParams.get('activeOnly') === 'true'

      const workflows = activeOnly
        ? await getActiveWorkflowDefinitions(mdaId)
        : await getAllWorkflowDefinitions(mdaId)

      return NextResponse.json({ workflows })
    } catch (error: any) {
      console.error('Error fetching workflows:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch workflows' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ALLOWED_ROLES })(request)
}

/**
 * POST /api/workflows
 * Create a new workflow definition
 */
export async function POST(request: NextRequest) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Only HR Director and System Admin can create workflows
      if (!ALLOWED_ROLES.includes(user.role)) {
        return NextResponse.json(
          { error: 'Forbidden - Only HR Director and System Admin can create workflows' },
          { status: 403 }
        )
      }

      const body = await req.json()
      const { name, description, mdaId, mdaName, conditions, steps } = body

      if (!name || !steps || !Array.isArray(steps) || steps.length === 0) {
        return NextResponse.json(
          { error: 'Missing required fields: name, steps' },
          { status: 400 }
        )
      }

      // Validate steps
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i]
        if (!step.stepOrder || !step.approverRole) {
          return NextResponse.json(
            { error: `Step ${i + 1} is missing required fields: stepOrder, approverRole` },
            { status: 400 }
          )
        }
      }

      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
      const userAgent = req.headers.get('user-agent') || undefined

      const workflow = await createWorkflowDefinition({
        name,
        description,
        mdaId,
        mdaName,
        conditions,
        steps,
        createdBy: user.id,
        createdByName: user.email,
      })

      return NextResponse.json({ workflow }, { status: 201 })
    } catch (error: any) {
      console.error('Error creating workflow:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create workflow' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ALLOWED_ROLES })(request)
}

