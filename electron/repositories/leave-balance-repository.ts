/**
 * Leave Balance Repository
 * 
 * Handles leave balance operations
 * Server-authoritative (balances synced from server)
 */

import { Database } from 'better-sqlite3';
import { BaseRepository, BaseEntity } from './base-repository';

export interface LeaveBalance extends BaseEntity {
  staff_id: string;
  annual: number;
  sick: number;
  unpaid: number;
  special_service: number;
  training: number;
  study: number;
  maternity: number;
  paternity: number;
  compassionate: number;
  last_accrual_date?: string;
  accrual_period?: string;
  annual_carry_forward: number;
  sick_carry_forward: number;
  special_service_carry_forward: number;
  training_carry_forward: number;
  study_carry_forward: number;
  annual_expires_at?: string;
  sick_expires_at?: string;
  special_service_expires_at?: string;
  training_expires_at?: string;
  study_expires_at?: string;
}

export class LeaveBalanceRepository extends BaseRepository<LeaveBalance> {
  constructor(db: Database) {
    super({
      tableName: 'leave_balances',
      primaryKey: 'staff_id',
      db,
    });
  }

  /**
   * Find balance by staff ID
   */
  findByStaffId(staffId: string): LeaveBalance | null {
    return this.findOne({ staff_id: staffId });
  }

  /**
   * Get balance for a specific leave type
   */
  getBalanceForType(staffId: string, leaveType: string): number {
    const balance = this.findByStaffId(staffId);
    if (!balance) {
      return 0;
    }

    const typeMap: { [key: string]: keyof LeaveBalance } = {
      'Annual': 'annual',
      'Sick': 'sick',
      'Unpaid': 'unpaid',
      'SpecialService': 'special_service',
      'Training': 'training',
      'Study': 'study',
      'Maternity': 'maternity',
      'Paternity': 'paternity',
      'Compassionate': 'compassionate',
    };

    const field = typeMap[leaveType];
    return field ? (balance[field] as number) : 0;
  }
}

