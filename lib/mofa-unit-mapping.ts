/**
 * MoFA Unit Mapping Configuration
 * Maps units to their directorates and determines workflow routing
 */

export interface MoFAUnitConfig {
  unit: string
  directorate: string | null // null = reports to Chief Director
  division?: string | null
  specialWorkflow?: 'HRMU' | 'AUDIT' // Special workflow cases
}

/**
 * MoFA Unit Configuration
 * Maps all units to their directorates
 */
export const MOFA_UNITS: MoFAUnitConfig[] = [
  // OFFICE OF THE MINISTER (Reports to Chief Director)
  {
    unit: 'Ministerial Secretariat',
    directorate: null, // Reports to Chief Director
  },
  {
    unit: 'Protocol Unit',
    directorate: null, // Reports to Chief Director
  },
  {
    unit: 'Public Affairs / Communications Unit',
    directorate: null, // Reports to Chief Director
  },

  // OFFICE OF THE CHIEF DIRECTOR (Reports to Chief Director)
  {
    unit: 'Policy, Planning, Monitoring & Evaluation (PPME)',
    directorate: null, // Reports to Chief Director
  },
  {
    unit: 'Internal Audit Unit',
    directorate: null, // Reports to Chief Director
    specialWorkflow: 'AUDIT', // Unit Head has AUDITOR role
  },
  {
    unit: 'Legal Unit',
    directorate: null, // Reports to Chief Director
  },
  {
    unit: 'Research, Statistics & Information Management (RSIM) Unit',
    directorate: null, // Reports to Chief Director
  },
  {
    unit: 'Procurement Unit',
    directorate: null, // Reports to Chief Director
  },

  // FINANCE & ADMINISTRATION DIRECTORATE
  {
    unit: 'Human Resource Management Unit (HRMU)',
    directorate: 'Finance & Administration Directorate',
    specialWorkflow: 'HRMU', // Requires HR Director approval
  },
  {
    unit: 'Accounts Unit',
    directorate: 'Finance & Administration Directorate',
  },
  {
    unit: 'Budget Unit',
    directorate: 'Finance & Administration Directorate',
  },
  {
    unit: 'Stores Unit',
    directorate: 'Finance & Administration Directorate',
  },
  {
    unit: 'Transport & Logistics Unit',
    directorate: 'Finance & Administration Directorate',
  },
  {
    unit: 'Records / Registry Unit',
    directorate: 'Finance & Administration Directorate',
  },

  // POLICY, PLANNING, MONITORING & EVALUATION (PPME) DIRECTORATE
  {
    unit: 'Policy Analysis Unit',
    directorate: 'Policy, Planning, Monitoring & Evaluation (PPME) Directorate',
  },
  {
    unit: 'Monitoring & Evaluation Unit',
    directorate: 'Policy, Planning, Monitoring & Evaluation (PPME) Directorate',
  },
  {
    unit: 'Project Coordination Unit',
    directorate: 'Policy, Planning, Monitoring & Evaluation (PPME) Directorate',
  },
  {
    unit: 'ICT Unit',
    directorate: 'Policy, Planning, Monitoring & Evaluation (PPME) Directorate', // Confirmed: Reports to PPME Director
  },
]

/**
 * Get unit configuration
 */
export function getUnitConfig(unit: string | null): MoFAUnitConfig | null {
  if (!unit) return null
  
  return MOFA_UNITS.find(u => 
    u.unit.toLowerCase() === unit.toLowerCase() ||
    unit.toLowerCase().includes(u.unit.toLowerCase()) ||
    u.unit.toLowerCase().includes(unit.toLowerCase())
  ) || null
}

/**
 * Determine if unit reports to Chief Director (no directorate)
 */
export function reportsToChiefDirector(unit: string | null, directorate: string | null): boolean {
  if (!unit) return !directorate || directorate.trim() === ''
  
  const config = getUnitConfig(unit)
  if (config) {
    return config.directorate === null
  }
  
  // Fallback: if no directorate specified, reports to Chief Director
  return !directorate || directorate.trim() === ''
}

/**
 * Check if unit is HRMU (special workflow)
 */
export function isHRMU(unit: string | null): boolean {
  if (!unit) return false
  
  const config = getUnitConfig(unit)
  return config?.specialWorkflow === 'HRMU' ||
         unit.toLowerCase().includes('human resource management') ||
         unit.toLowerCase().includes('hrmu')
}

/**
 * Check if unit is Internal Audit Unit
 */
export function isInternalAuditUnit(unit: string | null): boolean {
  if (!unit) return false
  
  const config = getUnitConfig(unit)
  return config?.specialWorkflow === 'AUDIT' ||
         unit.toLowerCase().includes('internal audit')
}

/**
 * Get directorate for a unit
 */
export function getDirectorateForUnit(unit: string | null): string | null {
  if (!unit) return null
  
  const config = getUnitConfig(unit)
  return config?.directorate || null
}

