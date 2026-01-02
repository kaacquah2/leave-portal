import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { handleCorsPreflight } from '@/lib/cors'

// Handle OPTIONS preflight requests
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request) || new NextResponse(null, { status: 204 })
}

export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        staff: {
          select: {
            staffId: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true,
            position: true,
            photoUrl: true,
          },
        },
      },
    })

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      staffId: dbUser.staffId,
      staff: dbUser.staff,
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    )
  }
})

