/**
 * Database-Driven Workflow Engine
 * 
 * Implements configurable workflow definitions stored in the database.
 * Replaces hard-coded workflow logic with database-driven configuration.
 * 
 * Features:
 * - Workflow versioning
 * - Per-MDA customization
 * - Conditional workflow steps
 * - Workflow templates
 */

import { prisma } from '@/lib/prisma'
import { CivilServiceApprovalLevel, StaffOrganizationalInfo } from './ghana-civil-service-approval-workflow'
import { resolveApprover } from './acting-appointment-resolver'

export interface WorkflowCondition {
  // Staff conditions
  position?: string | string[]
  grade?: string | string[]
  unit?: string | string[]
  directorate?: string | string[]
  dutyStation?: 'HQ' | 'Region' | 'District' | 'Agency' | string[]
  isHRMD?: boolean
  isIndependentUnit?: boolean
  isDirector?: boolean
  isUnitHead?: boolean
  isHeadOfDepartment?: boolean
  isChiefDirector?: boolean
  
  // Leave conditions
  leaveType?: string | string[]
  minDays?: number
  maxDays?: number
  
  // Other conditions
  [key: string]: any
}

export interface WorkflowStepCondition {
  leaveType?: string | string[]
  days?: { min?: number; max?: number }
  position?: string | string[]
  grade?: string | string[]
  [key: string]: any
}

export interface WorkflowDefinitionInput {
  name: string
  description?: string
  mdaId?: string
  mdaName?: string
  conditions?: WorkflowCondition
  steps: Array<{
    stepOrder: number
    approverRole: string
    approverRoleType?: string
    isRequired?: boolean
    canSkip?: boolean
    canDelegate?: boolean
    conditions?: WorkflowStepCondition
    description?: string
  }>
  createdBy?: string
  createdByName?: string
}

/**
 * Check if staff info matches workflow conditions
 */
function matchesWorkflowConditions(
  staffInfo: StaffOrganizationalInfo,
  leaveType: string,
  days: number,
  conditions?: WorkflowCondition | null
): boolean {
  if (!conditions) return true

  // Check position
  if (conditions.position) {
    const positions = Array.isArray(conditions.position) ? conditions.position : [conditions.position]
    if (!positions.includes(staffInfo.position)) return false
  }

  // Check grade
  if (conditions.grade) {
    const grades = Array.isArray(conditions.grade) ? conditions.grade : [conditions.grade]
    if (!grades.includes(staffInfo.grade)) return false
  }

  // Check unit
  if (conditions.unit) {
    const units = Array.isArray(conditions.unit) ? conditions.unit : [conditions.unit]
    if (staffInfo.unit && !units.includes(staffInfo.unit)) return false
    if (!staffInfo.unit && !units.includes(null as any)) return false
  }

  // Check directorate
  if (conditions.directorate) {
    const directorates = Array.isArray(conditions.directorate) ? conditions.directorate : [conditions.directorate]
    if (staffInfo.directorate && !directorates.includes(staffInfo.directorate)) return false
    if (!staffInfo.directorate && !directorates.includes(null as any)) return false
  }

  // Check duty station
  if (conditions.dutyStation) {
    const stations = Array.isArray(conditions.dutyStation) ? conditions.dutyStation : [conditions.dutyStation]
    if (staffInfo.dutyStation && !stations.includes(staffInfo.dutyStation)) return false
    if (!staffInfo.dutyStation && !stations.includes(null as any)) return false
  }

  // Check leave type
  if (conditions.leaveType) {
    const types = Array.isArray(conditions.leaveType) ? conditions.leaveType : [conditions.leaveType]
    if (!types.includes(leaveType)) return false
  }

  // Check days
  if (conditions.minDays !== undefined && days < conditions.minDays) return false
  if (conditions.maxDays !== undefined && days > conditions.maxDays) return false

  // Boolean conditions (these would need to be computed from staffInfo)
  // For now, we'll skip these as they require additional logic
  // They can be added later when needed

  return true
}

/**
 * Check if step conditions match
 */
