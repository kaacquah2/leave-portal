# Systematic Testing Guide - MoFA Staff Management & Leave Portal

**Purpose**: Comprehensive testing guide using `TEST_CREDENTIALS.md` for systematic verification of all system components.

**Default Password**: `Password123!` (for all test users)

---

## Testing Checklist

### ✅ Phase 1: Authentication & Redirection (COMPLETED)

- [x] Middleware enabled
- [x] Test credentials documented
- [ ] **TODO**: Test login with each role
- [ ] **TODO**: Verify role-based redirection
- [ ] **TODO**: Test invalid credentials rejection
- [ ] **TODO**: Test session timeout

### 🔄 Phase 2: Role-Based Dashboards (IN PROGRESS)

Use `TEST_CREDENTIALS.md` for test accounts.

#### 2.1 Employee Dashboard Testing

**Test Account**: `employee.policy01@mofa.gov.gh` / `Password123!`

**Steps**:
1. Login with employee credentials
2. Verify redirection to `/employee`
3. Verify dashboard shows:
   - [ ] Personal leave balance
   - [ ] Leave application form
   - [ ] Leave history (own requests only)
   - [ ] Profile management
   - [ ] No approval actions visible
4. Verify navigation shows only employee-appropriate items
5. Test direct URL access to `/hr` (should be blocked/redirected)

**Expected Results**:
- ✅ Dashboard title: "Employee Portal" or similar
- ✅ No placeholder widgets
- ✅ Real data from database
- ✅ Cannot access other role dashboards

#### 2.2 Supervisor Dashboard Testing

**Test Account**: `supervisor.policy01@mofa.gov.gh` / `Password123!`

**Steps**:
1. Login with supervisor credentials
2. Verify redirection to `/supervisor`
3. Verify dashboard shows:
   - [ ] Team leave requests pending approval
   - [ ] Direct reports list
   - [ ] Team leave calendar
   - [ ] Approval actions (for direct reports only)
4. Verify can see only direct reports' data
5. Test approval workflow

**Expected Results**:
- ✅ Dashboard shows team-specific data
- ✅ Cannot see other teams' data
- ✅ Approval buttons work correctly

#### 2.3 Unit Head Dashboard Testing

**Test Account**: `unithead.policy@mofa.gov.gh` / `Password123!`

**Steps**:
1. Login with unit head credentials
2. Verify redirection to `/unit-head`
3. Verify dashboard shows:
   - [ ] Unit-level leave requests
   - [ ] Unit staff overview
   - [ ] Unit leave analytics
   - [ ] Approval queue
4. Verify can see only Policy Coordination Unit staff
5. Verify CANNOT see Planning & Budgeting Unit staff
6. Test approval workflow

**Expected Results**:
- ✅ Dashboard shows unit-specific data
- ✅ Data scoping works correctly
- ✅ Cannot access other units' data

#### 2.4 Director Dashboard Testing

**Test Account**: `director.ppbme@mofa.gov.gh` / `Password123!`

**Steps**:
1. Login with director credentials
2. Verify redirection to `/director`
3. Verify dashboard shows:
   - [ ] Directorate-level leave requests
   - [ ] Directorate analytics
   - [ ] Staff overview (all PPBME staff)
   - [ ] Approval queue
4. Verify can see all PPBME directorate staff
5. Verify CANNOT see HRMD directorate staff
6. Test approval workflow

**Expected Results**:
- ✅ Dashboard shows directorate-specific data
- ✅ Data scoping works correctly
- ✅ Cannot access other directorates' data

#### 2.5 HR Officer Dashboard Testing

**Test Account**: `hr.hrmd01@mofa.gov.gh` / `Password123!`

**Steps**:
1. Login with HR officer credentials
2. Verify redirection to `/hr`
3. Verify dashboard shows:
   - [ ] Organization-wide leave queue
   - [ ] Staff management
   - [ ] Leave balance management
   - [ ] Reports & analytics
   - [ ] Leave policy configuration
4. Verify can see all organization staff
5. Test final approval workflow

**Expected Results**:
- ✅ Dashboard shows organization-wide data
- ✅ All HR features accessible
- ✅ Final approval authority works

#### 2.6 HR Director Dashboard Testing

**Test Account**: `director.hrmd@mofa.gov.gh` / `Password123!`

**Steps**:
1. Login with HR director credentials
2. Verify redirection to `/hr-director`
3. Verify dashboard shows:
   - [ ] Strategic HR oversight
   - [ ] Staff creation and management
   - [ ] Organizational structure management
   - [ ] System audit access
4. Test senior staff approval workflow

