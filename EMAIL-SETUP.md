# Email Service Setup Guide
## Password Reset & Notification Emails

This guide explains how to configure the email service for password reset and notification emails.

**💰 No Domain? No Problem!** This guide includes free options that work without a custom domain.

---

## 📧 Email Service Overview

The application uses **nodemailer** for sending emails via SMTP. The email service supports:
- Password reset emails
- Password reset success notifications
- Leave approval/rejection notifications (future)
- System notifications (future)

---

## 🆓 Free Email Options (No Domain Required)

### Option 1: Gmail (Recommended for Free Setup) ⭐

**Best for:** Development, testing, and small organizations

**Pros:**
- ✅ Completely free
- ✅ No domain needed
- ✅ Easy to set up
- ✅ Reliable delivery
- ✅ 500 emails/day limit (usually enough for HR portal)

**Cons:**
- ⚠️ Shows "via gmail.com" in some email clients
- ⚠️ 500 emails/day limit

**Setup:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM=your-email@gmail.com
SMTP_FROM_NAME=HR Leave Portal
```

**See "Gmail Setup" section below for detailed instructions.**

---

### Option 2: SendGrid Free Tier (Best for Production)

**Best for:** Production use, better deliverability

**Pros:**
- ✅ Free tier: 100 emails/day forever
- ✅ Professional email delivery
- ✅ Better deliverability than Gmail
- ✅ Analytics and tracking
- ✅ No domain required initially

**Cons:**
- ⚠️ Need to verify sender email
- ⚠️ 100 emails/day limit on free tier

**Setup:**
1. Sign up at [sendgrid.com](https://sendgrid.com) (free)
2. Create API Key in Settings → API Keys
3. Verify your email address

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key-here
SMTP_FROM=your-verified-email@gmail.com
SMTP_FROM_NAME=HR Leave Portal
```

---

### Option 3: Resend (Modern Alternative)

**Best for:** Modern apps, great developer experience

**Pros:**
- ✅ Free tier: 3,000 emails/month
- ✅ Very easy setup
- ✅ Great documentation
- ✅ Modern API

**Cons:**
- ⚠️ Need to verify domain (but can use personal email for testing)

