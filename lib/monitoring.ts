/**
 * Monitoring & Alerting System
 * Tracks system health, business metrics, and sends alerts
 */

import { prisma } from './prisma'
import { sendEmail } from './email'

export interface SystemHealth {
  database: 'healthy' | 'degraded' | 'down'
  api: 'healthy' | 'degraded' | 'down'
  diskSpace: number // Percentage used
  memoryUsage: number // Percentage used
  timestamp: Date
}

export interface BusinessAlert {
  type: 'balance_inconsistency' | 'approval_delay' | 'accrual_failed' | 'system_error'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  details: Record<string, any>
  timestamp: Date
}

/**
 * Check system health
 */
export async function checkSystemHealth(): Promise<SystemHealth> {
  const health: SystemHealth = {
    database: 'healthy',
    api: 'healthy',
    diskSpace: 0,
    memoryUsage: 0,
    timestamp: new Date(),
  }

  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`
    health.database = 'healthy'
  } catch (error) {
    console.error('Database health check failed:', error)
    health.database = 'down'
  }

  // Check disk space (Node.js doesn't have direct access, would need system call)
  // For now, we'll skip this or use a library

  // Check memory usage
  const used = process.memoryUsage()
  health.memoryUsage = (used.heapUsed / used.heapTotal) * 100

  return health
}

/**
 * Check for balance inconsistencies
 */
export async function checkBalanceInconsistencies(): Promise<BusinessAlert[]> {
  const alerts: BusinessAlert[] = []

  try {
    // Find negative balances (should not exist)
    const negativeBalances = await prisma.$queryRaw<Array<{
      staffId: string
      leaveType: string
      balance: number
    }>>`
      SELECT 
        lb."staffId",
        'Annual' as "leaveType",
        lb.annual as balance
      FROM "LeaveBalance" lb
      WHERE lb.annual < 0
      UNION ALL
      SELECT 
        lb."staffId",
        'Sick' as "leaveType",
        lb.sick as balance
      FROM "LeaveBalance" lb
      WHERE lb.sick < 0
      UNION ALL
      SELECT 
        lb."staffId",
        'Special Service' as "leaveType",
        lb."specialService" as balance
      FROM "LeaveBalance" lb
      WHERE lb."specialService" < 0
    `

    for (const balance of negativeBalances) {
      alerts.push({
        type: 'balance_inconsistency',
        severity: 'high',
        message: `Negative balance detected: ${balance.staffId} has ${balance.balance} days of ${balance.leaveType} leave`,
        details: balance,
        timestamp: new Date(),
      })
    }
  } catch (error) {
    console.error('Error checking balance inconsistencies:', error)
  }

  return alerts
}

/**
 * Check for approval delays
 */
export async function checkApprovalDelays(): Promise<BusinessAlert[]> {
  const alerts: BusinessAlert[] = []

  try {
    // Get reminder threshold
    const reminderSetting = await prisma.systemSettings.findUnique({
      where: { key: 'approval_reminder_days' },
    })
    const reminderDays = reminderSetting ? parseInt(reminderSetting.value) : 3

    const thresholdDate = new Date()
    thresholdDate.setDate(thresholdDate.getDate() - reminderDays)

    // Find pending leaves older than threshold
    const delayedLeaves = await prisma.leaveRequest.findMany({
      where: {
        status: 'pending',
        createdAt: {
          lte: thresholdDate,
        },
      },
      include: {
        staff: {
          select: {
            staffId: true,
            firstName: true,
            lastName: true,
            department: true,
          },
        },
      },
    })

    for (const leave of delayedLeaves) {
      const daysPending = Math.floor(
        (Date.now() - leave.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      )

      alerts.push({
        type: 'approval_delay',
        severity: daysPending > 7 ? 'high' : 'medium',
        message: `Leave request pending for ${daysPending} days: ${leave.staffName} (${leave.leaveType})`,
        details: {
          leaveId: leave.id,
          staffId: leave.staffId,
          daysPending,
          leaveType: leave.leaveType,
        },
        timestamp: new Date(),
      })
    }
  } catch (error) {
    console.error('Error checking approval delays:', error)
  }

  return alerts
}

/**
 * Check for failed accrual jobs
 */
export async function checkAccrualStatus(): Promise<BusinessAlert[]> {
  const alerts: BusinessAlert[] = []

  try {
    // Check last accrual date
    const lastAccrual = await prisma.leaveBalance.findFirst({
      where: {
        lastAccrualDate: { not: null } as any,
      },
      orderBy: {
        lastAccrualDate: 'desc' as any,
      },
      select: {
        lastAccrualDate: true,
      },
    })

    if (lastAccrual?.lastAccrualDate) {
      const daysSinceAccrual = Math.floor(
        (Date.now() - lastAccrual.lastAccrualDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Alert if accrual hasn't run in more than 35 days (should be monthly)
      if (daysSinceAccrual > 35) {
        alerts.push({
          type: 'accrual_failed',
          severity: 'high',
          message: `Accrual processing has not run in ${daysSinceAccrual} days`,
          details: {
            lastAccrualDate: lastAccrual.lastAccrualDate,
            daysSinceAccrual,
          },
          timestamp: new Date(),
        })
      }
    } else {
      // No accrual has ever run
      alerts.push({
        type: 'accrual_failed',
        severity: 'critical',
        message: 'Accrual processing has never been run',
        details: {},
        timestamp: new Date(),
      })
    }
  } catch (error) {
    console.error('Error checking accrual status:', error)
  }

  return alerts
}

/**
 * Run all health checks and generate alerts
 */
export async function runHealthChecks(): Promise<{
  health: SystemHealth
  alerts: BusinessAlert[]
}> {
  const health = await checkSystemHealth()
  const alerts: BusinessAlert[] = []

  // Run all checks
  const balanceAlerts = await checkBalanceInconsistencies()
  const approvalAlerts = await checkApprovalDelays()
  const accrualAlerts = await checkAccrualStatus()

  alerts.push(...balanceAlerts, ...approvalAlerts, ...accrualAlerts)

  return { health, alerts }
}

/**
 * Send alert notifications
 */
export async function sendAlertNotifications(alerts: BusinessAlert[]): Promise<void> {
  // Get HR/admin emails
  const hrUsers = await prisma.user.findMany({
    where: {
      role: { in: ['hr', 'admin'] },
      active: true,
    },
    include: {
      staff: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  })

  // Filter critical and high severity alerts
  const criticalAlerts = alerts.filter(
    a => a.severity === 'critical' || a.severity === 'high'
  )

  if (criticalAlerts.length > 0) {
    for (const user of hrUsers) {
      const email = user.staff?.email || user.email
      if (email) {
        try {
          await sendEmail({
            to: email,
            subject: `System Alert: ${criticalAlerts.length} Critical Issue(s) Detected`,
            html: `
              <h2>System Health Alerts</h2>
              <p>The following critical issues have been detected:</p>
              <ul>
                ${criticalAlerts.map(alert => `
                  <li>
                    <strong>${alert.type}</strong> (${alert.severity}): ${alert.message}
                  </li>
                `).join('')}
              </ul>
              <p>Please review the system dashboard for details.</p>
            `,
          })
        } catch (error) {
          console.error('Failed to send alert email:', error)
        }
      }
    }
  }
}