function matchesStepConditions(
  stepConditions?: WorkflowStepCondition | null,
  leaveType?: string,
  days?: number,
  staffInfo?: StaffOrganizationalInfo
): boolean {
  if (!stepConditions) return true

  if (stepConditions.leaveType) {
    const types = Array.isArray(stepConditions.leaveType) ? stepConditions.leaveType : [stepConditions.leaveType]
    if (leaveType && !types.includes(leaveType)) return false
  }

  if (stepConditions.days) {
    if (days !== undefined) {
      if (stepConditions.days.min !== undefined && days < stepConditions.days.min) return false
      if (stepConditions.days.max !== undefined && days > stepConditions.days.max) return false
    }
  }

  if (stepConditions.position && staffInfo) {
    const positions = Array.isArray(stepConditions.position) ? stepConditions.position : [stepConditions.position]
    if (!positions.includes(staffInfo.position)) return false
  }

  if (stepConditions.grade && staffInfo) {
    const grades = Array.isArray(stepConditions.grade) ? stepConditions.grade : [stepConditions.grade]
    if (!grades.includes(staffInfo.grade)) return false
  }

  return true
}

/**
 * Find matching workflow definition for staff and leave request
 */
export async function findMatchingWorkflow(
  staffInfo: StaffOrganizationalInfo,
  leaveType: string,
  days: number,
  mdaId?: string
): Promise<{ workflow: any; steps: any[] } | null> {
  // Get all active workflows, optionally filtered by MDA
  const workflows = await prisma.workflowDefinition.findMany({
    where: {
      isActive: true,
      OR: [
        { mdaId: null }, // Global workflows
        { mdaId: mdaId || null }, // MDA-specific workflows
      ],
    },
    include: {
      steps: {
        orderBy: { stepOrder: 'asc' },
      },
    },
    orderBy: [
      { isDefault: 'desc' }, // Default workflows first
      { createdAt: 'desc' }, // Newer workflows first
    ],
  })

  // Find the first matching workflow
  for (const workflow of workflows) {
    const conditions = workflow.conditions as WorkflowCondition | null
    if (matchesWorkflowConditions(staffInfo, leaveType, days, conditions)) {
      return {
        workflow,
        steps: workflow.steps,
      }
    }
  }

  return null
}

/**
 * Convert database workflow to CivilServiceApprovalLevel array
 */
export async function convertWorkflowToApprovalLevels(
  workflowSteps: any[],
  staffInfo: StaffOrganizationalInfo,
  leaveType: string,
  days: number
): Promise<CivilServiceApprovalLevel[]> {
  const levels: CivilServiceApprovalLevel[] = []

  for (const step of workflowSteps) {
    // Check if step conditions match
    const stepConditions = step.conditions as WorkflowStepCondition | null
    if (!matchesStepConditions(stepConditions, leaveType, days, staffInfo)) {
      // Skip this step if conditions don't match
      if (step.canSkip) {
        continue
      }
    }

    // Resolve approver if needed
    let approverStaffId: string | undefined
    let approverName: string | undefined

    // For supervisor role, try to resolve from staffInfo
    if (step.approverRole === 'SUPERVISOR' && staffInfo.immediateSupervisorId) {
      const supervisorApprover = await resolveApprover('SUPERVISOR', staffInfo.staffId, staffInfo.unit || undefined)
      if (supervisorApprover) {
        approverStaffId = supervisorApprover.staffId
        approverName = supervisorApprover.name
      } else {
        approverStaffId = staffInfo.immediateSupervisorId
      }
    }

    levels.push({
      level: step.stepOrder,
      approverRole: step.approverRole as any,
      approverStaffId,
      approverName,
      status: 'pending',
    })
  }

  return levels
}

/**
 * Get approval workflow using database-driven engine
 * Falls back to hard-coded logic if no matching workflow found
 */
export async function getDatabaseDrivenWorkflow(
  staffInfo: StaffOrganizationalInfo,
  leaveType: string,
  days: number,
  mdaId?: string
): Promise<CivilServiceApprovalLevel[] | null> {
  const match = await findMatchingWorkflow(staffInfo, leaveType, days, mdaId)
  
  if (!match) {
    return null // No matching workflow, should fall back to hard-coded logic
  }

  return convertWorkflowToApprovalLevels(match.steps, staffInfo, leaveType, days)
}

/**
 * Create a new workflow definition
 */
