/**
 * POST /api/sync
 * 
 * Sync endpoint for offline-first architecture.
 * Accepts batched changes from Electron client and applies them to Neon database.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/auth-proxy';
import { prisma } from '@/lib/prisma';
import { READ_ONLY_ROLES } from '@/lib/role-utils';
import { Prisma } from '@prisma/client';

interface SyncChange {
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  recordId: string;
  payload: any;
}

interface SyncRequest {
  table: string;
  changes: SyncChange[];
}

interface SyncResult {
  recordId: string;
  success: boolean;
  result?: any;
  error?: string;
}

export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const body: SyncRequest = await request.json();
    const { table, changes } = body;

    if (!table || !Array.isArray(changes) || changes.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. Expected table and changes array.' },
        { status: 400 }
      );
    }

    // Process changes in a transaction
    const results: SyncResult[] = [];
    const errors: string[] = [];

    // Use Prisma transaction for atomicity
    await prisma.$transaction(async (tx) => {
      for (const change of changes) {
        try {
          let result;

          switch (table) {
            case 'StaffMember': {
              if (change.operation === 'INSERT') {
                result = await tx.staffMember.create({
                  data: {
                    id: change.recordId.startsWith('temp-') ? undefined : change.recordId,
                    staffId: change.payload.staffId,
                    firstName: change.payload.firstName,
                    lastName: change.payload.lastName,
                    email: change.payload.email,
                    phone: change.payload.phone,
                    department: change.payload.department,
                    position: change.payload.position,
                    grade: change.payload.grade,
                    level: change.payload.level,
                    rank: change.payload.rank,
                    step: change.payload.step,
                    directorate: change.payload.directorate,
                    unit: change.payload.unit,
                    photoUrl: change.payload.photoUrl,
                    active: change.payload.active ?? true,
                    employmentStatus: change.payload.employmentStatus ?? 'active',
                    terminationDate: change.payload.terminationDate
                      ? new Date(change.payload.terminationDate)
                      : null,
                    terminationReason: change.payload.terminationReason,
                    joinDate: new Date(change.payload.joinDate),
                    managerId: change.payload.managerId,
                  },
                });
              } else if (change.operation === 'UPDATE') {
                result = await tx.staffMember.update({
                  where: { id: change.recordId },
                  data: {
                    ...change.payload,
                    joinDate: change.payload.joinDate
                      ? new Date(change.payload.joinDate)
                      : undefined,
                    terminationDate: change.payload.terminationDate
                      ? new Date(change.payload.terminationDate)
                      : undefined,
                  },
                });
              } else if (change.operation === 'DELETE') {
                result = await tx.staffMember.delete({
                  where: { id: change.recordId },
                });
              }
              break;
            }

            case 'LeaveRequest': {
              if (change.operation === 'INSERT') {
                result = await tx.leaveRequest.create({
                  data: {
                    id: change.recordId.startsWith('temp-') ? undefined : change.recordId,
                    staffId: change.payload.staffId,
                    staffName: change.payload.staffName,
                    leaveType: change.payload.leaveType,
                    startDate: new Date(change.payload.startDate),
                    endDate: new Date(change.payload.endDate),
                    days: change.payload.days,
                    reason: change.payload.reason,
                    status: change.payload.status ?? 'pending',
                    approvedBy: change.payload.approvedBy,
                    approvalDate: change.payload.approvalDate
                      ? new Date(change.payload.approvalDate)
                      : null,
                    templateId: change.payload.templateId,
                    approvalLevels: change.payload.approvalLevels
                      ? (JSON.parse(JSON.stringify(change.payload.approvalLevels)) as Prisma.InputJsonValue)
                      : Prisma.JsonNull,
                  },
                });
              } else if (change.operation === 'UPDATE') {
                result = await tx.leaveRequest.update({
                  where: { id: change.recordId },
                  data: {
                    ...change.payload,
                    startDate: change.payload.startDate
                      ? new Date(change.payload.startDate)
                      : undefined,
                    endDate: change.payload.endDate
                      ? new Date(change.payload.endDate)
                      : undefined,
                    approvalDate: change.payload.approvalDate
                      ? new Date(change.payload.approvalDate)
                      : undefined,
                    approvalLevels: change.payload.approvalLevels
                      ? (JSON.parse(JSON.stringify(change.payload.approvalLevels)) as Prisma.InputJsonValue)
                      : undefined,
                  },
                });
              } else if (change.operation === 'DELETE') {
                result = await tx.leaveRequest.delete({
                  where: { id: change.recordId },
                });
              }
              break;
            }

            case 'LeaveBalance': {
              if (change.operation === 'INSERT' || change.operation === 'UPDATE') {
                result = await tx.leaveBalance.upsert({
                  where: { staffId: change.payload.staffId },
                  create: {
                    id: change.recordId.startsWith('temp-') ? undefined : change.recordId,
                    staffId: change.payload.staffId,
                    annual: change.payload.annual ?? 0,
                    sick: change.payload.sick ?? 0,
                    unpaid: change.payload.unpaid ?? 0,
                    specialService: change.payload.specialService ?? 0,
                    training: change.payload.training ?? 0,
                    study: change.payload.study ?? 0,
                    maternity: change.payload.maternity ?? 0,
                    paternity: change.payload.paternity ?? 0,
                    compassionate: change.payload.compassionate ?? 0,
                  },
                  update: {
                    annual: change.payload.annual ?? 0,
                    sick: change.payload.sick ?? 0,
                    unpaid: change.payload.unpaid ?? 0,
                    specialService: change.payload.specialService ?? 0,
                    training: change.payload.training ?? 0,
                    study: change.payload.study ?? 0,
                    maternity: change.payload.maternity ?? 0,
                    paternity: change.payload.paternity ?? 0,
                    compassionate: change.payload.compassionate ?? 0,
                  },
                });
              } else if (change.operation === 'DELETE') {
                result = await tx.leaveBalance.delete({
                  where: { id: change.recordId },
                });
              }
              break;
            }

            case 'LeavePolicy': {
              if (change.operation === 'INSERT') {
                result = await tx.leavePolicy.create({
                  data: {
                    id: change.recordId.startsWith('temp-') ? undefined : change.recordId,
                    leaveType: change.payload.leaveType,
                    maxDays: change.payload.maxDays,
                    accrualRate: change.payload.accrualRate,
                    carryoverAllowed: change.payload.carryoverAllowed ?? false,
                    maxCarryover: change.payload.maxCarryover ?? 0,
                    requiresApproval: change.payload.requiresApproval ?? true,
                    approvalLevels: change.payload.approvalLevels ?? 1,
                    active: change.payload.active ?? true,
                  },
                });
              } else if (change.operation === 'UPDATE') {
                result = await tx.leavePolicy.update({
                  where: { id: change.recordId },
                  data: change.payload,
                });
              } else if (change.operation === 'DELETE') {
                result = await tx.leavePolicy.delete({
                  where: { id: change.recordId },
                });
              }
              break;
            }

            case 'Holiday': {
              if (change.operation === 'INSERT') {
                result = await tx.holiday.create({
                  data: {
                    id: change.recordId.startsWith('temp-') ? undefined : change.recordId,
                    name: change.payload.name,
                    date: new Date(change.payload.date),
                    type: change.payload.type,
                    recurring: change.payload.recurring ?? false,
                    year: change.payload.year,
                  },
                });
              } else if (change.operation === 'UPDATE') {
                result = await tx.holiday.update({
                  where: { id: change.recordId },
                  data: {
                    ...change.payload,
                    date: change.payload.date ? new Date(change.payload.date) : undefined,
                  },
                });
              } else if (change.operation === 'DELETE') {
                result = await tx.holiday.delete({
                  where: { id: change.recordId },
                });
              }
              break;
            }

            case 'LeaveRequestTemplate': {
              if (change.operation === 'INSERT') {
                result = await tx.leaveRequestTemplate.create({
                  data: {
                    id: change.recordId.startsWith('temp-') ? undefined : change.recordId,
                    name: change.payload.name,
                    leaveType: change.payload.leaveType,
                    defaultDays: change.payload.defaultDays,
                    defaultReason: change.payload.defaultReason,
                    department: change.payload.department,
                    active: change.payload.active ?? true,
                  },
                });
              } else if (change.operation === 'UPDATE') {
                result = await tx.leaveRequestTemplate.update({
                  where: { id: change.recordId },
                  data: change.payload,
                });
              } else if (change.operation === 'DELETE') {
                result = await tx.leaveRequestTemplate.delete({
                  where: { id: change.recordId },
                });
              }
              break;
            }

            default:
              throw new Error(`Unknown table: ${table}`);
          }

          results.push({ recordId: change.recordId, success: true, result });
        } catch (error: any) {
          errors.push(`${change.recordId}: ${error.message}`);
          results.push({ recordId: change.recordId, success: false, error: error.message });
        }
      }
    });

    return NextResponse.json({
      success: errors.length === 0,
      synced: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('[Sync API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync changes' },
      { status: 500 }
    );
  }
}, { allowedRoles: READ_ONLY_ROLES });

