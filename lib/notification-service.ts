/**
 * Multi-Channel Notification Service for MoFA Leave System
 * Supports: In-app, Email, Push notifications with escalation reminders
 */

import { prisma } from '@/lib/prisma'
import { sendEmail } from './email'
import { sendPushNotification } from './send-push-notification'

export interface NotificationData {
  userId?: string
  staffId?: string
  type: 'leave_submitted' | 'leave_approved' | 'leave_rejected' | 'leave_reminder' | 'escalation' | 'system'
  title: string
  message: string
  link?: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  metadata?: Record<string, any>
}

export interface EscalationRule {
  triggerAfterHours: number
  notifyApprover: boolean
  notifyHR: boolean
  notifySupervisor: boolean
  autoEscalate?: boolean
}

/**
 * Send multi-channel notification
 */
export async function sendNotification(data: NotificationData): Promise<void> {
  try {
    // Create in-app notification
    if (data.userId) {
      await prisma.notification.create({
        data: {
          userId: data.userId,
          staffId: data.staffId,
          type: data.type,
          title: data.title,
          message: data.message,
          link: data.link,
          read: false,
        },
      })
    }

    // Send email notification (non-blocking)
    if (data.staffId) {
      const staff = await prisma.staffMember.findUnique({
        where: { staffId: data.staffId },
        include: { user: true },
      })

      if (staff?.email) {
        // Enhanced email template with role-specific styling
        const emailTemplate = generateEmailTemplate(data)
        sendEmail({
          to: staff.email,
          subject: data.title,
          html: emailTemplate,
        }).catch((error) => {
          console.error('Failed to send email notification:', error)
        })
      }
    }

    // Send push notification (non-blocking)
    if (data.userId) {
      sendPushNotification(data.userId, {
        title: data.title,
        message: data.message,
        link: data.link,
        type: data.type,
        important: data.priority === 'high' || data.priority === 'urgent',
      }).catch((error) => {
        console.error('Failed to send push notification:', error)
      })
    }
  } catch (error) {
    console.error('Failed to send notification:', error)
    // Don't throw - notifications should not break main operations
  }
}

/**
 * Generate enhanced email template with role-specific styling
 */