**Expected Results**:
- ✅ Strategic HR features accessible
- ✅ Can approve senior staff leave

#### 2.7 Chief Director Dashboard Testing

**Test Account**: `chiefdirector@mofa.gov.gh` / `Password123!`

**Steps**:
1. Login with chief director credentials
2. Verify redirection to `/chief-director`
3. Verify dashboard shows:
   - [ ] Executive-level approvals
   - [ ] Organization-wide analytics
   - [ ] Director leave approvals
   - [ ] Strategic reports
4. Test director approval workflow

**Expected Results**:
- ✅ Executive-level features accessible
- ✅ Can approve director leave

#### 2.8 Auditor Dashboard Testing

**Test Account**: `head.audit@mofa.gov.gh` / `Password123!`

**Steps**:
1. Login with auditor credentials
2. Verify redirection to `/auditor`
3. Verify dashboard shows:
   - [ ] Read-only access to all data
   - [ ] Audit log access
   - [ ] Compliance monitoring
4. Verify CANNOT approve leave
5. Verify CANNOT edit data
6. Verify CANNOT access HR/Finance data (if restricted)

**Expected Results**:
- ✅ Read-only access enforced
- ✅ No edit/approval buttons visible
- ✅ Audit logs accessible

#### 2.9 System Admin Dashboard Testing

**Test Account**: `system.admin@mofa.gov.gh` / `Password123!`

**Steps**:
1. Login with system admin credentials
2. Verify redirection to `/admin`
3. Verify dashboard shows:
   - [ ] System configuration
   - [ ] User management
   - [ ] System health monitoring
   - [ ] Technical settings
4. Verify CANNOT approve leave
5. Verify CANNOT edit staff salary/contracts

**Expected Results**:
- ✅ System configuration accessible
- ✅ Segregation of duties enforced

---

### 🔄 Phase 3: Data Scoping Verification (HIGH PRIORITY)

#### 3.1 Unit-Level Scoping Test

**Test Scenario**: Unit Head from Policy Unit should NOT see Planning Unit data

**Steps**:
1. Login as `unithead.policy@mofa.gov.gh`
2. Navigate to staff list or leave calendar
3. Verify:
   - [ ] Can see Policy Coordination Unit staff
   - [ ] CANNOT see Planning & Budgeting Unit staff
   - [ ] CANNOT see Monitoring & Evaluation Unit staff
4. Try direct API call to another unit's data (should fail)

**Test Accounts**:
- Unit Head Policy: `unithead.policy@mofa.gov.gh`
- Unit Head Planning: `unithead.planning@mofa.gov.gh`
- Employee Planning: `employee.planning01@mofa.gov.gh`

**Expected Results**:
- ✅ Data scoping enforced at API level
- ✅ UI shows only permitted data
- ✅ Direct API access blocked

#### 3.2 Directorate-Level Scoping Test

**Test Scenario**: Director from PPBME should NOT see HRMD data

**Steps**:
1. Login as `director.ppbme@mofa.gov.gh`
2. Navigate to staff list or leave calendar
3. Verify:
   - [ ] Can see all PPBME directorate staff
   - [ ] CANNOT see HRMD directorate staff
   - [ ] CANNOT see other directorates' staff
4. Try direct API call to another directorate's data (should fail)

**Test Accounts**:
- Director PPBME: `director.ppbme@mofa.gov.gh`
- Director HRMD: `director.hrmd@mofa.gov.gh`
- HR Officer HRMD: `hr.hrmd01@mofa.gov.gh`

**Expected Results**:
- ✅ Directorate-level scoping enforced
- ✅ No data leakage between directorates

#### 3.3 Team-Level Scoping Test

**Test Scenario**: Supervisor should only see direct reports

**Steps**:
1. Login as `supervisor.policy01@mofa.gov.gh`
2. Navigate to team view
3. Verify:
   - [ ] Can see direct reports only
   - [ ] CANNOT see other supervisors' teams
   - [ ] CANNOT see unit head's data
4. Test approval - should only see direct reports' leave requests

**Expected Results**:
- ✅ Team-level scoping enforced
- ✅ Supervisor cannot see other teams

#### 3.4 Independent Unit Access Test

**Test Scenario**: Head of Audit should NOT access HR/Finance data

**Steps**:
1. Login as `head.audit@mofa.gov.gh`
2. Try to access:
   - [ ] HR staff management (should be blocked or read-only)
   - [ ] Finance/payroll data (should be blocked)
   - [ ] Audit logs (should be accessible)
3. Verify read-only access to compliance data

**Expected Results**:
- ✅ Independent units cannot access HR/Finance data
- ✅ Read-only access to audit/compliance data

---

