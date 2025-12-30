# Missing API Routes - Implementation Plan

## Status: P0 Routes Created ✅

### ✅ Completed (P0 - Critical)
1. ✅ `/api/auth/reset-password` (POST) - Password reset with token
2. ✅ `/api/auth/forgot-password` (POST) - Request password reset
3. ✅ `/api/admin/password-reset-requests` (GET, POST, PATCH) - Admin password reset management

## Remaining Routes to Implement (P1)

### 1. Two-Factor Authentication (2FA) Routes
**Priority**: P1 - High  
**Estimated Time**: 6-8 hours

Routes to create:
- `/api/auth/2fa/status` (GET) - Get 2FA status
- `/api/auth/2fa/generate` (POST) - Generate 2FA secret
- `/api/auth/2fa/verify` (POST) - Verify 2FA setup
- `/api/auth/2fa/disable` (POST) - Disable 2FA

**Dependencies**: 
- `otplib` package (already in package.json)
- User model has `twoFactorEnabled`, `twoFactorSecret`, `twoFactorBackupCodes` fields

**Reference**: `components/two-factor-setup.tsx`

---

### 2. Approval Routes
**Priority**: P1 - High  
**Estimated Time**: 4-5 hours

#### `/api/approvals/delegate` (POST)
- Delegate approval authority to another user
- **Reference**: `components/approval-delegation.tsx:96`
- **Schema**: `ApprovalDelegation` model exists

#### `/api/approvals/history` (GET)
- Get approval history for a leave request
- **Reference**: `components/approval-history.tsx:39`
- **Data Source**: `ApprovalStep` and `LeaveApprovalHistory` models

---

### 3. Reports Routes
**Priority**: P1 - High  
**Estimated Time**: 4-6 hours

#### `/api/reports/analytics` (GET)
- Generate analytics data for dashboard
- **Reference**: `components/analytics-dashboard.tsx:120`
- **Parameters**: date range, filters, etc.

#### `/api/reports/export` (POST)
- Export reports in various formats (PDF, Excel, CSV)
- **Reference**: `components/analytics-dashboard.tsx:143`, `components/report-builder.tsx:118`
- **Dependencies**: `jspdf`, `exceljs` (already in package.json)

---

### 4. Leave Attachments Route
**Priority**: P1 - High  
**Estimated Time**: 3-4 hours

#### `/api/leaves/[id]/attachments` (GET, POST, DELETE)
- Manage leave request attachments
- **Reference**: `components/leave-form.tsx:306-307`
- **Schema**: `LeaveAttachment` model exists
- **File Upload**: Use Next.js file upload handling

---

### 5. Approval Letter Route
**Priority**: P2 - Medium  
**Estimated Time**: 2-3 hours

#### `/api/leaves/[id]/approval-letter` (GET)
- Generate approval letter PDF
- **Reference**: `components/employee-leave-history.tsx:195`
- **Dependencies**: `jspdf` (already in package.json)

---

## Implementation Notes

### File Upload Handling
For `/api/leaves/[id]/attachments`, use Next.js 13+ App Router file upload:
```typescript
import { writeFile } from 'fs/promises'
import { join } from 'path'

// Handle multipart/form-data
const formData = await request.formData()
const file = formData.get('file') as File
```

### 2FA Implementation
Use `otplib` for TOTP:
```typescript
import { authenticator } from 'otplib'

// Generate secret
const secret = authenticator.generateSecret()

// Generate QR code
import QRCode from 'qrcode'
const qrCodeUrl = await QRCode.toDataURL(authenticator.keyuri(email, 'MoFAD HR Portal', secret))
```

### Report Generation
Use existing libraries:
- **PDF**: `jspdf` for PDF generation
- **Excel**: `exceljs` for Excel export
- **CSV**: Manual CSV generation

---

## Next Steps

1. ✅ P0 routes completed
2. ⏳ Implement P1 routes (2FA, approvals, reports, attachments)
3. ⏳ Implement P2 route (approval letter)
4. ⏳ Update audit report
5. ⏳ Test all routes end-to-end

---

**Total Estimated Time for Remaining Routes**: 19-26 hours

