import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isHR, isAdmin } from '@/lib/auth-proxy'
import { MOFA_UNITS, getUnitConfig } from '@/lib/mofa-unit-mapping'

// POST bulk upload staff from CSV/Excel file

// Force static export configuration (required for static export mode)

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'
export async function POST(request: NextRequest) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Only HR and admin can perform bulk uploads
      if (!isHR(user) && !isAdmin(user)) {
        return NextResponse.json(
          { error: 'Forbidden - Only HR and Admin can perform bulk uploads' },
          { status: 403 }
        )
      }

      const formData = await req.formData()
      const file = formData.get('file') as File

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        )
      }

      // Read file content
      const arrayBuffer = await file.arrayBuffer()
      const content = Buffer.from(arrayBuffer).toString('utf-8')
      
      // Parse CSV (simple CSV parser)
      let rows: any[] = []
      
      if (file.name.endsWith('.csv')) {
        // Simple CSV parser
        const lines = content.split('\n').filter(line => line.trim())
        if (lines.length < 2) {
          return NextResponse.json(
            { error: 'CSV file must have at least a header row and one data row' },
            { status: 400 }
          )
        }
        
        // Parse header
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
        
        // Parse data rows
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
          const row: any = {}
          headers.forEach((header, index) => {
            row[header] = values[index] || ''
          })
          rows.push(row)
        }
      } else {
        return NextResponse.json(
          { error: 'Currently only CSV files are supported. Please convert Excel files to CSV format.' },
          { status: 400 }
        )
      }

      if (rows.length === 0) {
        return NextResponse.json(
          { error: 'File is empty or contains no data' },
          { status: 400 }
        )
      }

      const results = {
        success: 0,
        failed: 0,
        errors: [] as Array<{ row: number; staffId?: string; error: string }>,
        warnings: [] as Array<{ row: number; staffId?: string; warning: string }>,
      }

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const rowNumber = i + 2 // +2 because row 1 is header, and arrays are 0-indexed

        try {
          // Validate required fields per MoFAD requirements
          const requiredFields = ['staffId', 'firstName', 'lastName', 'email', 'phone', 'department', 'position', 'grade', 'level', 'unit', 'dutyStation', 'joinDate']
          const missingFields = requiredFields.filter(field => !row[field] || row[field].toString().trim() === '')

          if (missingFields.length > 0) {
            results.failed++
            results.errors.push({
              row: rowNumber,
              staffId: row.staffId,
              error: `Missing required fields: ${missingFields.join(', ')}`,
            })
            continue
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(row.email)) {
            results.failed++
            results.errors.push({
              row: rowNumber,
              staffId: row.staffId,
              error: 'Invalid email format',
            })
            continue
          }

          // Validate MoFAD unit
          if (row.unit) {
            const unitConfig = getUnitConfig(row.unit)
            if (!unitConfig) {
              results.failed++
              results.errors.push({
                row: rowNumber,
                staffId: row.staffId,
                error: `Unit "${row.unit}" is not a valid MoFAD unit`,
              })
              continue
            }
          }

          // Validate duty station
          const validDutyStations = ['HQ', 'Region', 'District', 'Agency']
          if (row.dutyStation && !validDutyStations.includes(row.dutyStation)) {
            results.failed++
            results.errors.push({
              row: rowNumber,
              staffId: row.staffId,
              error: `Invalid duty station: ${row.dutyStation}. Must be one of: ${validDutyStations.join(', ')}`,
            })
            continue
          }

          // Validate grade format
          if (row.grade) {
            const gradeRegex = /^(SSS|PSS|DSS|USS|MSS|JSS)\s*[1-6]$/i
            if (!gradeRegex.test(row.grade.trim())) {
              results.failed++
              results.errors.push({
                row: rowNumber,
                staffId: row.staffId,
                error: `Invalid grade format: ${row.grade}. Must be SSS/PSS/DSS/USS/MSS/JSS 1-6`,
              })
              continue
            }
          }

          // Validate level (1-12)
          const levelNum = parseInt(row.level)
          if (isNaN(levelNum) || levelNum < 1 || levelNum > 12) {
            results.failed++
            results.errors.push({
              row: rowNumber,
              staffId: row.staffId,
              error: `Invalid level: ${row.level}. Must be between 1 and 12`,
            })
            continue
          }

          // Validate rank if provided
          if (row.rank) {
            const validRanks = [
              'Chief Director', 'Deputy Chief Director', 'Director', 'Deputy Director',
              'Principal Officer', 'Senior Officer', 'Officer', 'Assistant Officer',
              'Senior Staff', 'Staff', 'Junior Staff'
            ]
            if (!validRanks.includes(row.rank)) {
              results.warnings.push({
                row: rowNumber,
                staffId: row.staffId,
                warning: `Invalid rank: ${row.rank}. Using null instead.`,
              })
              row.rank = null
            }
          }

          // Validate step if provided (1-15)
          if (row.step) {
            const stepNum = parseInt(row.step)
            if (isNaN(stepNum) || stepNum < 1 || stepNum > 15) {
              results.warnings.push({
                row: rowNumber,
                staffId: row.staffId,
                warning: `Invalid step: ${row.step}. Must be between 1 and 15. Using null instead.`,
              })
              row.step = null
            }
          }

          // Check if staff already exists
          const existingStaff = await prisma.staffMember.findUnique({
            where: { staffId: row.staffId },
          })

          if (existingStaff) {
            results.failed++
            results.errors.push({
              row: rowNumber,
              staffId: row.staffId,
              error: `Staff ID already exists: ${row.staffId}`,
            })
            continue
          }

          // Check if email already exists
          const existingEmail = await prisma.staffMember.findUnique({
            where: { email: row.email },
          })

          if (existingEmail) {
            results.failed++
            results.errors.push({
              row: rowNumber,
              staffId: row.staffId,
              error: `Email already exists: ${row.email}`,
            })
            continue
          }

          // Parse join date
          let joinDate: Date
          try {
            joinDate = new Date(row.joinDate)
            if (isNaN(joinDate.getTime())) {
              throw new Error('Invalid date format')
            }
          } catch (error) {
            results.failed++
            results.errors.push({
              row: rowNumber,
              staffId: row.staffId,
              error: `Invalid joinDate format: ${row.joinDate}. Use YYYY-MM-DD format.`,
            })
            continue
          }

          // Validate manager/supervisor if provided
          if (row.managerId) {
            const manager = await prisma.staffMember.findUnique({
              where: { staffId: row.managerId },
            })
            if (!manager) {
              results.warnings.push({
                row: rowNumber,
                staffId: row.staffId,
                warning: `Manager ID not found: ${row.managerId}. Staff will be created without manager.`,
              })
              row.managerId = undefined
            }
          }

          if (row.immediateSupervisorId) {
            const supervisor = await prisma.staffMember.findUnique({
              where: { staffId: row.immediateSupervisorId },
            })
            if (!supervisor) {
              results.warnings.push({
                row: rowNumber,
                staffId: row.staffId,
                warning: `Supervisor ID not found: ${row.immediateSupervisorId}. Staff will be created without supervisor.`,
              })
              row.immediateSupervisorId = undefined
            }
          }

          // Create staff member
          await prisma.$transaction(async (tx) => {
            const staff = await tx.staffMember.create({
              data: {
                staffId: row.staffId.trim(),
                firstName: row.firstName.trim(),
                lastName: row.lastName.trim(),
                email: row.email.trim().toLowerCase(),
                phone: row.phone?.trim() || '',
                department: row.department.trim(),
                position: row.position.trim(),
                grade: row.grade.trim(),
                level: row.level.trim(),
                rank: row.rank?.trim() || null,
                step: row.step?.trim() || null,
                directorate: row.directorate?.trim() || null,
                division: row.division?.trim() || null,
                unit: row.unit?.trim() || null,
                dutyStation: row.dutyStation?.trim() || 'HQ',
                joinDate,
                confirmationDate: row.confirmationDate ? new Date(row.confirmationDate) : null,
                managerId: row.managerId?.trim() || null,
                immediateSupervisorId: row.immediateSupervisorId?.trim() || null,
                active: true,
                employmentStatus: 'active',
              },
            })

            // Create initial leave balance
            await tx.leaveBalance.create({
              data: {
                staffId: staff.staffId,
                annual: 0,
                sick: 0,
                unpaid: 0,
                specialService: 0,
                training: 0,
                study: 0,
                maternity: 0,
                paternity: 0,
                compassionate: 0,
              },
            })

            // Create audit log
            await tx.auditLog.create({
              data: {
                action: 'STAFF_CREATED_BULK',
                user: user.email,
                userRole: user.role,
                staffId: staff.staffId,
                details: `Staff member created via bulk upload: ${staff.firstName} ${staff.lastName} (${staff.staffId})`,
              },
            })
          })

          results.success++
        } catch (error: any) {
          results.failed++
          results.errors.push({
            row: rowNumber,
            staffId: row.staffId,
            error: error?.message || 'Unknown error occurred',
          })
        }
      }

      return NextResponse.json(results)
    } catch (error: any) {
      console.error('Error processing bulk upload:', error)
      return NextResponse.json(
        { error: error?.message || 'Failed to process bulk upload' },
        { status: 500 }
      )
    }
  })(request)
}

