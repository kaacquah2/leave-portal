/**
 * Email Service
 * Handles sending emails via SMTP
 */

/**
 * Get the application URL for email links
 * Handles Vercel deployment and local development
 */
export function getAppUrl(): string {
  // Priority 1: Use NEXT_PUBLIC_APP_URL if set and not localhost
  const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL
  if (publicAppUrl && !publicAppUrl.includes('localhost') && !publicAppUrl.includes('127.0.0.1')) {
    return publicAppUrl
  }

  // Priority 2: Use VERCEL_URL (automatically set by Vercel)
  // VERCEL_URL doesn't include protocol, so we need to add https://
  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl) {
    // VERCEL_URL format: your-app.vercel.app (no protocol)
    // Add https:// if not already present
    if (vercelUrl.startsWith('http://') || vercelUrl.startsWith('https://')) {
      return vercelUrl
    }
    return `https://${vercelUrl}`
  }

  // Priority 3: Fallback to NEXT_PUBLIC_APP_URL even if localhost (for development)
  if (publicAppUrl) {
    return publicAppUrl
  }

  // Last resort: throw error
  throw new Error('NEXT_PUBLIC_APP_URL or VERCEL_URL must be set in environment variables')
}

interface EmailConfig {
  host: string
  port: number
  secure: boolean // true for 465, false for other ports
  auth: {
    user: string
    pass: string
  }
  from: string
  fromName: string
}

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Get email configuration from environment variables or system settings
 */
async function getEmailConfig(): Promise<EmailConfig | null> {
  // First try environment variables
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  ) {
    return {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      fromName: process.env.SMTP_FROM_NAME || 'HR Leave Portal',
    }
  }

  // TODO: Load from SystemSettings database table
  // This would allow admin to configure email settings via UI
  // For now, return null if not configured
  return null
}

/**
 * Send email using configured SMTP settings
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const config = await getEmailConfig()

    if (!config) {
      console.warn('Email not configured. Set SMTP environment variables or configure via admin panel.')
      return false
    }

    // Use nodemailer if available, otherwise log for development
    // In production, you should install: npm install nodemailer @types/nodemailer
    try {
      const nodemailer = require('nodemailer')

      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.auth,
      })

      const mailOptions = {
        from: `"${config.fromName}" <${config.from}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''),
      }

      const info = await transporter.sendMail(mailOptions)
      console.log('Email sent:', info.messageId)
      return true
    } catch (error) {
      // If nodemailer is not installed, log the email for development
      if (error && typeof error === 'object' && 'code' in error && error.code === 'MODULE_NOT_FOUND') {
        console.log('=== EMAIL (Development Mode - nodemailer not installed) ===')
        console.log('To:', options.to)
        console.log('Subject:', options.subject)
        console.log('Body:', options.html)
        console.log('========================================================')
        return true // Return true in dev mode
      }
      throw error
    }
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
}

/**
 * Generate password reset email HTML template
 */
export function generatePasswordResetEmail(resetLink: string, userName?: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #4F46E5;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: #f9fafb;
          padding: 30px;
          border: 1px solid #e5e7eb;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #4F46E5;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #6b7280;
          font-size: 12px;
        }
        .warning {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 12px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Password Reset Request</h1>
        <p>Ministry of Fisheries & Aquaculture Development</p>
      </div>
      
      <div class="content">
        <p>Hello${userName ? ` ${userName}` : ''},</p>
        
        <p>We received a request to reset your password for your HR Leave Portal account.</p>
        
        <p>Click the button below to reset your password:</p>
        
        <div style="text-align: center;">
          <a href="${resetLink}" class="button">Reset Password</a>
        </div>
        
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #4F46E5;">${resetLink}</p>
        
        <div class="warning">
          <strong>⚠️ Security Notice:</strong>
          <ul>
            <li>This link will expire in 1 hour</li>
            <li>If you didn't request this, please ignore this email</li>
            <li>Never share this link with anyone</li>
          </ul>
        </div>
        
        <p>If you continue to have problems, please contact HR for assistance.</p>
      </div>
      
      <div class="footer">
        <p>This is an automated email. Please do not reply.</p>
        <p>© ${new Date().getFullYear()} Ministry of Fisheries & Aquaculture Development, Ghana</p>
      </div>
    </body>
    </html>
  `
}

/**
 * Generate password reset success email
 */
export function generatePasswordResetSuccessEmail(userName?: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #10b981;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: #f9fafb;
          padding: 30px;
          border: 1px solid #e5e7eb;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #6b7280;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Password Reset Successful</h1>
      </div>
      
      <div class="content">
        <p>Hello${userName ? ` ${userName}` : ''},</p>
        
        <p>Your password has been successfully reset.</p>
        
        <p>If you did not make this change, please contact HR immediately.</p>
      </div>
      
      <div class="footer">
        <p>This is an automated email. Please do not reply.</p>
        <p>© ${new Date().getFullYear()} Ministry of Fisheries & Aquaculture Development, Ghana</p>
      </div>
    </body>
    </html>
  `
}

