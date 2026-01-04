/**
 * Ghana Civil Service Organizational Structure Mapping
 * Compliant with:
 * - Civil Service Act, 1993 (PNDCL 327)
 * - Office of the Head of the Civil Service (OHCS) directives
 * - Public Services Commission (PSC) guidelines
 * 
 * This replaces the previous MoFA structure with the standardized Ghana Civil Service structure.
 */

export interface CivilServiceUnitConfig {
  unit: string
  subUnit?: string // For sub-units within units
  directorate: string | null // null = Independent Supporting Unit (reports to Chief Director)
  isIndependentUnit?: boolean // True for Independent Supporting Units
  specialWorkflow?: 'HRMD' | 'AUDIT' // Special workflow cases
}

/**
 * Ghana Civil Service Unit Configuration
 * Maps all units to their directorates according to Civil Service structure
 */
export const CIVIL_SERVICE_UNITS: CivilServiceUnitConfig[] = [
  // ============================================
  // CORE DIRECTORATES (Report to Chief Director)
  // ============================================

  // 1. Policy, Planning, Budgeting, Monitoring & Evaluation Directorate (PPBME)
  {
    unit: 'Policy Coordination Unit',
    directorate: 'Policy, Planning, Budgeting, Monitoring & Evaluation Directorate (PPBME)',
  },
  {
    unit: 'Planning & Budgeting Unit',
    directorate: 'Policy, Planning, Budgeting, Monitoring & Evaluation Directorate (PPBME)',
  },
  {
    unit: 'Monitoring & Evaluation Unit',
    directorate: 'Policy, Planning, Budgeting, Monitoring & Evaluation Directorate (PPBME)',
  },
  {
    unit: 'Fisheries Management & Aquaculture Development Unit',
    directorate: 'Policy, Planning, Budgeting, Monitoring & Evaluation Directorate (PPBME)',
    subUnit: 'Culture & Capture Fisheries Sub-Unit',
  },
  {
    unit: 'Fisheries Management & Aquaculture Development Unit',
    directorate: 'Policy, Planning, Budgeting, Monitoring & Evaluation Directorate (PPBME)',
    subUnit: 'Post-Harvest & Marketing Sub-Unit',
  },

  // 2. Research, Statistics & Information Management Directorate (RSIMD)
  {
    unit: 'Research & Statistics Unit',
    directorate: 'Research, Statistics & Information Management Directorate (RSIMD)',
  },
  {
    unit: 'Information Technology & Information Management Unit',
    directorate: 'Research, Statistics & Information Management Directorate (RSIMD)',
  },
  {
    unit: 'Documentation / Library Unit',
    directorate: 'Research, Statistics & Information Management Directorate (RSIMD)',
  },

  // 3. Human Resource Management & Development Directorate (HRMD)
  {
    unit: 'Human Resource Planning Unit',
    directorate: 'Human Resource Management & Development Directorate (HRMD)',
    specialWorkflow: 'HRMD',
  },
  {
    unit: 'Training & Development Unit',
    directorate: 'Human Resource Management & Development Directorate (HRMD)',
    specialWorkflow: 'HRMD',
  },
  {
    unit: 'Performance Management Unit',
    directorate: 'Human Resource Management & Development Directorate (HRMD)',
    specialWorkflow: 'HRMD',
  },
  {
    unit: 'Personnel / Records Unit',
    directorate: 'Human Resource Management & Development Directorate (HRMD)',
    specialWorkflow: 'HRMD',
  },

  // 4. Finance & Administration Directorate (F&A)
  {
    unit: 'Administration Unit',
    directorate: 'Finance & Administration Directorate (F&A)',
  },
  {
    unit: 'Finance / Accounts Unit',
    directorate: 'Finance & Administration Directorate (F&A)',
  },
  {
    unit: 'Treasury / Payments Unit',
    directorate: 'Finance & Administration Directorate (F&A)',
  },
  {
    unit: 'Procurement & Stores Unit',
    directorate: 'Finance & Administration Directorate (F&A)',
  },
  {
    unit: 'Transport Unit',
    directorate: 'Finance & Administration Directorate (F&A)',
  },
  {
    unit: 'Estates / Facilities Unit',
    directorate: 'Finance & Administration Directorate (F&A)',
  },
  {
    unit: 'Records / Registry Unit',
    directorate: 'Finance & Administration Directorate (F&A)',
  },
  {
    unit: 'Protocol & Security Unit',
    directorate: 'Finance & Administration Directorate (F&A)',
  },
  {
    unit: 'Resource Mobilization / Donor Coordination Unit',
    directorate: 'Finance & Administration Directorate (F&A)',
  },

  // ============================================
  // INDEPENDENT SUPPORTING UNITS
  // (Report directly to Chief Director)
  // ============================================
  {
    unit: 'Internal Audit Unit',
    directorate: null, // Reports to Chief Director
    isIndependentUnit: true,
    specialWorkflow: 'AUDIT', // Unit Head has AUDITOR role
  },
  {
    unit: 'Legal Unit',
    directorate: null, // Reports to Chief Director
    isIndependentUnit: true,
  },
  {
    unit: 'Public Relations / Communications Unit',
    directorate: null, // Reports to Chief Director
    isIndependentUnit: true,
  },
  {
    unit: 'Right to Information (RTI) Unit',
    directorate: null, // Reports to Chief Director
    isIndependentUnit: true,
  },
  {
    unit: 'Client Service Unit',
    directorate: null, // Reports to Chief Director
    isIndependentUnit: true,
  },
]