**Setup:**
1. Sign up at [resend.com](https://resend.com) (free)
2. Get API key
3. Verify your email

```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=resend
SMTP_PASS=your-resend-api-key
SMTP_FROM=your-verified-email@gmail.com
SMTP_FROM_NAME=HR Leave Portal
```

---

### Option 4: Brevo (Formerly Sendinblue)

**Best for:** Higher volume needs

**Pros:**
- ✅ Free tier: 300 emails/day
- ✅ Good deliverability
- ✅ Marketing + transactional emails

**Cons:**
- ⚠️ Need to verify sender

**Setup:**
1. Sign up at [brevo.com](https://www.brevo.com) (free)
2. Get SMTP credentials from Settings → SMTP & API

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-brevo-email@example.com
SMTP_PASS=your-brevo-smtp-key
SMTP_FROM=your-verified-email@gmail.com
SMTP_FROM_NAME=HR Leave Portal
```

---

## 🔧 Configuration Methods

### Method 1: Environment Variables (Recommended)

Add these environment variables to your `.env` file:

**For Gmail (Free, No Domain):**
```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
SMTP_FROM_NAME=HR Leave Portal

# Application URL (for password reset links)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**For SendGrid (Free Tier):**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=your-verified-email@gmail.com
SMTP_FROM_NAME=HR Leave Portal
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Method 2: Admin Panel Configuration (Future)

Email settings can also be configured through the Admin System Settings page. This allows non-technical administrators to update email settings without code changes.

---

## 📦 Installation

Install nodemailer (if not already installed):

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

---

## 🔐 Gmail Setup (Free, No Domain Required) ⭐ RECOMMENDED

**This is the easiest free option!** Perfect for getting started without a domain.

### Step-by-Step Setup:

1. **Use a Gmail Account**
   - Use your personal Gmail or create a new one for the organization
   - Example: `mofa.hr.portal@gmail.com`

2. **Enable 2-Step Verification**
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Click "2-Step Verification"
   - Follow the setup process (uses your phone)

3. **Generate App Password**
   - Go to [Google Account → App Passwords](https://myaccount.google.com/apppasswords)
   - Or: Security → 2-Step Verification → App passwords
   - Select "Mail" and "Other (Custom name)"
   - Enter name: "HR Leave Portal"
   - Click "Generate"
   - **Copy the 16-character password** (spaces don't matter)

4. **Add to .env file:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=mofa.hr.portal@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
SMTP_FROM=mofa.hr.portal@gmail.com
SMTP_FROM_NAME=HR Leave Portal - MoFA
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

5. **Test it!**
   - Try the password reset flow
   - Check your Gmail inbox

**Note:** The "from" address will show as your Gmail address. This is fine for internal use!

---

## 📮 SendGrid Free Tier Setup (Better for Production)

**Best if you want better deliverability and don't mind a small setup.**

### Step-by-Step:

1. **Sign Up** at [sendgrid.com](https://signup.sendgrid.com/) (free)
2. **Verify Your Email** (they'll send a verification email)
3. **Create API Key:**
   - Go to Settings → API Keys
   - Click "Create API Key"
   - Name it "HR Portal"
   - Select "Full Access" or "Mail Send" permissions
   - **Copy the key immediately** (you won't see it again!)

4. **Verify Sender:**
   - Go to Settings → Sender Authentication
   - Click "Verify a Single Sender"
   - Enter your email and verify it

5. **Add to .env:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.your-actual-api-key-here
SMTP_FROM=your-verified-email@gmail.com
SMTP_FROM_NAME=HR Leave Portal
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Free Tier Limits:**
- 100 emails/day
- Perfect for HR portal (usually < 50 emails/day)

---

## 📮 Office 365 / Outlook Setup

**Office 365 SMTP Settings:**
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yourdomain.com
SMTP_PASS=your-password
```

---

## 🏢 Custom SMTP Server Setup

For custom SMTP servers (e.g., SendGrid, Mailgun, AWS SES):

### SendGrid Example:
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=noreply@yourdomain.com
```

### Mailgun Example:
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@yourdomain.mailgun.org
SMTP_PASS=your-mailgun-password
```

---

## 🧪 Testing Email Configuration

### Development Mode

If nodemailer is not installed or email is not configured, the system will:
- Log email content to the console (development only)
- Return success (so the flow continues)
- Not actually send emails

This allows development without email setup.

### Production Mode

In production, ensure:
1. ✅ Nodemailer is installed
2. ✅ All SMTP environment variables are set
3. ✅ Test email connection from Admin panel
4. ✅ Verify password reset emails are received

---

## 🔄 Password Reset Flow

1. **User requests password reset** → `POST /api/auth/reset-password`
2. **System generates secure token** → Stored in database with 1-hour expiration
3. **Email sent with reset link** → `https://your-domain.com/reset-password?token=xxx`
4. **User clicks link** → Opens reset password page
5. **User enters new password** → `PUT /api/auth/reset-password`
6. **Password updated** → Token marked as used
7. **Success email sent** → Confirmation to user

---

## 🛡️ Security Features

- ✅ Tokens expire after 1 hour
- ✅ Tokens are single-use (marked as used after password reset)
- ✅ Secure random token generation (32 bytes)
- ✅ Password hashing with bcrypt
- ✅ Audit logging for all password reset attempts
- ✅ No user enumeration (same response for existing/non-existing emails)

---

## 📝 Email Templates

Email templates are located in `lib/email.ts`:
- `generatePasswordResetEmail()` - Password reset request
- `generatePasswordResetSuccessEmail()` - Password reset confirmation

Templates can be customized to match your organization's branding.

---

## 🐛 Troubleshooting

### Emails not sending?

1. **Check environment variables** are set correctly
2. **Verify SMTP credentials** are correct
3. **Check firewall/network** allows SMTP connections
4. **Review server logs** for error messages
5. **Test SMTP connection** from Admin panel

### "MODULE_NOT_FOUND" error?

Install nodemailer:
```bash
npm install nodemailer @types/nodemailer
```

### Gmail "Less secure app" error?

Use App Passwords instead of regular password (see Gmail Setup above).

### Port 587 blocked?

Try port 465 with SSL:
```env
SMTP_PORT=465
SMTP_SECURE=true
```

---

## 📚 Additional Resources

- [Nodemailer Documentation](https://nodemailer.com/about/)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- [SMTP Ports Guide](https://www.socketlabs.com/blog/smtp-ports/)

---

## ✅ Checklist

Before going to production:

- [ ] Install nodemailer
- [ ] Set all SMTP environment variables
- [ ] Test password reset flow end-to-end
- [ ] Verify emails are received
- [ ] Check spam folder (if emails not received)
- [ ] Configure SPF/DKIM records (for better deliverability)
- [ ] Set up email monitoring/alerts
- [ ] Document email configuration for team

---

**Last Updated**: 2024

