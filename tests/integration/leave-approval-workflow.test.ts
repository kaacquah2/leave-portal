/**
 * Integration Tests for Leave Approval Workflow
 * Tests complete leave lifecycle: create → approve → balance deduction → cancel → balance restoration
 * 
 * Run with: npm test -- leave-approval-workflow
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('Leave Approval Workflow Integration Tests', () => {
  let testStaffId: string
  let testLeaveId: string
  let initialBalance: number

  beforeEach(async () => {
    // Create test staff member
    const staff = await prisma.staffMember.create({
      data: {
        staffId: `TEST_${Date.now()}`,
        firstName: 'Test',
        lastName: 'Employee',
        email: `test${Date.now()}@example.com`,
        phone: '1234567890',
        department: 'IT',
        position: 'Developer',
        grade: 'G6',
        level: 'L1',
        joinDate: new Date(),
        active: true,
        employmentStatus: 'active',
      },
    })
    testStaffId = staff.staffId

    // Create leave balance
    const balance = await prisma.leaveBalance.create({
      data: {
        staffId: testStaffId,
        annual: 20,
      },
    })
    initialBalance = balance.annual
  })

  afterEach(async () => {
    // Cleanup
    if (testLeaveId) {
      await prisma.leaveRequest.deleteMany({ where: { id: testLeaveId } })
    }
    await prisma.leaveBalance.deleteMany({ where: { staffId: testStaffId } })
    await prisma.staffMember.deleteMany({ where: { staffId: testStaffId } })
    await prisma.auditLog.deleteMany({ where: { staffId: testStaffId } })
  })

  it('should create leave request, approve it, and deduct balance', async () => {
    // 1. Create leave request
    const leave = await prisma.leaveRequest.create({
      data: {
        staffId: testStaffId,
        staffName: 'Test Employee',
        leaveType: 'Annual',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-05'),
        days: 5,
        reason: 'Test leave',
        status: 'pending',
      },
    })
    testLeaveId = leave.id

    // 2. Approve leave (simulate API call)
    // In real scenario, this would call the API endpoint
    // For test, we'll directly test the balance deduction logic
    const { deductLeaveBalance } = require('../../lib/leave-balance-utils')
    const deductionResult = await deductLeaveBalance(testStaffId, 'Annual', 5)

    expect(deductionResult.success).toBe(true)

    // 3. Verify balance was deducted
    const updatedBalance = await prisma.leaveBalance.findUnique({
      where: { staffId: testStaffId },
    })

    expect(updatedBalance?.annual).toBe(initialBalance - 5)

    // 4. Verify audit log was created
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        staffId: testStaffId,
        action: 'LEAVE_BALANCE_DEDUCTED',
      },
    })

    expect(auditLog).toBeTruthy()
  })

  it('should restore balance when approved leave is cancelled', async () => {
    // 1. Create and approve leave
    const leave = await prisma.leaveRequest.create({
      data: {
        staffId: testStaffId,
        staffName: 'Test Employee',
        leaveType: 'Annual',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-05'),
        days: 5,
        reason: 'Test leave',
        status: 'approved',
      },
    })
    testLeaveId = leave.id

    // 2. Deduct balance (simulate approval)
    const { deductLeaveBalance } = require('../../lib/leave-balance-utils')
    await deductLeaveBalance(testStaffId, 'Annual', 5)

    // 3. Cancel leave and restore balance
    const { restoreLeaveBalance } = require('../../lib/leave-balance-utils')
    const restorationResult = await restoreLeaveBalance(testStaffId, 'Annual', 5)

    expect(restorationResult.success).toBe(true)

    // 4. Verify balance was restored
    const updatedBalance = await prisma.leaveBalance.findUnique({
      where: { staffId: testStaffId },
    })

    expect(updatedBalance?.annual).toBe(initialBalance) // Back to original
  })

  it('should prevent overlapping leave requests', async () => {
    // 1. Create first leave request
    const leave1 = await prisma.leaveRequest.create({
      data: {
        staffId: testStaffId,
        staffName: 'Test Employee',
        leaveType: 'Annual',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-05'),
        days: 5,
        reason: 'Test leave 1',
        status: 'pending',
      },
    })

    // 2. Try to create overlapping leave
    const { checkOverlappingLeaves } = require('../../lib/leave-balance-utils')
    const overlapCheck = await checkOverlappingLeaves(
      testStaffId,
      new Date('2024-02-03'), // Overlaps with first leave
      new Date('2024-02-08')
    )

    expect(overlapCheck.hasOverlap).toBe(true)
    expect(overlapCheck.overlappingLeaves).toHaveLength(1)

    // Cleanup
    await prisma.leaveRequest.delete({ where: { id: leave1.id } })
  })
})

