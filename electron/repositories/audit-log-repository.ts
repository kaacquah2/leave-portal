/**
 * Audit Log Repository
 * 
 * Handles audit log operations
 * Write-only offline (logs must sync to server)
 */

import { Database } from 'better-sqlite3';
import { BaseRepository, BaseEntity, SyncStatus } from './base-repository';

export interface AuditLog extends BaseEntity {
  action: string;
  user: string;
  user_role?: string;
  staff_id?: string;
  leave_request_id?: string;
  details: string;
  ip_address?: string;
  user_agent?: string;
}

export class AuditLogRepository extends BaseRepository<AuditLog> {
  constructor(db: Database) {
    super({
      tableName: 'audit_logs',
      primaryKey: 'id',
      db,
    });
  }

  /**
   * Create audit log entry
   * Always starts as PENDING (must sync)
   */
  log(action: string, user: string, details: string, options: {
    userRole?: string;
    staffId?: string;
    leaveRequestId?: string;
    ipAddress?: string;
    userAgent?: string;
  } = {}): AuditLog {
    return this.create({
      action,
      user,
      user_role: options.userRole,
      staff_id: options.staffId,
      leave_request_id: options.leaveRequestId,
      details,
      ip_address: options.ipAddress,
      user_agent: options.userAgent,
      sync_status: SyncStatus.PENDING, // Audit logs must sync
    } as Partial<AuditLog>);
  }

  /**
   * Find logs by user
   */
  findByUser(user: string): AuditLog[] {
    return this.findAll({
      user,
      orderBy: 'created_at',
      orderDirection: 'DESC',
    });
  }

  /**
   * Find logs by action
   */
  findByAction(action: string): AuditLog[] {
    return this.findAll({
      action,
      orderBy: 'created_at',
      orderDirection: 'DESC',
    });
  }

  /**
   * Find logs by staff ID
   */
  findByStaffId(staffId: string): AuditLog[] {
    return this.findAll({
      staff_id: staffId,
      orderBy: 'created_at',
      orderDirection: 'DESC',
    });
  }
}