/**
 * Generate new user account credentials email
 */
export function generateNewUserCredentialsEmail(
  email: string,
  password: string,
  loginUrl: string,
  userName?: string,
  staffId?: string,
  role?: string
): string {
  const roleDisplay = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Employee'
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #4F46E5;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: #f9fafb;
          padding: 30px;
          border: 1px solid #e5e7eb;
        }
        .credentials-box {
          background-color: #ffffff;
          border: 2px solid #e5e7eb;
          border-radius: 6px;
          padding: 20px;
          margin: 20px 0;
        }
        .credential-item {
          margin: 12px 0;
          padding: 10px;
          background-color: #f3f4f6;
          border-radius: 4px;
        }
        .credential-label {
          font-weight: bold;
          color: #6b7280;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .credential-value {
          font-size: 16px;
          color: #111827;
          font-family: 'Courier New', monospace;
          word-break: break-all;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #4F46E5;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
        }
        .warning {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 12px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .info {
          background-color: #dbeafe;
          border-left: 4px solid #3b82f6;
          padding: 12px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #6b7280;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Welcome to HR Leave Portal</h1>
        <p>Ministry of Fisheries & Aquaculture Development</p>
      </div>
      
      <div class="content">
        <p>Hello${userName ? ` ${userName}` : ''},</p>
        
        <p>Your account has been created for the HR Leave Portal system. Below are your login credentials:</p>
        
        <div class="credentials-box">
          <div class="credential-item">
            <div class="credential-label">Email Address</div>
            <div class="credential-value">${email}</div>
          </div>
          <div class="credential-item">
            <div class="credential-label">Password</div>
            <div class="credential-value">${password}</div>
          </div>
          ${staffId ? `
          <div class="credential-item">
            <div class="credential-label">Staff ID</div>
            <div class="credential-value">${staffId}</div>
          </div>
          ` : ''}
          <div class="credential-item">
            <div class="credential-label">Role</div>
            <div class="credential-value">${roleDisplay}</div>
          </div>
        </div>
        
        <div style="text-align: center;">
          <a href="${loginUrl}" class="button">Login to Portal</a>
        </div>
        
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #4F46E5;">${loginUrl}</p>
        
        <div class="warning">
          <strong>⚠️ Security Notice:</strong>
          <ul style="margin: 8px 0; padding-left: 20px;">
            <li>Please change your password immediately after your first login</li>
            <li>Never share your login credentials with anyone</li>
            <li>Keep your password secure and confidential</li>
            <li>If you suspect unauthorized access, contact HR immediately</li>
          </ul>
        </div>
        
        <div class="info">
          <strong>ℹ️ First Time Login:</strong>
          <ul style="margin: 8px 0; padding-left: 20px;">
            <li>Use the credentials above to log in</li>
            <li>You will be prompted to change your password</li>
            <li>Choose a strong password (minimum 8 characters)</li>
            <li>Contact HR if you encounter any issues</li>
          </ul>
        </div>
        
        <p>If you have any questions or need assistance, please contact the HR department.</p>
        
        <p>Welcome aboard!</p>
      </div>
      
      <div class="footer">
        <p>This is an automated email. Please do not reply.</p>
        <p>© ${new Date().getFullYear()} Ministry of Fisheries & Aquaculture Development, Ghana</p>
        <p>This email contains sensitive information. Please keep it secure.</p>
      </div>
    </body>
    </html>
  `
}

/**
 * Generate leave request submitted email (to manager/HR)
 */
export function generateLeaveRequestSubmittedEmail(
  staffName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  days: number,
  reason: string,
  leaveId: string,
  portalUrl: string,
  recipientName?: string
): string {
  const formattedStartDate = new Date(startDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
  const formattedEndDate = new Date(endDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
  const viewUrl = `${portalUrl}/leaves/${leaveId}`

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #3b82f6;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: #f9fafb;
          padding: 30px;
          border: 1px solid #e5e7eb;
        }
        .leave-details {
          background-color: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 20px;
          margin: 20px 0;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: bold;
          color: #6b7280;
        }
        .detail-value {
          color: #111827;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #3b82f6;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #6b7280;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>New Leave Request Submitted</h1>
        <p>Ministry of Fisheries & Aquaculture Development</p>
      </div>
      
      <div class="content">
        <p>Hello${recipientName ? ` ${recipientName}` : ''},</p>
        
        <p><strong>${staffName}</strong> has submitted a new leave request that requires your review.</p>
        
        <div class="leave-details">
          <div class="detail-row">
            <span class="detail-label">Leave Type:</span>
            <span class="detail-value">${leaveType}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Start Date:</span>
            <span class="detail-value">${formattedStartDate}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">End Date:</span>
            <span class="detail-value">${formattedEndDate}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Duration:</span>
            <span class="detail-value">${days} day${days !== 1 ? 's' : ''}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Reason:</span>
            <span class="detail-value">${reason}</span>
          </div>
        </div>
        
        <div style="text-align: center;">
          <a href="${viewUrl}" class="button">Review Leave Request</a>
        </div>
        
        <p>Please review and approve or reject this leave request at your earliest convenience.</p>
      </div>
      
      <div class="footer">
        <p>This is an automated email. Please do not reply.</p>
        <p>© ${new Date().getFullYear()} Ministry of Fisheries & Aquaculture Development, Ghana</p>
      </div>
    </body>
    </html>
  `
}

/**
 * Generate leave request approved email (to employee)
 */
export function generateLeaveRequestApprovedEmail(
  staffName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  days: number,
  approvedBy: string,
  leaveId: string,
  portalUrl: string
): string {
  const formattedStartDate = new Date(startDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
  const formattedEndDate = new Date(endDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
  const viewUrl = `${portalUrl}/leaves/${leaveId}`

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #10b981;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: #f9fafb;
          padding: 30px;
          border: 1px solid #e5e7eb;
        }
        .leave-details {
          background-color: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 20px;
          margin: 20px 0;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: bold;
          color: #6b7280;
        }
        .detail-value {
          color: #111827;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #10b981;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
        }
        .success-box {
          background-color: #d1fae5;
          border-left: 4px solid #10b981;
          padding: 12px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #6b7280;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>✓ Leave Request Approved</h1>
        <p>Ministry of Fisheries & Aquaculture Development</p>
      </div>
      
      <div class="content">
        <p>Hello ${staffName},</p>
        
        <div class="success-box">
          <strong>Great news!</strong> Your leave request has been approved by ${approvedBy}.
        </div>
        
        <div class="leave-details">
          <div class="detail-row">
            <span class="detail-label">Leave Type:</span>
            <span class="detail-value">${leaveType}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Start Date:</span>
            <span class="detail-value">${formattedStartDate}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">End Date:</span>
            <span class="detail-value">${formattedEndDate}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Duration:</span>
            <span class="detail-value">${days} day${days !== 1 ? 's' : ''}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Approved By:</span>
            <span class="detail-value">${approvedBy}</span>
          </div>
        </div>
        
        <div style="text-align: center;">
          <a href="${viewUrl}" class="button">View Leave Details</a>
        </div>
        
        <p>You can download your approval letter from the portal. Have a great time off!</p>
      </div>
      
      <div class="footer">
        <p>This is an automated email. Please do not reply.</p>
        <p>© ${new Date().getFullYear()} Ministry of Fisheries & Aquaculture Development, Ghana</p>
      </div>
    </body>
    </html>
  `
}

/**
 * Generate leave request rejected email (to employee)
 */
export function generateLeaveRequestRejectedEmail(
  staffName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  days: number,
  rejectedBy: string,
  comments?: string,
  leaveId?: string,
  portalUrl?: string
): string {
  const formattedStartDate = new Date(startDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
  const formattedEndDate = new Date(endDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
  const viewUrl = portalUrl && leaveId ? `${portalUrl}/leaves/${leaveId}` : portalUrl || '#'

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #ef4444;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: #f9fafb;
          padding: 30px;
          border: 1px solid #e5e7eb;
        }
        .leave-details {
          background-color: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 20px;
          margin: 20px 0;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: bold;
          color: #6b7280;
        }
        .detail-value {
          color: #111827;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #3b82f6;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
        }
        .rejection-box {
          background-color: #fee2e2;
          border-left: 4px solid #ef4444;
          padding: 12px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .comments-box {
          background-color: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 15px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #6b7280;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Leave Request Rejected</h1>
        <p>Ministry of Fisheries & Aquaculture Development</p>
      </div>
      
      <div class="content">
        <p>Hello ${staffName},</p>
        
        <div class="rejection-box">
          <strong>We regret to inform you</strong> that your leave request has been rejected by ${rejectedBy}.
        </div>
        
        <div class="leave-details">
          <div class="detail-row">
            <span class="detail-label">Leave Type:</span>
            <span class="detail-value">${leaveType}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Start Date:</span>
            <span class="detail-value">${formattedStartDate}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">End Date:</span>
            <span class="detail-value">${formattedEndDate}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Duration:</span>
            <span class="detail-value">${days} day${days !== 1 ? 's' : ''}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Rejected By:</span>
            <span class="detail-value">${rejectedBy}</span>
          </div>
        </div>
        
        ${comments ? `
        <div class="comments-box">
          <strong>Comments from ${rejectedBy}:</strong>
          <p style="margin-top: 8px;">${comments}</p>
        </div>
        ` : ''}
        
        ${viewUrl !== '#' ? `
        <div style="text-align: center;">
          <a href="${viewUrl}" class="button">View Leave Details</a>
        </div>
        ` : ''}
        
        <p>If you have any questions about this decision, please contact your manager or HR department.</p>
      </div>
      
      <div class="footer">
        <p>This is an automated email. Please do not reply.</p>
        <p>© ${new Date().getFullYear()} Ministry of Fisheries & Aquaculture Development, Ghana</p>
      </div>
    </body>
    </html>
  `
}

/**
 * Generate system announcement email
 */
export function generateSystemAnnouncementEmail(
  title: string,
  message: string,
  recipientName?: string,
  portalUrl?: string,
  actionUrl?: string,
  actionText?: string
): string {
  const appUrl = portalUrl || process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
  if (!appUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL or VERCEL_URL must be set in environment variables')
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #4F46E5;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: #f9fafb;
          padding: 30px;
          border: 1px solid #e5e7eb;
        }
        .announcement-box {
          background-color: #ffffff;
          border: 2px solid #4F46E5;
          border-radius: 6px;
          padding: 20px;
          margin: 20px 0;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #4F46E5;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #6b7280;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${title}</h1>
        <p>Ministry of Fisheries & Aquaculture Development</p>
      </div>
      
      <div class="content">
        <p>Hello${recipientName ? ` ${recipientName}` : ''},</p>
        
        <div class="announcement-box">
          ${message.split('\n').map(para => `<p>${para}</p>`).join('')}
        </div>
        
        ${actionUrl && actionText ? `
        <div style="text-align: center;">
          <a href="${actionUrl}" class="button">${actionText}</a>
        </div>
        ` : ''}
        
        <p style="margin-top: 20px;">Thank you for your attention.</p>
      </div>
      
      <div class="footer">
        <p>This is an automated email. Please do not reply.</p>
        <p>© ${new Date().getFullYear()} Ministry of Fisheries & Aquaculture Development, Ghana</p>
      </div>
    </body>
    </html>
  `
}

/**
 * Helper function to send system announcements to all users or specific roles
 */
export async function sendSystemAnnouncement(
  title: string,
  message: string,
  recipientEmails: string[],
  portalUrl?: string,
  actionUrl?: string,
  actionText?: string
): Promise<{ sent: number; failed: number }> {
  const results = { sent: 0, failed: 0 }
  const appUrl = portalUrl || process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
  if (!appUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL or VERCEL_URL must be set in environment variables')
  }

  for (const email of recipientEmails) {
    const html = generateSystemAnnouncementEmail(title, message, undefined, appUrl, actionUrl, actionText)
    const success = await sendEmail({
      to: email,
      subject: title,
      html,
    })
    
    if (success) {
      results.sent++
    } else {
      results.failed++
    }
  }

  return results
}