export async function createWorkflowDefinition(
  input: WorkflowDefinitionInput
): Promise<any> {
  // Check if workflow with same name and version exists for this MDA
  const existing = await prisma.workflowDefinition.findFirst({
    where: {
      name: input.name,
      version: 1, // Start with version 1
      mdaId: input.mdaId || null,
    },
  })

  if (existing) {
    throw new Error(`Workflow "${input.name}" already exists for this MDA`)
  }

  // Create workflow definition
  const workflow = await prisma.workflowDefinition.create({
    data: {
      name: input.name,
      description: input.description,
      mdaId: input.mdaId,
      mdaName: input.mdaName,
      conditions: input.conditions as any,
      createdBy: input.createdBy,
      createdByName: input.createdByName,
      steps: {
        create: input.steps.map(step => ({
          stepOrder: step.stepOrder,
          approverRole: step.approverRole,
          approverRoleType: step.approverRoleType,
          isRequired: step.isRequired ?? true,
          canSkip: step.canSkip ?? false,
          canDelegate: step.canDelegate ?? true,
          conditions: step.conditions as any,
          description: step.description,
        })),
      },
    },
    include: {
      steps: {
        orderBy: { stepOrder: 'asc' },
      },
    },
  })

  // Audit logging
  try {
    const { logWorkflowChange } = await import('./comprehensive-audit')
    if (input.createdBy) {
      const user = await prisma.user.findUnique({
        where: { id: input.createdBy },
        select: { email: true, role: true },
      })
      if (user) {
        await logWorkflowChange(
          input.createdBy,
          user.role,
          user.email,
          'created',
          workflow.id,
          workflow.name,
          { mdaId: workflow.mdaId, version: workflow.version },
          undefined,
          undefined
        )
      }
    }
  } catch (error) {
    console.error('[Workflow] Failed to log workflow creation:', error)
  }

  return workflow
}

/**
 * Create a new version of an existing workflow
 */
export async function createWorkflowVersion(
  workflowId: string,
  input: Omit<WorkflowDefinitionInput, 'name'> & { name?: string },
  createdBy?: string,
  createdByName?: string
): Promise<any> {
  const existing = await prisma.workflowDefinition.findUnique({
    where: { id: workflowId },
    include: { steps: true },
  })

  if (!existing) {
    throw new Error(`Workflow with ID ${workflowId} not found`)
  }

  // Deactivate old version
  await prisma.workflowDefinition.update({
    where: { id: workflowId },
    data: {
      isActive: false,
      deactivatedAt: new Date(),
    },
  })

  // Audit: Log deactivation of old version
  try {
    const { logWorkflowChange } = await import('./comprehensive-audit')
    if (createdBy) {
      const user = await prisma.user.findUnique({
        where: { id: createdBy },
        select: { email: true, role: true },
      })
      if (user) {
        await logWorkflowChange(
          createdBy,
          user.role,
          user.email,
          'deactivated',
          workflowId,
          existing.name,
          { version: existing.version },
          undefined,
          undefined
        )
      }
    }
  } catch (error) {
    console.error('[Workflow] Failed to log workflow deactivation:', error)
  }

  // Get next version number
  const maxVersion = await prisma.workflowDefinition.findFirst({
    where: {
      name: input.name || existing.name,
      mdaId: existing.mdaId,
    },
    orderBy: { version: 'desc' },
    select: { version: true },
  })

  const nextVersion = (maxVersion?.version || existing.version) + 1

  // Create new version
  const newWorkflow = await prisma.workflowDefinition.create({
    data: {
      name: input.name || existing.name,
      description: input.description || existing.description,
      version: nextVersion,
      mdaId: existing.mdaId,
      mdaName: input.mdaName || existing.mdaName,
      conditions: (input.conditions || existing.conditions) as any,
      previousVersionId: workflowId,
      createdBy: createdBy || input.createdBy,
      createdByName: createdByName || input.createdByName,
      steps: {
        create: (input.steps || existing.steps.map(s => ({
          stepOrder: s.stepOrder,
          approverRole: s.approverRole,
          approverRoleType: s.approverRoleType || null,
          isRequired: s.isRequired,
          canSkip: s.canSkip,
          canDelegate: s.canDelegate,
          conditions: s.conditions,
          description: s.description || null,
        }))).map(step => ({
          stepOrder: step.stepOrder,
          approverRole: step.approverRole,
          approverRoleType: step.approverRoleType,
          isRequired: step.isRequired ?? true,
          canSkip: step.canSkip ?? false,
          canDelegate: step.canDelegate ?? true,
          conditions: step.conditions as any,
          description: step.description,
        })),
      },
    },
    include: {
      steps: {
        orderBy: { stepOrder: 'asc' },
      },
    },
  })

  // Audit: Log creation of new version
  try {
    const { logWorkflowChange } = await import('./comprehensive-audit')
    const creatorId = createdBy || input.createdBy
    if (creatorId) {
      const user = await prisma.user.findUnique({
        where: { id: creatorId },
        select: { email: true, role: true },
      })
      if (user) {
        await logWorkflowChange(
          creatorId,
          user.role,
          user.email,
          'created',
          newWorkflow.id,
          newWorkflow.name,
          { mdaId: newWorkflow.mdaId, version: newWorkflow.version, previousVersionId: workflowId },
          undefined,
          undefined
        )
      }
    }
  } catch (error) {
    console.error('[Workflow] Failed to log workflow version creation:', error)
  }

  return newWorkflow
}

