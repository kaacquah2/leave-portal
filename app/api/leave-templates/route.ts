import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isHR, isAdmin, isChiefDirector } from '@/lib/auth'
import { READ_ONLY_ROLES, HR_ROLES, ADMIN_ROLES } from '@/lib/roles'


// GET all leave templates

// Force static export configuration (required for static export mode)

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const templates = await prisma.leaveRequestTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching leave templates:', error)
    return NextResponse.json({ error: 'Failed to fetch leave templates' }, { status: 500 })
  }
}, { allowedRoles: ['HR_OFFICER', 'HR_DIRECTOR', 'CHIEF_DIRECTOR', 'SYS_ADMIN', 'SUPERVISOR', 'UNIT_HEAD', 'DIVISION_HEAD', 'DIRECTOR', 'REGIONAL_MANAGER', 'EMPLOYEE', 'AUDITOR', 'hr', 'hr_assistant', 'admin', 'employee', 'manager', 'deputy_director', 'hr_officer', 'hr_director', 'chief_director', 'supervisor', 'unit_head', 'division_head', 'directorate_head', 'regional_manager', 'auditor', 'internal_auditor'] })

// POST create leave template
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only HR and admin can create leave templates
    if (!isHR(user) && !isAdmin(user) && !isChiefDirector(user)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const template = await prisma.leaveRequestTemplate.create({
      data: {
        name: body.name,
        leaveType: body.leaveType,
        defaultDays: body.defaultDays,
        defaultReason: body.defaultReason,
        department: body.department,
        active: body.active ?? true,
      },
    })
    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Error creating leave template:', error)
    return NextResponse.json({ error: 'Failed to create leave template' }, { status: 500 })
  }
}, { allowedRoles: [...HR_ROLES, ...ADMIN_ROLES, 'CHIEF_DIRECTOR', 'chief_director'] })

