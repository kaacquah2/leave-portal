/**
 * Employee Repository
 * 
 * Handles all employee/staff member data operations
 * Read-only offline (employees synced from server)
 */

import { Database } from 'better-sqlite3';
import { BaseRepository, BaseEntity, QueryFilters } from './base-repository';

export interface Employee extends BaseEntity {
  staff_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  grade: string;
  level: string;
  rank?: string;
  step?: string;
  directorate?: string;
  division?: string;
  unit?: string;
  duty_station?: string;
  photo_url?: string;
  active: number; // SQLite boolean (0 or 1)
  employment_status: string;
  termination_date?: string;
  termination_reason?: string;
  join_date: string;
  confirmation_date?: string;
  manager_id?: string;
  immediate_supervisor_id?: string;
}

export class EmployeeRepository extends BaseRepository<Employee> {
  constructor(db: Database) {
    super({
      tableName: 'employees',
      primaryKey: 'staff_id',
      db,
    });
  }

  /**
   * Find employee by staff ID
   */
  findByStaffId(staffId: string): Employee | null {
    return this.findOne({ staff_id: staffId });
  }

  /**
   * Find employees by department
   */
  findByDepartment(department: string): Employee[] {
    return this.findAll({ department, active: 1 });
  }

  /**
   * Find employees by manager
   */
  findByManager(managerId: string): Employee[] {
    return this.findAll({ manager_id: managerId, active: 1 });
  }

  /**
   * Find active employees only
   */
  findActive(): Employee[] {
    return this.findAll({ active: 1 });
  }

  /**
   * Search employees by name or email
   */
  search(query: string): Employee[] {
    const searchQuery = `%${query}%`;
    const stmt = this.db.prepare(`
      SELECT * FROM employees 
      WHERE (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)
      AND active = 1
      ORDER BY last_name, first_name
    `);
    return stmt.all(searchQuery, searchQuery, searchQuery) as Employee[];
  }
}