### 🔄 Phase 4: Workflow Testing (HIGH PRIORITY)

#### 4.1 Complete Approval Workflow Test

**Scenario**: Employee → Supervisor → Unit Head → Director → HR Officer

**Steps**:
1. **Login as Employee**: `employee.policy01@mofa.gov.gh`
   - [ ] Submit leave request
   - [ ] Verify status: "pending"
   - [ ] Verify appears in "My Leave Requests"

2. **Login as Supervisor**: `supervisor.policy01@mofa.gov.gh`
   - [ ] Verify leave request appears in approval queue
   - [ ] Approve leave request
   - [ ] Verify status updates to next level
   - [ ] Verify employee receives notification

3. **Login as Unit Head**: `unithead.policy@mofa.gov.gh`
   - [ ] Verify approved leave request appears
   - [ ] Approve leave request
   - [ ] Verify status updates

4. **Login as Director**: `director.ppbme@mofa.gov.gh`
   - [ ] Verify approved leave request appears
   - [ ] Approve leave request
   - [ ] Verify status updates

5. **Login as HR Officer**: `hr.hrmd01@mofa.gov.gh`
   - [ ] Verify approved leave request appears
   - [ ] Validate and approve leave request
   - [ ] Verify leave balance deducted
   - [ ] Verify final status: "approved"
   - [ ] Verify employee receives notification

**Expected Results**:
- ✅ Sequential approval enforced
- ✅ Status updates in real-time
- ✅ Notifications sent at each step
- ✅ Leave balance deducted on final approval

#### 4.2 Rejection Workflow Test

**Steps**:
1. Employee submits leave request
2. Supervisor rejects with reason
3. Verify:
   - [ ] Status: "rejected"
   - [ ] Employee receives notification
   - [ ] Leave request cannot be approved further
   - [ ] Leave balance NOT deducted

**Expected Results**:
- ✅ Rejection stops workflow
- ✅ Employee notified
- ✅ No balance deduction

#### 4.3 Delegation Workflow Test

**Steps**:
1. Supervisor delegates approval to another supervisor
2. Verify:
   - [ ] Delegation recorded
   - [ ] Delegatee can approve
   - [ ] Original supervisor cannot approve (or can recall)

**Expected Results**:
- ✅ Delegation works correctly
- ✅ Audit trail maintained

---

### 🔄 Phase 5: Real-Time Updates (MEDIUM PRIORITY)

#### 5.1 Concurrent User Test

**Steps**:
1. Open two browser windows
2. Login as Employee in Window 1
3. Login as Supervisor in Window 2
4. Employee submits leave request in Window 1
5. Verify:
   - [ ] Leave request appears in Supervisor's dashboard (Window 2) without refresh
   - [ ] Real-time update works

**Expected Results**:
- ✅ Real-time updates work
- ✅ No manual refresh needed

#### 5.2 Notification Test

**Steps**:
1. Employee submits leave request
2. Verify:
   - [ ] Supervisor receives notification
   - [ ] Notification appears in real-time
   - [ ] Email notification sent (if configured)

**Expected Results**:
- ✅ Notifications trigger correctly
- ✅ Real-time notification delivery

---

## Testing Tools

### Browser DevTools
- Network tab: Verify API calls and responses
- Console: Check for errors
- Application tab: Verify cookies/session

### API Testing
- Use browser DevTools Network tab
- Test direct API calls with different roles
- Verify 403 Forbidden for unauthorized access

### Database Verification
- Use Prisma Studio: `npm run db:studio`
- Verify data scoping at database level
- Check audit logs

---

## Test Results Template

For each test, document:

```
Test: [Test Name]
Date: [Date]
Tester: [Name]
Status: ✅ PASS / ❌ FAIL / ⚠️ PARTIAL

Steps:
1. [Step 1]
2. [Step 2]
...

Results:
- [Finding 1]
- [Finding 2]
...

Issues Found:
- [Issue 1]
- [Issue 2]
...

Screenshots: [Attach if applicable]
```

---

## Priority Testing Order

1. **IMMEDIATE**: Authentication & Redirection (Phase 1)
2. **HIGH**: Role-Based Dashboards (Phase 2)
3. **HIGH**: Data Scoping (Phase 3)
4. **HIGH**: Workflow Testing (Phase 4)
5. **MEDIUM**: Real-Time Updates (Phase 5)

---

## Notes

- Use `TEST_CREDENTIALS.md` for all test accounts
- Document all findings in test results
- Take screenshots of issues
- Report critical issues immediately
- Test both positive and negative scenarios

---

**Last Updated**: December 2024  
**Status**: Ready for systematic testing

