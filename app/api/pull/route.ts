/**
 * GET /api/pull
 * 
 * Pull endpoint for offline-first architecture.
 * Returns all records updated since last_sync_time.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/auth-proxy';
import { prisma } from '@/lib/prisma';
import { READ_ONLY_ROLES } from '@/lib/role-utils';

export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const since = searchParams.get('since');

    // Parse since timestamp (ISO string)
    const sinceDate = since ? new Date(since) : new Date(0); // Default to epoch if not provided

    // Fetch all updated records from each table
    const changes: any[] = [];

    // StaffMember changes
    const staffChanges = await prisma.staffMember.findMany({
      where: {
        updatedAt: {
          gt: sinceDate,
        },
      },
      orderBy: {
        updatedAt: 'asc',
      },
    });
    changes.push(
      ...staffChanges.map((s) => ({
        table: 'StaffMember',
        operation: 'UPDATE' as const,
        recordId: s.id,
        payload: {
          id: s.id,
          staffId: s.staffId,
          firstName: s.firstName,
          lastName: s.lastName,
          email: s.email,
          phone: s.phone,
          department: s.department,
          position: s.position,
          grade: s.grade,
          level: s.level,
          rank: s.rank,
          step: s.step,
          directorate: s.directorate,
          unit: s.unit,
          photoUrl: s.photoUrl,
          active: s.active,
          employmentStatus: s.employmentStatus,
          terminationDate: s.terminationDate?.toISOString(),
          terminationReason: s.terminationReason,
          joinDate: s.joinDate.toISOString(),
          managerId: s.managerId,
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
        },
        updatedAt: s.updatedAt.toISOString(),
      }))
    );

    // LeaveRequest changes
    const leaveChanges = await prisma.leaveRequest.findMany({
      where: {
        updatedAt: {
          gt: sinceDate,
        },
      },
      orderBy: {
        updatedAt: 'asc',
      },
    });
    changes.push(
      ...leaveChanges.map((l) => ({
        table: 'LeaveRequest',
        operation: 'UPDATE' as const,
        recordId: l.id,
        payload: {
          id: l.id,
          staffId: l.staffId,
          staffName: l.staffName,
          leaveType: l.leaveType,
          startDate: l.startDate.toISOString(),
          endDate: l.endDate.toISOString(),
          days: l.days,
          reason: l.reason,
          status: l.status,
          approvedBy: l.approvedBy,
          approvalDate: l.approvalDate?.toISOString(),
          templateId: l.templateId,
          approvalLevels: l.approvalLevels
            ? JSON.parse(l.approvalLevels as string)
            : null,
          createdAt: l.createdAt.toISOString(),
          updatedAt: l.updatedAt.toISOString(),
        },
        updatedAt: l.updatedAt.toISOString(),
      }))
    );

    // LeaveBalance changes
    const balanceChanges = await prisma.leaveBalance.findMany({
      where: {
        updatedAt: {
          gt: sinceDate,
        },
      },
      orderBy: {
        updatedAt: 'asc',
      },
    });
    changes.push(
      ...balanceChanges.map((b) => ({
        table: 'LeaveBalance',
        operation: 'UPDATE' as const,
        recordId: b.id,
        payload: {
          id: b.id,
          staffId: b.staffId,
          annual: b.annual,
          sick: b.sick,
          unpaid: b.unpaid,
          specialService: b.specialService,
          training: b.training,
          study: b.study,
          maternity: b.maternity,
          paternity: b.paternity,
          compassionate: b.compassionate,
          createdAt: b.createdAt.toISOString(),
          updatedAt: b.updatedAt.toISOString(),
        },
        updatedAt: b.updatedAt.toISOString(),
      }))
    );

    // LeavePolicy changes
    const policyChanges = await prisma.leavePolicy.findMany({
      where: {
        updatedAt: {
          gt: sinceDate,
        },
      },
      orderBy: {
        updatedAt: 'asc',
      },
    });
    changes.push(
      ...policyChanges.map((p) => ({
        table: 'LeavePolicy',
        operation: 'UPDATE' as const,
        recordId: p.id,
        payload: {
          id: p.id,
          leaveType: p.leaveType,
          maxDays: p.maxDays,
          accrualRate: p.accrualRate,
          carryoverAllowed: p.carryoverAllowed,
          maxCarryover: p.maxCarryover,
          requiresApproval: p.requiresApproval,
          approvalLevels: p.approvalLevels,
          active: p.active,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        },
        updatedAt: p.updatedAt.toISOString(),
      }))
    );

    // Holiday changes
    const holidayChanges = await prisma.holiday.findMany({
      where: {
        updatedAt: {
          gt: sinceDate,
        },
      },
      orderBy: {
        updatedAt: 'asc',
      },
    });
    changes.push(
      ...holidayChanges.map((h) => ({
        table: 'Holiday',
        operation: 'UPDATE' as const,
        recordId: h.id,
        payload: {
          id: h.id,
          name: h.name,
          date: h.date.toISOString(),
          type: h.type,
          recurring: h.recurring,
          year: h.year,
          createdAt: h.createdAt.toISOString(),
          updatedAt: h.updatedAt.toISOString(),
        },
        updatedAt: h.updatedAt.toISOString(),
      }))
    );

    // LeaveRequestTemplate changes
    const templateChanges = await prisma.leaveRequestTemplate.findMany({
      where: {
        updatedAt: {
          gt: sinceDate,
        },
      },
      orderBy: {
        updatedAt: 'asc',
      },
    });
    changes.push(
      ...templateChanges.map((t) => ({
        table: 'LeaveRequestTemplate',
        operation: 'UPDATE' as const,
        recordId: t.id,
        payload: {
          id: t.id,
          name: t.name,
          leaveType: t.leaveType,
          defaultDays: t.defaultDays,
          defaultReason: t.defaultReason,
          department: t.department,
          active: t.active,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
        },
        updatedAt: t.updatedAt.toISOString(),
      }))
    );

    // Sort all changes by updatedAt
    changes.sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return dateA - dateB;
    });

    return NextResponse.json({
      success: true,
      changes,
      count: changes.length,
      lastSyncTime: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Pull API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to pull changes' },
      { status: 500 }
    );
  }
}, { allowedRoles: READ_ONLY_ROLES });

