# Carry-Forward & Year-End Processing - Compliance Analysis

## Current Implementation vs. Government Requirements

---

## ✅ **CORRECTLY IMPLEMENTED**

### 1. Employees Cannot Apply for Carry-Forward ✅
- **Status**: ✅ **CORRECT**
- **Implementation**: No employee-facing UI or API endpoint for carry-forward requests
- **Location**: `components/year-end-processing.tsx` - HR-only access
- **Compliance**: ✅ Matches requirement - "Employees CANNOT request carry-forward as a right"

### 2. Policy-Based Rules ✅
- **Status**: ✅ **CORRECT**
- **Implementation**: `LeavePolicy` model with `carryoverAllowed` and `maxCarryover` fields
- **Location**: `prisma/schema.prisma` lines 452-453
- **Compliance**: ✅ Rules are set by HR, not employees

### 3. Audit Trails ✅
- **Status**: ✅ **CORRECT**
- **Implementation**: `LeaveAccrualHistory` records all year-end processing
- **Location**: `lib/leave-rules.ts` lines 101-116
- **Fields Tracked**:
  - `daysBefore` - Balance before processing
  - `daysAfter` - Balance after processing
  - `carryForwardDays` - Days carried forward
  - `expiredDays` - Days forfeited
  - `notes` - Detailed description
  - `processedBy` - System or user
- **Compliance**: ✅ Full audit trail for Auditor-General and PSC

### 4. Balance History ✅
- **Status**: ✅ **CORRECT**
- **Implementation**: `LeaveAccrualHistory` model tracks all balance changes
- **Location**: `prisma/schema.prisma` lines 184-206
- **Compliance**: ✅ Before/after balances recorded

---

## y
- Currently requires HR to click "Process Year-End" button

**Recommendation:**
```typescript
// Add to app/api/cron/year-end/route.ts
// Schedule: 0 0 31 12 * (Dec 31 at midnight)
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Run year-end processing
  await processYearEndForAllStaff()
  return NextResponse.json({ success: true })
}
```

---⚠️ **PARTIALLY IMPLEMENTED / NEEDS ENHANCEMENT**

### 1. Year-End Processing - Manual vs. Automatic ⚠️

**Current Implementation:**
- ❌ **HR-triggered manually** via UI (`components/year-end-processing.tsx`)
- ✅ Script exists for automation (`scripts/year-end-processing.ts`)
- ❌ **Not scheduled automatically** at fixed date (Dec 31)

**Requirement:**
- ✅ Should run **automatically** on Dec 31 at fixed date
- ✅ No employee action required
- ✅ System-driven

**Gap:**
- Need scheduled cron job or Vercel Cron to run automaticall

### 2. System-Driven Notifications ⚠️

**Current Implementation:**
- ✅ Notification service exists (`lib/notification-service.ts`)
- ✅ Leave usage alerts exist (`sendPolicyThresholdAlert`)
- ❌ **No year-end approaching notifications**
- ❌ **No high leave balance warnings** (before year-end)

**Requirement:**
- ✅ Notify employees when:
  - Leave balance is high
  - Year-end is approaching
- ✅ Encourage leave usage (compliance-focused)

**Gap:**
- Need scheduled job to check balances and send notifications
- Should notify 30 days, 14 days, 7 days before year-end

**Recommendation:**
```typescript
// Add to lib/notification-service.ts
export async function notifyYearEndApproaching(data: {
  staffId: string
  staffName: string
  daysUntilYearEnd: number
  unusedLeave: number
  maxCarryForward: number
}): Promise<void> {
  // Send notification about approaching year-end
  // Encourage leave usage
}
```

---

## ❌ **NOT IMPLEMENTED**

### 1. Deferment Request Workflow ❌

**Requirement:**
- Employee can request deferment **before year-end** (exceptional cases)
- Workflow: Employee → Supervisor → HR → Authorized Officer
- System flags leave as "Deferred by Authority"
- Carry-forward applied during year-end job

**Current Status:**
- ❌ **No deferment request functionality**
- ❌ No UI for employees to request deferment
- ❌ No API endpoint for deferment requests
- ❌ No database model for deferment requests

**Needs Implementation:**
1. **Database Model:**
```prisma
model LeaveDefermentRequest {
  id            String   @id @default(cuid())
  staffId       String
  leaveType     String
  unusedDays    Float
  reason        String   // National duty, emergency assignment, staff shortages
  status        String   @default("pending") // pending | approved | rejected
  supervisorRecommendation String?
  hrValidation  String?
  authorizedOfficer String?
  approvedBy    String?
  approvedAt    DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  staff StaffMember @relation(fields: [staffId], references: [staffId])
}
```

2. **API Endpoint:** `POST /api/leave-deferment`
3. **UI Component:** Deferment request form (employee-facing)
4. **Workflow:** Multi-level approval (Supervisor → HR → Authorized Officer)
5. **Year-End Integration:** Check for approved deferments and flag leave accordingly

---

### 2. Encashment Restrictions ❌

**Requirement:**
- Encashment is **very restricted**
- Only allowed on:
  - Retirement
  - Exit
  - Special authorization
