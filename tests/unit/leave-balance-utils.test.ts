/**
 * Unit Tests for Leave Balance Utilities
 * Run with: npm test -- leave-balance-utils
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { getBalanceFieldName, validateLeaveBalance, checkOverlappingLeaves } from '../../lib/leave-balance-utils'

// Mock Prisma
jest.mock('../../lib/prisma', () => ({
  prisma: {
    leaveBalance: {
      findUnique: jest.fn(),
    },
    leaveRequest: {
      findMany: jest.fn(),
    },
  },
}))

describe('Leave Balance Utilities', () => {
  describe('getBalanceFieldName', () => {
    it('should return correct field name for Annual leave', () => {
      expect(getBalanceFieldName('Annual')).toBe('annual')
    })

    it('should return correct field name for Sick leave', () => {
      expect(getBalanceFieldName('Sick')).toBe('sick')
    })

    it('should return null for invalid leave type', () => {
      expect(getBalanceFieldName('Invalid')).toBeNull()
    })
  })

  describe('validateLeaveBalance', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should return valid for Unpaid leave (no balance required)', async () => {
      const result = await validateLeaveBalance('STAFF001', 'Unpaid', 10)
      expect(result.valid).toBe(true)
      expect(result.currentBalance).toBe(0)
    })

    it('should return invalid if insufficient balance', async () => {
      const { prisma } = require('../../lib/prisma')
      prisma.leaveBalance.findUnique.mockResolvedValue({
        staffId: 'STAFF001',
        annual: 5,
      })

      const result = await validateLeaveBalance('STAFF001', 'Annual', 10)
      expect(result.valid).toBe(false)
      expect(result.currentBalance).toBe(5)
      expect(result.error).toContain('Insufficient')
    })

    it('should return valid if sufficient balance', async () => {
      const { prisma } = require('../../lib/prisma')
      prisma.leaveBalance.findUnique.mockResolvedValue({
        staffId: 'STAFF001',
        annual: 15,
      })

      const result = await validateLeaveBalance('STAFF001', 'Annual', 10)
      expect(result.valid).toBe(true)
      expect(result.currentBalance).toBe(15)
    })
  })

  describe('checkOverlappingLeaves', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should detect overlapping leaves', async () => {
      const { prisma } = require('../../lib/prisma')
      prisma.leaveRequest.findMany.mockResolvedValue([
        {
          id: 'LEAVE001',
          staffId: 'STAFF001',
          leaveType: 'Annual',
          startDate: new Date('2024-01-10'),
          endDate: new Date('2024-01-15'),
          status: 'pending',
        },
      ])

      const result = await checkOverlappingLeaves(
        'STAFF001',
        new Date('2024-01-12'),
        new Date('2024-01-18')
      )

      expect(result.hasOverlap).toBe(true)
      expect(result.overlappingLeaves).toHaveLength(1)
    })

    it('should not detect overlap for non-overlapping dates', async () => {
      const { prisma } = require('../../lib/prisma')
      prisma.leaveRequest.findMany.mockResolvedValue([])

      const result = await checkOverlappingLeaves(
        'STAFF001',
        new Date('2024-01-20'),
        new Date('2024-01-25')
      )

      expect(result.hasOverlap).toBe(false)
      expect(result.overlappingLeaves).toHaveLength(0)
    })
  })
})

