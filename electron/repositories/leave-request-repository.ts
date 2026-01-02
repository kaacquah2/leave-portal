/**
 * Leave Request Repository
 * 
 * Handles all leave request operations
 * Read + Write offline (requests can be created offline)
 */

import { Database } from 'better-sqlite3';
import { BaseRepository, BaseEntity, QueryFilters, SyncStatus } from './base-repository';

export interface LeaveRequest extends BaseEntity {
  staff_id: string;
  staff_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: string;
  approved_by?: string;
  approval_date?: string;
  template_id?: string;
  approval_levels?: string; // JSON string
  officer_taking_over?: string;
  handover_notes?: string;
  declaration_accepted: number; // SQLite boolean
  payroll_impact_flag: number; // SQLite boolean
  locked: number; // SQLite boolean
}

export class LeaveRequestRepository extends BaseRepository<LeaveRequest> {
  constructor(db: Database) {
    super({
      tableName: 'leave_requests',
      primaryKey: 'id',
      db,
    });
  }

  /**
   * Find leave requests by staff ID
   */
  findByStaffId(staffId: string, filters: QueryFilters = {}): LeaveRequest[] {
    return this.findAll({
      staff_id: staffId,
      ...filters,
    });
  }

  /**
   * Find leave requests by status
   */
  findByStatus(status: string, filters: QueryFilters = {}): LeaveRequest[] {
    return this.findAll({
      status,
      ...filters,
    });
  }

  /**
   * Find pending leave requests for a staff member
   */
  findPendingByStaffId(staffId: string): LeaveRequest[] {
    return this.findAll({
      staff_id: staffId,
      status: 'pending',
    });
  }

  /**
   * Find leave requests in date range
   */
  findByDateRange(startDate: string, endDate: string): LeaveRequest[] {
    const stmt = this.db.prepare(`
      SELECT * FROM leave_requests
      WHERE (start_date <= ? AND end_date >= ?)
         OR (start_date >= ? AND start_date <= ?)
         OR (end_date >= ? AND end_date <= ?)
      ORDER BY start_date
    `);
    return stmt.all(startDate, startDate, startDate, endDate, startDate, endDate) as LeaveRequest[];
  }

  /**
   * Create new leave request (offline)
   * Automatically sets sync_status to PENDING
   */
  createRequest(data: Partial<LeaveRequest>): LeaveRequest {
    // Ensure new requests start as pending
    return this.create({
      ...data,
      sync_status: SyncStatus.PENDING,
      status: data.status || 'pending',
    });
  }

  /**
   * Cancel leave request
   */
  cancel(id: string, reason?: string): LeaveRequest | null {
    return this.update(id, {
      status: 'cancelled',
      sync_status: SyncStatus.PENDING, // Cancellation needs to sync
    } as Partial<LeaveRequest>);
  }
}