- Should be **disabled by default**

**Current Status:**
- ❌ **No encashment functionality at all**
- ❌ No database model
- ❌ No API endpoints
- ❌ No UI components

**Needs Implementation:**
1. **Database Model:**
```prisma
model LeaveEncashmentRequest {
  id            String   @id @default(cuid())
  staffId       String
  leaveType     String
  days          Float
  reason        String   // retirement | exit | special_authorization
  status        String   @default("pending")
  authorizedBy  String?  // HR Director or Chief Director only
  approvedAt    DateTime?
  createdAt     DateTime @default(now())
  
  staff StaffMember @relation(fields: [staffId], references: [staffId])
}
```

2. **Permission Check:** Only HR Director or Chief Director can enable/approve
3. **API Endpoint:** `POST /api/leave-encashment` (restricted)
4. **UI Component:** HR-only encashment management

---

## 📋 **IMPLEMENTATION CHECKLIST**

### High Priority (Compliance Critical)

- [ ] **Automatic Year-End Processing**
  - [ ] Create cron job endpoint (`app/api/cron/year-end/route.ts`)
  - [ ] Schedule for Dec 31 at midnight
  - [ ] Add Vercel Cron configuration or server cron
  - [ ] Test automatic execution

- [ ] **Year-End Notifications**
  - [ ] Notify employees 30 days before year-end
  - [ ] Notify employees 14 days before year-end
  - [ ] Notify employees 7 days before year-end
  - [ ] Include unused leave balance and carry-forward limits
  - [ ] Encourage leave usage

- [ ] **Deferment Request Workflow**
  - [ ] Create `LeaveDefermentRequest` model
  - [ ] Create API endpoint `POST /api/leave-deferment`
  - [ ] Create employee UI for deferment requests
  - [ ] Implement approval workflow (Supervisor → HR → Authorized Officer)
  - [ ] Integrate with year-end processing (flag deferred leave)
  - [ ] Add audit logging

### Medium Priority (Important for Compliance)

- [ ] **Encashment Restrictions**
  - [ ] Create `LeaveEncashmentRequest` model
  - [ ] Create API endpoint (HR Director/Chief Director only)
  - [ ] Add permission checks (`leave:encashment:approve`)
  - [ ] Create HR-only UI for encashment management
  - [ ] Add restrictions (retirement, exit, special authorization only)

- [ ] **Enhanced Notifications**
  - [ ] High leave balance warnings (before year-end)
  - [ ] Supervisor notifications for team members with high balances
  - [ ] HR dashboard alerts for year-end approaching

### Low Priority (Nice to Have)

- [ ] **Policy Version Tracking**
  - [ ] Track which policy version was applied during year-end
  - [ ] Store in `LeaveAccrualHistory` or separate table

- [ ] **Reason Codes**
  - [ ] Standardized reason codes for deferments
  - [ ] Standardized reason codes for encashment

---

## 🎯 **COMPLIANCE SUMMARY**

| Requirement | Status | Notes |
|------------|--------|-------|
| Employees cannot apply for carry-forward | ✅ **COMPLIANT** | No employee-facing functionality |
| Year-end processing automatic | ⚠️ **PARTIAL** | Manual trigger exists, needs automation |
| Policy-based rules | ✅ **COMPLIANT** | LeavePolicy model enforces rules |
| Audit trails | ✅ **COMPLIANT** | LeaveAccrualHistory tracks all changes |
| Deferment requests | ❌ **MISSING** | Not implemented |
| Encashment restrictions | ❌ **MISSING** | Not implemented |
| System notifications | ⚠️ **PARTIAL** | Basic notifications exist, needs year-end alerts |
| Balance history | ✅ **COMPLIANT** | Full history tracked |

---

## 🚀 **RECOMMENDED NEXT STEPS**

1. **Immediate (Compliance Critical):**
   - Implement automatic year-end processing (cron job)
   - Add year-end approaching notifications
   - Implement deferment request workflow

2. **Short-term (Important):**
   - Implement encashment restrictions
   - Enhance notification system

3. **Long-term (Enhancement):**
   - Policy version tracking
   - Reason code standardization
   - Enhanced reporting for Auditor-General

---

## 📝 **CURRENT WORKFLOW (What Exists)**

```
HR Triggers Year-End Processing (Manual)
  ↓
System Calculates Carry-Forward (Based on Policy)
  ↓
System Updates Leave Balances
  ↓
System Creates Audit Logs
  ↓
HR Views Results
```

## 🎯 **REQUIRED WORKFLOW (What Should Exist)**

```
System Automatically Runs on Dec 31
  ↓
System Checks for Approved Deferments
  ↓
System Calculates Carry-Forward (Based on Policy + Deferments)
  ↓
System Updates Leave Balances
  ↓
System Creates Audit Logs
  ↓
System Notifies Employees of Results
  ↓
HR Reviews Audit Report
```

---

**Last Updated:** December 2024  
**Status:** ⚠️ **PARTIALLY COMPLIANT** - Core functionality exists but needs automation and deferment workflow

