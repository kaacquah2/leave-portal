# First-Time Login Password Change Implementation

## Overview

When an admin creates user credentials, users are **required** to change their password on first login. This is a security requirement to ensure users set their own secure passwords.

## How It Works

### 1. **User Creation by Admin**

When an admin creates user credentials:
- User account is created with a temporary password
- `passwordChangedAt` field is set to `null`
- User is ready to log in

### 2. **First Login Attempt**

When the user tries to log in for the first time:

1. **Login Route Check** (`app/api/auth/login/route.ts`):
   - System checks if `passwordChangedAt` is `null`
   - If null AND user is not a seeded user → triggers password change requirement
   - Returns error: `PASSWORD_CHANGE_REQUIRED` with `requiresPasswordChange: true`

2. **Login Form Redirect** (`components/login-form.tsx`):
   - Detects `requiresPasswordChange: true` in response
   - Automatically redirects to: `/change-password?email={email}&firstLogin=true`

### 3. **Password Change Page**

User is taken to `/change-password` page (`app/change-password/page.tsx`):

**Features:**
- Shows clear message: "You must change your password on first login"
- Requires:
  - Email address (pre-filled from login)
  - Current password (the temporary password from admin)
  - New password (must meet complexity requirements)
  - Confirm new password

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Cannot be the same as current password
- Cannot reuse last 5 passwords

### 4. **Password Change API** (`app/api/auth/change-password/route.ts`)

**Process:**
1. Validates email and current password
2. Verifies current password is correct
3. Validates new password complexity
4. Checks password history (prevents reuse)
5. Hashes and stores new password
6. Sets `passwordChangedAt` to current date
7. Sets password expiry (90 days from now)
8. Adds password to history
9. Creates audit log
10. Returns success

### 5. **After Password Change**

- User is redirected to login page
- User can now log in with their new password
- `passwordChangedAt` is set, so first-login check passes
- Password expiry is set to 90 days from now

## Flow Diagram

```
Admin Creates User
    ↓
User Tries to Login
    ↓
Login Route Checks passwordChangedAt
    ↓
If null → Returns PASSWORD_CHANGE_REQUIRED
    ↓
Login Form Redirects to /change-password
    ↓
User Enters Current Password + New Password
    ↓
Password Change API Validates & Updates
    ↓
User Redirected to Login
    ↓
User Can Now Login Successfully
```

## API Endpoints

### `POST /api/auth/change-password`

**Request Body:**
```json
{
  "email": "user@example.com",  // Required for first login
  "currentPassword": "temp123", // Required
  "newPassword": "NewSecurePass123!" // Required
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Response (Error):**
```json
{
  "error": "Invalid current password",
  "errorCode": "INVALID_CURRENT_PASSWORD",
  "troubleshooting": [...]
}
```

## Security Features

1. **Current Password Verification:**
   - User must provide current password
   - Prevents unauthorized password changes

2. **Password Complexity:**
   - Enforces government compliance requirements
   - Validates before storing

3. **Password History:**
   - Prevents reuse of last 5 passwords
   - Stored securely (hashed)

4. **Audit Logging:**
   - All password changes logged
   - IP address and timestamp recorded

5. **Seeded User Exception:**
   - Test/demo accounts are exempt
   - Allows testing without password change requirement

## User Experience

### First Login Flow:

1. User enters email and temporary password
2. Clicks "Sign In"
3. **Automatically redirected** to password change page
4. Sees message: "You must change your password on first login"
5. Enters current password (temporary password)
6. Enters new password (twice for confirmation)
7. Clicks "Change Password"
8. Sees success message
9. Redirected to login page
10. Can now log in with new password

### Error Handling:

- **Invalid current password:** Clear error message with troubleshooting
- **Weak password:** Lists specific requirements not met
- **Password in history:** Explains reuse prevention policy
- **Network errors:** User-friendly error messages

## Implementation Details

### Files Modified/Created:

1. **`app/api/auth/change-password/route.ts`** (NEW)
   - Handles password change for both logged-in and non-logged-in users
   - Validates all password requirements
   - Updates database and creates audit logs

2. **`app/change-password/page.tsx`** (NEW)
   - UI component for password change
   - Handles first login, expired password, and regular password change
   - Shows appropriate messages based on context

3. **`components/login-form.tsx`** (MODIFIED)
   - Detects `requiresPasswordChange` flag
   - Automatically redirects to password change page
   - Passes email and context (firstLogin/expired) as URL params

4. **`app/api/auth/login/route.ts`** (EXISTING)
   - Already checks for first login
   - Returns appropriate error code

## Testing

### Test Scenarios:

1. **First Login:**
   - Create new user with `passwordChangedAt: null`
   - Try to log in
   - Should redirect to password change page
   - Change password successfully
   - Log in with new password

2. **Invalid Current Password:**
   - Enter wrong current password
   - Should show error message

3. **Weak Password:**
   - Enter password that doesn't meet requirements
   - Should show specific validation errors

4. **Password Reuse:**
   - Try to use a recently used password
   - Should be rejected

5. **Seeded Users:**
   - Seeded test accounts should bypass first-login requirement
   - Should be able to log in without password change

## Status

✅ **FULLY IMPLEMENTED**

- Password change API route created
- Password change UI page created
- Login form redirects to password change
- All security validations in place
- Audit logging implemented
- Error handling complete

## Notes

- **Seeded Users:** Test/demo accounts (e.g., `employee@mofa.gov.gh`) are exempt from first-login password change requirement
- **Password Expiry:** After password change, expiry is set to 90 days from change date
- **Session Management:** Password change does NOT create a session - user must log in again after changing password

---

*Last Updated: Based on current implementation*