/**
 * Get unit configuration
 */
export function getUnitConfig(unit: string | null, subUnit?: string | null): CivilServiceUnitConfig | null {
  if (!unit) return null
  
  return CIVIL_SERVICE_UNITS.find(u => {
    const unitMatch = u.unit.toLowerCase() === unit.toLowerCase() ||
                     unit.toLowerCase().includes(u.unit.toLowerCase()) ||
                     u.unit.toLowerCase().includes(unit.toLowerCase())
    
    // If sub-unit is specified, match it too
    if (subUnit && u.subUnit) {
      return unitMatch && (
        u.subUnit.toLowerCase() === subUnit.toLowerCase() ||
        subUnit.toLowerCase().includes(u.subUnit.toLowerCase()) ||
        u.subUnit.toLowerCase().includes(subUnit.toLowerCase())
      )
    }
    
    // If no sub-unit specified, match units without sub-units or with matching unit name
    if (!subUnit && !u.subUnit) {
      return unitMatch
    }
    
    return false
  }) || null
}

/**
 * Determine if unit is an Independent Supporting Unit (reports to Chief Director)
 */
export function isIndependentUnit(unit: string | null): boolean {
  if (!unit) return false
  
  const config = getUnitConfig(unit)
  return config?.isIndependentUnit === true || config?.directorate === null
}

/**
 * Determine if unit reports to Chief Director (no directorate or independent unit)
 */
export function reportsToChiefDirector(unit: string | null, directorate: string | null): boolean {
  if (!unit) return !directorate || directorate.trim() === ''
  
  const config = getUnitConfig(unit)
  if (config) {
    return config.directorate === null || config.isIndependentUnit === true
  }
  
  // Fallback: if no directorate specified, reports to Chief Director
  return !directorate || directorate.trim() === ''
}

/**
 * Check if unit is HRMD (Human Resource Management & Development Directorate)
 */
export function isHRMD(unit: string | null): boolean {
  if (!unit) return false
  
  const config = getUnitConfig(unit)
  return config?.specialWorkflow === 'HRMD' ||
         config?.directorate === 'Human Resource Management & Development Directorate (HRMD)' ||
         unit.toLowerCase().includes('human resource management') ||
         unit.toLowerCase().includes('hrmd')
}

/**
 * Check if unit is Internal Audit Unit
 */
export function isInternalAuditUnit(unit: string | null): boolean {
  if (!unit) return false
  
  const config = getUnitConfig(unit)
  return config?.specialWorkflow === 'AUDIT' ||
         config?.isIndependentUnit === true && unit.toLowerCase().includes('internal audit')
}

/**
 * Get directorate for a unit
 */
export function getDirectorateForUnit(unit: string | null): string | null {
  if (!unit) return null
  
  const config = getUnitConfig(unit)
  return config?.directorate || null
}

/**
 * Get all units for a directorate
 */
export function getUnitsForDirectorate(directorate: string | null): CivilServiceUnitConfig[] {
  if (!directorate) {
    // Return independent units
    return CIVIL_SERVICE_UNITS.filter(u => u.directorate === null || u.isIndependentUnit === true)
  }
  
  return CIVIL_SERVICE_UNITS.filter(u => u.directorate === directorate)
}

/**
 * Check if a position is a Director (Head of Department)
 */
export function isDirectorPosition(position: string | null, grade: string | null): boolean {
  if (!position) return false
  
  const positionLower = position.toLowerCase()
  const gradeLower = grade?.toLowerCase() || ''
  
  return positionLower.includes('director') ||
         gradeLower.includes('director') ||
         ['Chief Director', 'Deputy Director', 'Director'].some(title => 
           position.includes(title)
         )
}

/**
 * Check if a position is a Unit Head
 */
export function isUnitHeadPosition(position: string | null): boolean {
  if (!position) return false
  
  const positionLower = position.toLowerCase()
  return positionLower.includes('unit head') ||
         positionLower.includes('head of unit') ||
         positionLower.includes('unit manager')
}

/**
 * Check if a position is Chief Director
 */
export function isChiefDirectorPosition(position: string | null, grade: string | null): boolean {
  if (!position) return false
  
  const positionLower = position.toLowerCase()
  const gradeLower = grade?.toLowerCase() || ''
  
  return positionLower.includes('chief director') ||
         positionLower === 'chief director' ||
         gradeLower.includes('chief director')
}

/**
 * Check if a position is Head of Department (HoD)
 * HoD = Director of Core Directorate OR Head of Independent Unit
 */
export function isHeadOfDepartment(
  position: string | null,
  grade: string | null,
  unit: string | null,
  directorate: string | null
): boolean {
  // Directors are HoDs
  if (isDirectorPosition(position, grade)) return true
  
  // Heads of Independent Units are HoDs
  if (isIndependentUnit(unit) && isUnitHeadPosition(position)) return true
  
  return false
}

