/**
 * Shared Role Types
 * 
 * Centralized role type definitions.
 * Import from this file instead of duplicating types.
 */

/**
 * Ghana Civil Service HR Leave Workflow Roles (Exact Role Codes)
 */
export type UserRole = 
  | 'EMPLOYEE'              // All confirmed staff
  | 'SUPERVISOR'            // Immediate Supervisor / Line Manager
  | 'UNIT_HEAD'             // Head of functional unit
  | 'HEAD_OF_DEPARTMENT'    // Head of Department (HoD) - Director of Core Directorate (statutory Civil Service role)
  | 'HEAD_OF_INDEPENDENT_UNIT' // Head of Independent Unit (Legal, RTI, PR, Audit, Client Service) - Functions as HoD
  | 'DIRECTOR'              // Director of Core Directorate
  | 'HR_OFFICER'            // HR Officer (HRM) - Final approval authority
  | 'HR_DIRECTOR'           // Head of Human Resource Directorate
  | 'CHIEF_DIRECTOR'        // Chief Director / Ministerial Authority
  | 'AUDITOR'               // Internal Auditor (IAA) - Read-only
  | 'SYSTEM_ADMIN'           // System Administrator (Technical config and system management)
  // Legacy roles (for backward compatibility during migration)
  | 'employee' | 'supervisor' | 'unit_head' | 'directorate_head' 
  | 'hr_officer' | 'hr_director' | 'chief_director' | 'internal_auditor'
  | 'hr' | 'hr_assistant' | 'manager' | 'deputy_director' | 'admin' | 'SYS_ADMIN'
  | 'head_of_department' | 'hod' // Legacy HoD mappings
  | 'head_of_independent_unit' // Legacy mapping for HEAD_OF_INDEPENDENT_UNIT