/**
 * Get all workflow definitions
 */
export async function getAllWorkflowDefinitions(mdaId?: string) {
  return prisma.workflowDefinition.findMany({
    where: {
      OR: [
        { mdaId: null },
        { mdaId: mdaId || null },
      ],
    },
    include: {
      steps: {
        orderBy: { stepOrder: 'asc' },
      },
    },
    orderBy: [
      { name: 'asc' },
      { version: 'desc' },
    ],
  })
}

/**
 * Get active workflow definitions
 */
export async function getActiveWorkflowDefinitions(mdaId?: string) {
  return prisma.workflowDefinition.findMany({
    where: {
      isActive: true,
      OR: [
        { mdaId: null },
        { mdaId: mdaId || null },
      ],
    },
    include: {
      steps: {
        orderBy: { stepOrder: 'asc' },
      },
    },
    orderBy: [
      { isDefault: 'desc' },
      { name: 'asc' },
    ],
  })
}

/**
 * Activate a workflow version (deactivates others with same name)
 */
export async function activateWorkflowVersion(
  workflowId: string,
  activatedBy?: string,
  ip?: string,
  userAgent?: string
) {
  const workflow = await prisma.workflowDefinition.findUnique({
    where: { id: workflowId },
  })

  if (!workflow) {
    throw new Error(`Workflow with ID ${workflowId} not found`)
  }

  // Get deactivated workflows for audit
  const deactivatedWorkflows = await prisma.workflowDefinition.findMany({
    where: {
      name: workflow.name,
      mdaId: workflow.mdaId,
      id: { not: workflowId },
      isActive: true,
    },
  })

  // Deactivate all other versions with same name and MDA
  await prisma.workflowDefinition.updateMany({
    where: {
      name: workflow.name,
      mdaId: workflow.mdaId,
      id: { not: workflowId },
    },
    data: {
      isActive: false,
      deactivatedAt: new Date(),
    },
  })

  // Activate this version
  const activated = await prisma.workflowDefinition.update({
    where: { id: workflowId },
    data: {
      isActive: true,
      activatedAt: new Date(),
    },
    include: {
      steps: {
        orderBy: { stepOrder: 'asc' },
      },
    },
  })

  // Audit logging
  try {
    const { logWorkflowChange } = await import('./comprehensive-audit')
    if (activatedBy) {
      const user = await prisma.user.findUnique({
        where: { id: activatedBy },
        select: { email: true, role: true },
      })
      if (user) {
        // Log activation
        await logWorkflowChange(
          activatedBy,
          user.role,
          user.email,
          'activated',
          workflowId,
          workflow.name,
          { version: workflow.version },
          ip,
          userAgent
        )

        // Log deactivation of other versions
        for (const deactivated of deactivatedWorkflows) {
          await logWorkflowChange(
            activatedBy,
            user.role,
            user.email,
            'deactivated',
            deactivated.id,
            deactivated.name,
            { version: deactivated.version, reason: 'Replaced by newer version' },
            ip,
            userAgent
          )
        }
      }
    }
  } catch (error) {
    console.error('[Workflow] Failed to log workflow activation:', error)
  }

  return activated
}

/**
 * Set workflow as default
 */
export async function setDefaultWorkflow(workflowId: string) {
  const workflow = await prisma.workflowDefinition.findUnique({
    where: { id: workflowId },
  })

  if (!workflow) {
    throw new Error(`Workflow with ID ${workflowId} not found`)
  }

  // Unset other defaults with same name and MDA
  await prisma.workflowDefinition.updateMany({
    where: {
      name: workflow.name,
      mdaId: workflow.mdaId,
      id: { not: workflowId },
    },
    data: {
      isDefault: false,
    },
  })

  // Set this as default
  return prisma.workflowDefinition.update({
    where: { id: workflowId },
    data: {
      isDefault: true,
    },
    include: {
      steps: {
        orderBy: { stepOrder: 'asc' },
      },
    },
  })
}

