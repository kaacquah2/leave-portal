# Password Reset & Two-Factor Authentication (2FA) Documentation

## 📋 Table of Contents
1. [Password Reset System](#password-reset-system)
2. [Two-Factor Authentication (2FA)](#two-factor-authentication-2fa)
3. [Security Features](#security-features)
4. [API Endpoints](#api-endpoints)
5. [User Flows](#user-flows)

---

## 🔐 Password Reset System

### Overview
The password reset system allows users to securely reset their passwords through email-based token verification. It includes both user-initiated and admin-initiated password resets.

### Components

#### 1. **User-Initiated Password Reset** (`/api/auth/forgot-password`)

**Flow:**
1. User submits their email address
2. System checks if user exists and is active
3. Creates a password reset token (valid for 1 hour)
4. Creates a password reset request record
5. Sends email with reset link
6. Always returns success (prevents email enumeration attacks)

**Security Features:**
- ✅ Email enumeration prevention (always returns success)
- ✅ Token expires after 1 hour
- ✅ One-time use tokens
- ✅ IP address and user agent tracking
- ✅ Audit logging

**Email Sent:**
- Contains reset link: `/reset-password?token={token}`
- Token is a 64-character hexadecimal string

#### 2. **Password Reset Execution** (`/api/auth/reset-password`)

**Flow:**
1. User clicks reset link with token
2. System validates token (not expired, not used)
3. Validates new password complexity
4. Checks password history (prevents reuse of last 5 passwords)
5. Verifies new password is different from current
6. Hashes and stores new password
7. Marks token as used
8. Deletes all user sessions (forces re-login)
9. Sets password expiry (90 days)
10. Sends confirmation email
11. Creates audit log

**Password Requirements (Ghana Government Compliance):**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Cannot reuse last 5 passwords
- Must be different from current password

**Token Validation:**
- Token must exist in database
- Token must not be expired (1 hour limit)
- Token must not have been used before
- Expired tokens are automatically deleted

#### 3. **Admin-Initiated Password Reset** (`/api/admin/password-reset-requests`)

**Features:**
- Admins/HR can create password reset requests for users
- Can auto-approve requests (immediately sends reset email)
- Can manually approve/reject pending requests
- Tracks approval/rejection with reasons
- Full audit trail

**Request States:**
- `pending` - Awaiting admin approval
- `approved` - Approved, reset email sent
- `rejected` - Rejected by admin
- `completed` - Password successfully reset

**Admin Dashboard:**
- View all password reset requests
- Filter by status (all, pending, approved, rejected, completed)
- Approve/reject requests
- View reset tokens
- See request history with timestamps

### Database Schema

**PasswordResetToken:**
```prisma
- id: string
- userId: string
- token: string (unique, indexed)
- expiresAt: DateTime
- used: boolean
- createdAt: DateTime
```

**PasswordResetRequest:**
```prisma
- id: string
- userId: string
- email: string
- status: enum (pending, approved, rejected, completed)
- requestedAt: DateTime
- approvedAt: DateTime?
- approvedBy: string?
- rejectedAt: DateTime?
- rejectedBy: string?
- rejectionReason: string?
- resetToken: string?
- tokenExpiresAt: DateTime?
- ip: string?
- userAgent: string?
```

### Security Measures

1. **Token Generation:**
   - 64-character random hexadecimal string
   - Cryptographically secure random bytes
   - One token per user (old tokens deleted)

2. **Token Expiration:**
   - 1-hour validity window
   - Automatic cleanup of expired tokens

3. **Password History:**
   - Tracks last 5 password hashes
   - Prevents password reuse
   - Stored securely (hashed)

4. **Session Management:**
   - All sessions deleted on password reset
   - Forces re-authentication
   - Prevents unauthorized access

5. **Audit Logging:**
   - All password reset actions logged
   - IP address tracking
   - User agent tracking
   - Timestamp recording

---

## 🔒 Two-Factor Authentication (2FA)

### Overview
Two-Factor Authentication adds an extra layer of security by requiring users to provide a time-based one-time password (TOTP) from an authenticator app in addition to their password.

### Technology Stack
- **Library:** `otplib` (RFC 6238 TOTP standard)
- **QR Code:** `qrcode` library
- **Algorithm:** TOTP (Time-based One-Time Password)
- **Code Format:** 6-digit numeric codes
- **Time Window:** 30 seconds (standard)

### Setup Flow

#### Step 1: Generate Secret (`/api/auth/2fa/generate`)

**What Happens:**
1. User clicks "Enable 2FA" in admin dashboard
2. System generates a unique secret key
3. Generates 10 backup codes (8-character hexadecimal)
4. Stores secret and backup codes (but doesn't enable yet)
5. Returns secret and backup codes to frontend

**Security:**
- Secret is generated using `authenticator.generateSecret()`
- Backup codes are cryptographically random
- Secret stored in database (encrypted at rest if database supports it)
- 2FA not enabled until verification step

#### Step 2: QR Code Generation

**Frontend Process:**
1. Receives secret from API
2. Generates QR code using format:
   ```
   otpauth://totp/HR%20Leave%20Portal:{email}?secret={secret}&issuer=HR%20Leave%20Portal
   ```
3. Displays QR code for scanning
4. Also shows manual entry option (secret key)

**User Action:**
- Scan QR code with authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.)
- Or manually enter the secret key

#### Step 3: Verification (`/api/auth/2fa/verify`)

**What Happens:**
1. User enters 6-digit code from authenticator app
2. System verifies code using `authenticator.verify()`
3. If valid, enables 2FA for user
4. Returns backup codes (if not already shown)
5. Creates audit log

**Verification Process:**
```typescript
authenticator.verify({
  token: code,           // 6-digit code from user
  secret: secret,        // Stored secret key
})
```

**Time Synchronization:**
- TOTP codes are time-based
- Both server and authenticator app must have synchronized clocks
- Standard tolerance: ±1 time window (30 seconds)

#### Step 4: Enabled State

**After Verification:**
- `twoFactorEnabled: true` in database
- User must provide 2FA code on login (when implemented)
- Backup codes available for recovery
- Can disable 2FA at any time

### Backup Codes

**Purpose:**
- Recovery mechanism if user loses authenticator device
- One-time use codes
- 10 codes generated per setup

**Format:**
- 8-character hexadecimal (e.g., `A1B2C3D4`)
- Uppercase letters and numbers
- Cryptographically random

**Usage:**
- Can be used instead of TOTP code
- Should be stored securely by user
- Can be regenerated (disables old codes)

### Disable 2FA (`/api/auth/2fa/disable`)

**Process:**
1. User confirms they want to disable 2FA
2. System sets `twoFactorEnabled: false`
3. Secret and backup codes are kept (for potential re-enablement)
4. Creates audit log

**Note:** Secret and backup codes are NOT deleted, allowing user to re-enable without full setup.

### Status Check (`/api/auth/2fa/status`)

**Returns:**
- `enabled`: boolean - Whether 2FA is active
- `hasSecret`: boolean - Whether secret exists
- `hasBackupCodes`: boolean - Whether backup codes exist
- `backupCodesCount`: number - Number of backup codes

### Database Schema

**User Model (2FA Fields):**
```prisma
- twoFactorEnabled: boolean (default: false)
- twoFactorSecret: string? (encrypted secret key)
- twoFactorBackupCodes: string[] (array of backup codes)
```

### Security Features

1. **Secret Generation:**
   - Cryptographically secure random generation
   - Unique per user
   - Never exposed in API responses after initial generation

2. **Code Verification:**
   - Time-based validation (30-second windows)
   - Prevents replay attacks
   - Standard TOTP algorithm (RFC 6238)

3. **Backup Codes:**
   - One-time use (should be marked as used when implemented)
   - Cryptographically random
   - User responsibility to store securely

4. **Audit Logging:**
   - All 2FA actions logged
   - Enable/disable events tracked
   - Secret generation logged

### Current Implementation Status

**✅ Implemented:**
- 2FA secret generation
- QR code generation
- Code verification
- Enable/disable 2FA
- Backup codes generation
- Status checking
- UI components

**⚠️ Not Yet Implemented:**
- 2FA verification during login flow
- Backup code usage during login
- Backup code invalidation after use
- 2FA recovery process

**Note:** The login route (`/api/auth/login`) currently does NOT check for 2FA. This needs to be added to require 2FA codes during login for users who have 2FA enabled.

---

## 🔐 Security Features

### Password Reset Security

1. **Email Enumeration Prevention:**
   - Always returns success message
   - Doesn't reveal if email exists in system

2. **Token Security:**
   - Cryptographically random tokens
   - Short expiration (1 hour)
   - One-time use only
   - Automatic cleanup

3. **Password Policy:**
   - Complexity requirements
   - History tracking (last 5 passwords)
   - 90-day expiration
   - First-login password change requirement

4. **Session Security:**
   - All sessions invalidated on password reset
   - Forces re-authentication
   - Prevents unauthorized access

### 2FA Security

1. **Standard Compliance:**
   - RFC 6238 TOTP standard
   - Compatible with all major authenticator apps
   - Time-based codes (30-second windows)

2. **Secret Management:**
   - Never exposed after initial generation
   - Stored securely in database
   - Unique per user

3. **Backup Codes:**
   - One-time use (when implemented)
   - Cryptographically random
   - User-controlled storage

---

## 📡 API Endpoints

### Password Reset Endpoints

#### `POST /api/auth/forgot-password`
**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

#### `POST /api/auth/reset-password`
**Request:**
```json
{
  "token": "abc123...",
  "newPassword": "NewSecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

#### `GET /api/admin/password-reset-requests?status=pending`
**Response:**
```json
{
  "success": true,
  "requests": [...],
  "total": 10,
  "limit": 50,
  "offset": 0
}
```

#### `POST /api/admin/password-reset-requests`
**Request:**
```json
{
  "email": "user@example.com",
  "autoApprove": true
}
```

#### `PATCH /api/admin/password-reset-requests`
**Request:**
```json
{
  "id": "request-id",
  "action": "approve" | "reject",
  "rejectionReason": "Optional reason"
}
```

### 2FA Endpoints

#### `GET /api/auth/2fa/status`
**Response:**
```json
{
  "enabled": true,
  "hasSecret": true,
  "hasBackupCodes": true,
  "backupCodesCount": 10
}
```

#### `POST /api/auth/2fa/generate`
**Response:**
```json
{
  "success": true,
  "secret": "JBSWY3DPEHPK3PXP",
  "backupCodes": ["A1B2C3D4", "E5F6G7H8", ...],
  "email": "user@example.com",
  "message": "2FA secret generated. Please verify to enable."
}
```

#### `POST /api/auth/2fa/verify`
**Request:**
```json
{
  "code": "123456",
  "secret": "JBSWY3DPEHPK3PXP"
}
```

**Response:**
```json
{
  "success": true,
  "enabled": true,
  "backupCodes": ["A1B2C3D4", ...],
  "message": "Two-factor authentication has been enabled"
}
```

#### `POST /api/auth/2fa/disable`
**Response:**
```json
{
  "success": true,
  "enabled": false,
  "message": "Two-factor authentication has been disabled"
}
```

---

## 👤 User Flows

### Password Reset Flow

```
User Flow:
1. User clicks "Forgot Password"
2. Enters email address
3. Receives email with reset link
4. Clicks link → Redirected to /reset-password?token=...
5. Enters new password (twice for confirmation)
6. Password validated (complexity, history)
7. Password reset successful
8. Redirected to login
9. Receives confirmation email
```

### Admin Password Reset Flow

```
Admin Flow:
1. Admin navigates to "Password Resets" tab
2. Views list of requests (filterable by status)
3. Can create new request:
   - Enter user email
   - Option to auto-approve
4. Can approve pending requests:
   - System generates token
   - Sends reset email to user
5. Can reject requests:
   - Provide rejection reason
   - Request marked as rejected
```

### 2FA Setup Flow

```
User Flow:
1. User navigates to "2FA Setup" in admin dashboard
2. Clicks "Enable 2FA"
3. System generates secret and QR code
4. User scans QR code with authenticator app
   OR manually enters secret
5. Authenticator app generates 6-digit code
6. User enters code to verify
7. System verifies code
8. 2FA enabled
9. User sees backup codes (should save securely)
10. Setup complete
```

### 2FA Disable Flow

```
User Flow:
1. User navigates to "2FA Setup"
2. Sees "2FA Enabled" status
3. Clicks "Disable 2FA"
4. Confirms action
5. 2FA disabled
6. Secret and backup codes kept (for re-enablement)
```

---

## 🔧 Implementation Notes

### Password Reset Token Lifecycle

1. **Creation:** Token generated when user requests reset
2. **Storage:** Stored in `PasswordResetToken` table
3. **Validation:** Checked when user attempts reset
4. **Expiration:** Automatically deleted after 1 hour
5. **Usage:** Marked as used after successful reset
6. **Cleanup:** Expired tokens automatically removed

### 2FA Secret Lifecycle

1. **Generation:** Created when user initiates 2FA setup
2. **Storage:** Stored in `User.twoFactorSecret`
3. **Verification:** Used to verify TOTP codes
4. **Persistence:** Kept even when 2FA is disabled (for re-enablement)
5. **Security:** Never exposed after initial generation

### Error Handling

**Password Reset Errors:**
- Invalid/expired token → Clear error message
- Weak password → Detailed validation errors
- Password in history → Explanation of policy
- Same as current password → Clear message

**2FA Errors:**
- Invalid code → Troubleshooting tips
- Time sync issues → Guidance provided
- Missing secret → Setup required

---

## 📝 Future Enhancements

### Password Reset
- [ ] Rate limiting on reset requests
- [ ] SMS-based reset option
- [ ] Security questions as backup
- [ ] Password strength meter

### 2FA
- [ ] Integrate 2FA check into login flow
- [ ] Backup code usage during login
- [ ] Backup code invalidation
- [ ] Recovery process for lost devices
- [ ] SMS-based 2FA option
- [ ] Remember device option (30 days)

---

## 🔍 Troubleshooting

### Password Reset Issues

**"Token expired"**
- Tokens expire after 1 hour
- Request a new password reset

**"Password doesn't meet requirements"**
- Check complexity requirements
- Ensure password is different from current
- Ensure password hasn't been used recently

### 2FA Issues

**"Invalid verification code"**
- Check device time is synchronized
- Ensure code is entered within 30 seconds
- Try generating a new code from app
- Verify secret was entered correctly

**"QR code won't scan"**
- Use manual entry option
- Ensure QR code is fully visible
- Check camera permissions

---

## 📚 References

- **TOTP Standard:** RFC 6238
- **Password Policy:** Ghana Government Compliance Requirements
- **Library:** `otplib` - https://github.com/yeojz/otplib
- **QR Code:** `qrcode` - https://github.com/soldair/node-qrcode

---

*Last Updated: Based on current codebase analysis*