function generateEmailTemplate(data: NotificationData): string {
  const colors = {
    leave_submitted: { primary: '#1a73e8', bg: '#e8f0fe' },
    leave_approved: { primary: '#34a853', bg: '#e6f4ea' },
    leave_rejected: { primary: '#ea4335', bg: '#fce8e6' },
    leave_reminder: { primary: '#fbbc04', bg: '#fef7e0' },
    escalation: { primary: '#ea4335', bg: '#fce8e6' },
    system: { primary: '#5f6368', bg: '#f1f3f4' },
  }
  
  const notificationColor = colors[data.type] || colors.system
  const priorityBadge = data.priority === 'urgent' 
    ? '<span style="background-color: #ea4335; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-left: 10px;">URGENT</span>'
    : data.priority === 'high'
    ? '<span style="background-color: #fbbc04; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-left: 10px;">HIGH</span>'
    : ''

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, ${notificationColor.primary} 0%, ${notificationColor.primary}dd 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">MoFA HR Leave System</h1>
      </div>
      
      <!-- Content -->
      <div style="padding: 30px; background-color: ${notificationColor.bg}20;">
        <h2 style="color: ${notificationColor.primary}; margin-top: 0; font-size: 20px; font-weight: 600;">
          ${data.title}${priorityBadge}
        </h2>
        <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${notificationColor.primary}; margin: 20px 0;">
          <p style="color: #333; line-height: 1.6; margin: 0; font-size: 14px;">${data.message}</p>
        </div>
        
        ${data.link ? `
          <div style="text-align: center; margin: 25px 0;">
            <a href="${data.link}" style="background-color: ${notificationColor.primary}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              View Details
            </a>
          </div>
        ` : ''}
        
        ${data.metadata ? `
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin-top: 20px; font-size: 12px; color: #666;">
            ${Object.entries(data.metadata).map(([key, value]) => `
              <div style="margin: 5px 0;">
                <strong>${key}:</strong> ${value}
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
      
      <!-- Footer -->
      <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
        <p style="color: #666; font-size: 12px; margin: 0;">
          This is an automated notification from the Ministry of Fisheries and Aquaculture (MoFA) HR Leave System.
        </p>
        <p style="color: #999; font-size: 11px; margin: 10px 0 0 0;">
          Please do not reply to this email. For inquiries, contact HR at hr@mofa.gov.gh
        </p>
      </div>
    </div>
  `
}

/**
 * Send leave submission notification to approvers
 */
export async function notifyLeaveSubmission(data: {
  leaveRequestId: string
  staffId: string
  staffName: string
  leaveType: string
  days: number
  approverIds: string[]
  approverStaffIds?: string[]
}): Promise<void> {
  const portalUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  for (const approverId of data.approverIds) {
    const user = await prisma.user.findUnique({
      where: { id: approverId },
      include: { staff: true },
    })

    if (user) {
      await sendNotification({
        userId: approverId,
        staffId: user.staffId || undefined,
        type: 'leave_submitted',
        title: 'New Leave Request Pending Approval',
        message: `${data.staffName} has submitted a ${data.leaveType} leave request for ${data.days} day(s). Please review and approve.`,
        link: `${portalUrl}/leaves/${data.leaveRequestId}`,
        priority: 'high',
        metadata: {
          leaveRequestId: data.leaveRequestId,
          staffId: data.staffId,
          leaveType: data.leaveType,
          days: data.days,
        },
      })
    }
  }
}

/**
 * Send leave approval/rejection notification to employee
 */
export async function notifyLeaveDecision(data: {
  leaveRequestId: string
  staffId: string
  staffName: string
  leaveType: string
  days: number
  status: 'approved' | 'rejected'
  approverName: string
  comments?: string
}): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { staffId: data.staffId },
  })

  if (!user) return

  const portalUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const statusText = data.status === 'approved' ? 'Approved' : 'Rejected'
  const emoji = data.status === 'approved' ? '✅' : '❌'

  await sendNotification({
    userId: user.id,
    staffId: data.staffId,
    type: data.status === 'approved' ? 'leave_approved' : 'leave_rejected',
    title: `Leave Request ${statusText}`,
    message: `${emoji} Your ${data.leaveType} leave request for ${data.days} day(s) has been ${statusText.toLowerCase()} by ${data.approverName}.${data.comments ? ` Comments: ${data.comments}` : ''}`,
    link: `${portalUrl}/leaves/${data.leaveRequestId}`,
    priority: data.status === 'approved' ? 'normal' : 'high',
    metadata: {
      leaveRequestId: data.leaveRequestId,
      status: data.status,
      approverName: data.approverName,
      comments: data.comments,
    },
  })
}

/**
 * Send escalation reminder for pending approvals
 */
export async function sendEscalationReminder(data: {
  leaveRequestId: string
  staffId: string
  staffName: string
  leaveType: string
  days: number
  pendingSince: Date
  approverId: string
  approverName: string
  level: number
  hoursPending: number
}): Promise<void> {
  const portalUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  await sendNotification({
    userId: data.approverId,
    type: 'escalation',
    title: '⏰ Leave Approval Reminder',
    message: `A ${data.leaveType} leave request from ${data.staffName} (${data.days} days) has been pending for ${Math.floor(data.hoursPending / 24)} day(s). Please review and take action.`,
    link: `${portalUrl}/leaves/${data.leaveRequestId}`,
    priority: 'urgent',
    metadata: {
      leaveRequestId: data.leaveRequestId,
      level: data.level,
      hoursPending: data.hoursPending,
    },
  })

  // Also notify HR if pending for more than 3 days
  if (data.hoursPending >= 72) {
    const hrUsers = await prisma.user.findMany({
      where: {
        role: { in: ['HR_OFFICER', 'HR_DIRECTOR'] },
        active: true,
      },
    })

    for (const hrUser of hrUsers) {
      await sendNotification({
        userId: hrUser.id,
        type: 'escalation',
        title: '🚨 Escalated Leave Request',
        message: `Leave request from ${data.staffName} has been pending for ${Math.floor(data.hoursPending / 24)} day(s) at Level ${data.level}. Please follow up.`,
        link: `${portalUrl}/leaves/${data.leaveRequestId}`,
        priority: 'urgent',
      })
    }
  }
}

/**
 * Check and send escalation reminders for pending approvals
 * This should be run as a scheduled job (cron)
 */
export async function checkAndSendEscalationReminders(): Promise<void> {
  const now = new Date()
  const pendingLeaves = await prisma.leaveRequest.findMany({
    where: {
      status: 'pending',
      createdAt: {
        lte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // At least 24 hours old
      },
    },
    include: {
      staff: true,
    },
  })

  for (const leave of pendingLeaves) {
    const approvalLevels = (leave.approvalLevels as any[]) || []
    const pendingLevel = approvalLevels.find((level: any) => level.status === 'pending')

    if (pendingLevel) {
      const hoursPending = (now.getTime() - leave.createdAt.getTime()) / (1000 * 60 * 60)
      
      // Send reminder if pending for 24+ hours
      if (hoursPending >= 24) {
        // Find approver for this level
        const approverRole = pendingLevel.approverRole
        const approvers = await prisma.user.findMany({
          where: {
            role: approverRole,
            active: true,
          },
          include: { staff: true },
        })

        for (const approver of approvers) {
          await sendEscalationReminder({
            leaveRequestId: leave.id,
            staffId: leave.staffId,
            staffName: leave.staffName,
            leaveType: leave.leaveType,
            days: leave.days,
            pendingSince: leave.createdAt,
            approverId: approver.id,
            approverName: approver.staff ? `${approver.staff.firstName} ${approver.staff.lastName}` : approver.email,
            level: pendingLevel.level,
            hoursPending,
          })
        }
      }
    }
  }
}

/**
 * Send policy threshold alert
 */
export async function sendPolicyThresholdAlert(data: {
  staffId: string
  staffName: string
  leaveType: string
  threshold: number
  currentUsage: number
  alertType: 'warning' | 'critical'
}): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { staffId: data.staffId },
  })

  if (!user) return

  const portalUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const percentage = (data.currentUsage / data.threshold) * 100
  const emoji = data.alertType === 'critical' ? '🚨' : '⚠️'

  await sendNotification({
    userId: user.id,
    staffId: data.staffId,
    type: 'system',
    title: `${emoji} Leave Usage Alert`,
    message: `You have used ${percentage.toFixed(1)}% of your ${data.leaveType} leave entitlement (${data.currentUsage}/${data.threshold} days).`,
    link: `${portalUrl}/leaves/balance`,
    priority: data.alertType === 'critical' ? 'urgent' : 'high',
    metadata: {
      leaveType: data.leaveType,
      threshold: data.threshold,
      currentUsage: data.currentUsage,
      percentage,
    },
  })
}

