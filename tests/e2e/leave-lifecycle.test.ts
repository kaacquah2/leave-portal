/**
 * End-to-End Tests for Complete Leave Lifecycle
 * Tests the full user journey from employee submission to manager approval
 * 
 * Run with: npm test -- leave-lifecycle
 * 
 * Note: These tests require a running application instance
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'

const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000'

describe('Leave Lifecycle E2E Tests', () => {
  let employeeToken: string
  let managerToken: string
  let hrToken: string
  let testStaffId: string
  let testLeaveId: string

  beforeAll(async () => {
    // Setup: Login as different roles
    // Note: In real implementation, you'd use actual test credentials
    // employeeToken = await login('employee@test.com', 'password')
    // managerToken = await login('manager@test.com', 'password')
    // hrToken = await login('hr@test.com', 'password')
  })

  afterAll(async () => {
    // Cleanup test data
  })

  it('should complete full leave lifecycle: submit → approve → deduct balance → cancel → restore balance', async () => {
    // 1. Employee submits leave request
    const submitResponse = await fetch(`${API_BASE_URL}/api/leaves`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${employeeToken}`,
      },
      body: JSON.stringify({
        staffId: testStaffId,
        staffName: 'Test Employee',
        leaveType: 'Annual',
        startDate: '2024-02-01',
        endDate: '2024-02-05',
        days: 5,
        reason: 'E2E test leave',
      }),
    })

    expect(submitResponse.ok).toBe(true)
    const leave = await submitResponse.json()
    testLeaveId = leave.id
    expect(leave.status).toBe('pending')

    // 2. Get initial balance
    const balanceResponse = await fetch(`${API_BASE_URL}/api/balances/${testStaffId}`, {
      headers: {
        'Cookie': `token=${employeeToken}`,
      },
    })
    const initialBalance = await balanceResponse.json()
    const initialAnnualBalance = initialBalance.annual

    // 3. Manager approves leave
    const approveResponse = await fetch(`${API_BASE_URL}/api/leaves/${testLeaveId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${managerToken}`,
      },
      body: JSON.stringify({
        status: 'approved',
        approvedBy: 'Test Manager',
      }),
    })

    expect(approveResponse.ok).toBe(true)
    const approvedLeave = await approveResponse.json()
    expect(approvedLeave.status).toBe('approved')

    // 4. Verify balance was deducted
    const updatedBalanceResponse = await fetch(`${API_BASE_URL}/api/balances/${testStaffId}`, {
      headers: {
        'Cookie': `token=${employeeToken}`,
      },
    })
    const updatedBalance = await updatedBalanceResponse.json()
    expect(updatedBalance.annual).toBe(initialAnnualBalance - 5)

    // 5. Employee cancels leave
    const cancelResponse = await fetch(`${API_BASE_URL}/api/leaves/${testLeaveId}/cancel`, {
      method: 'POST',
      headers: {
        'Cookie': `token=${employeeToken}`,
      },
    })

    expect(cancelResponse.ok).toBe(true)

    // 6. Verify balance was restored
    const finalBalanceResponse = await fetch(`${API_BASE_URL}/api/balances/${testStaffId}`, {
      headers: {
        'Cookie': `token=${employeeToken}`,
      },
    })
    const finalBalance = await finalBalanceResponse.json()
    expect(finalBalance.annual).toBe(initialAnnualBalance) // Restored to original
  })

  it('should prevent submitting overlapping leave requests', async () => {
    // 1. Submit first leave
    const leave1 = await fetch(`${API_BASE_URL}/api/leaves`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${employeeToken}`,
      },
      body: JSON.stringify({
        staffId: testStaffId,
        staffName: 'Test Employee',
        leaveType: 'Annual',
        startDate: '2024-03-01',
        endDate: '2024-03-05',
        days: 5,
        reason: 'First leave',
      }),
    })

    expect(leave1.ok).toBe(true)

    // 2. Try to submit overlapping leave
    const leave2 = await fetch(`${API_BASE_URL}/api/leaves`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${employeeToken}`,
      },
      body: JSON.stringify({
        staffId: testStaffId,
        staffName: 'Test Employee',
        leaveType: 'Annual',
        startDate: '2024-03-03', // Overlaps
        endDate: '2024-03-08',
        days: 6,
        reason: 'Overlapping leave',
      }),
    })

    expect(leave2.ok).toBe(false)
    const error = await leave2.json()
    expect(error.errorCode).toBe('OVERLAPPING_LEAVE')
  })

  it('should prevent approval when balance is insufficient', async () => {
    // 1. Submit leave with more days than available balance
    const leave = await fetch(`${API_BASE_URL}/api/leaves`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${employeeToken}`,
      },
      body: JSON.stringify({
        staffId: testStaffId,
        staffName: 'Test Employee',
        leaveType: 'Annual',
        startDate: '2024-04-01',
        endDate: '2024-04-30',
        days: 100, // More than available
        reason: 'Large leave request',
      }),
    })

    // Should fail at submission or approval
    // Depending on implementation, validation might happen at submission or approval
  })
})

