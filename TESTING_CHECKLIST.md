# Testing Checklist - Quick Start Guide

**Status**: ✅ Ready for Testing  
**Default Password**: `Password123!` (all test accounts)

---

## 🚀 Quick Start

1. **Review Test Credentials**: Open `TEST_CREDENTIALS.md`
2. **Follow Testing Guide**: Use `TESTING_GUIDE.md` for detailed steps
3. **Document Results**: Use test results template in `TESTING_GUIDE.md`

---

## ✅ Phase 1: Authentication & Redirection

- [x] Middleware enabled
- [x] Test credentials documented
- [ ] Test login with each role (use `TEST_CREDENTIALS.md`)
- [ ] Verify role-based redirection works
- [ ] Test invalid credentials rejection
- [ ] Test session timeout

**Test Accounts to Use**:
- Employee: `employee.policy01@mofa.gov.gh`
- Supervisor: `supervisor.policy01@mofa.gov.gh`
- Unit Head: `unithead.policy@mofa.gov.gh`
- Director: `director.ppbme@mofa.gov.gh`
- HR Officer: `hr.hrmd01@mofa.gov.gh`
- HR Director: `director.hrmd@mofa.gov.gh`
- Chief Director: `chiefdirector@mofa.gov.gh`
- Auditor: `head.audit@mofa.gov.gh`
- System Admin: `system.admin@mofa.gov.gh`

---

## 🔄 Phase 2: Role-Based Dashboards (HIGH PRIORITY)

### Employee Dashboard
- [ ] Login: `employee.policy01@mofa.gov.gh` / `Password123!`
- [ ] Verify redirect to `/employee`
- [ ] Check dashboard shows personal leave balance
- [ ] Check leave application form works
- [ ] Check leave history (own requests only)
- [ ] Verify cannot access `/hr` or `/admin`

### Supervisor Dashboard
- [ ] Login: `supervisor.policy01@mofa.gov.gh` / `Password123!`
- [ ] Verify redirect to `/supervisor`
- [ ] Check dashboard shows team leave requests
- [ ] Check direct reports list
- [ ] Test approval actions

### Unit Head Dashboard
- [ ] Login: `unithead.policy@mofa.gov.gh` / `Password123!`
- [ ] Verify redirect to `/unit-head`
- [ ] Check dashboard shows unit-level data
- [ ] Verify can see Policy Coordination Unit staff
- [ ] Verify CANNOT see Planning Unit staff

### Director Dashboard
- [ ] Login: `director.ppbme@mofa.gov.gh` / `Password123!`
- [ ] Verify redirect to `/director`
- [ ] Check dashboard shows directorate-level data
- [ ] Verify can see all PPBME staff
- [ ] Verify CANNOT see HRMD staff

### HR Officer Dashboard
- [ ] Login: `hr.hrmd01@mofa.gov.gh` / `Password123!`
- [ ] Verify redirect to `/hr`
- [ ] Check dashboard shows organization-wide data
- [ ] Check staff management features
- [ ] Check leave balance management

### HR Director Dashboard
- [ ] Login: `director.hrmd@mofa.gov.gh` / `Password123!`
- [ ] Verify redirect to `/hr-director`
- [ ] Check strategic HR features
- [ ] Check organizational structure management

### Chief Director Dashboard
- [ ] Login: `chiefdirector@mofa.gov.gh` / `Password123!`
- [ ] Verify redirect to `/chief-director`
- [ ] Check executive-level features
- [ ] Check director approval queue

### Auditor Dashboard
- [ ] Login: `head.audit@mofa.gov.gh` / `Password123!`
- [ ] Verify redirect to `/auditor`
- [ ] Check read-only access
- [ ] Verify cannot approve leave
- [ ] Check audit log access

### System Admin Dashboard
- [ ] Login: `system.admin@mofa.gov.gh` / `Password123!`
- [ ] Verify redirect to `/admin`
- [ ] Check system configuration
- [ ] Verify cannot approve leave
- [ ] Verify cannot edit staff salary

---

## 🔄 Phase 3: Data Scoping Verification (HIGH PRIORITY)

### Unit-Level Scoping
- [ ] Login as `unithead.policy@mofa.gov.gh`
- [ ] Verify can see Policy Coordination Unit staff
- [ ] Verify CANNOT see Planning Unit staff (`employee.planning01@mofa.gov.gh`)
- [ ] Try direct API call to another unit (should fail with 403)

### Directorate-Level Scoping
- [ ] Login as `director.ppbme@mofa.gov.gh`
- [ ] Verify can see all PPBME staff
- [ ] Verify CANNOT see HRMD staff (`hr.hrmd01@mofa.gov.gh`)
- [ ] Try direct API call to another directorate (should fail with 403)

### Team-Level Scoping
- [ ] Login as `supervisor.policy01@mofa.gov.gh`
- [ ] Verify can see only direct reports
- [ ] Verify CANNOT see other supervisors' teams
- [ ] Test approval - should only see direct reports' requests

### Independent Unit Access
- [ ] Login as `head.audit@mofa.gov.gh`
- [ ] Try to access HR staff management (should be blocked or read-only)
- [ ] Try to access finance/payroll data (should be blocked)
- [ ] Verify can access audit logs

---

## 🔄 Phase 4: Workflow Testing (HIGH PRIORITY)

### Complete Approval Workflow
- [ ] **Step 1**: Login as `employee.policy01@mofa.gov.gh`
  - [ ] Submit leave request
  - [ ] Verify status: "pending"
- [ ] **Step 2**: Login as `supervisor.policy01@mofa.gov.gh`
  - [ ] Verify request appears in approval queue
  - [ ] Approve request
  - [ ] Verify status updates
- [ ] **Step 3**: Login as `unithead.policy@mofa.gov.gh`
  - [ ] Verify approved request appears
  - [ ] Approve request
  - [ ] Verify status updates
- [ ] **Step 4**: Login as `director.ppbme@mofa.gov.gh`
  - [ ] Verify approved request appears
  - [ ] Approve request
  - [ ] Verify status updates
- [ ] **Step 5**: Login as `hr.hrmd01@mofa.gov.gh`
  - [ ] Verify approved request appears
  - [ ] Validate and approve
  - [ ] Verify leave balance deducted
  - [ ] Verify final status: "approved"

### Rejection Workflow
- [ ] Employee submits leave request
- [ ] Supervisor rejects with reason
- [ ] Verify status: "rejected"
- [ ] Verify employee receives notification
- [ ] Verify leave balance NOT deducted

### Delegation Workflow
- [ ] Supervisor delegates approval
- [ ] Verify delegation recorded
- [ ] Verify delegatee can approve
- [ ] Verify audit trail maintained

---

## 🔄 Phase 5: Real-Time Updates (MEDIUM PRIORITY)

### Concurrent User Test
- [ ] Open two browser windows
- [ ] Login as Employee in Window 1
- [ ] Login as Supervisor in Window 2
- [ ] Employee submits leave request in Window 1
- [ ] Verify request appears in Supervisor's dashboard (Window 2) without refresh

### Notification Test
- [ ] Employee submits leave request
- [ ] Verify Supervisor receives notification
- [ ] Verify notification appears in real-time
- [ ] Verify email notification sent (if configured)

---

## 🐛 Issues Found

### Critical Issues
- [ ] Issue 1: _______________________
- [ ] Issue 2: _______________________

### High Priority Issues
- [ ] Issue 1: _______________________
- [ ] Issue 2: _______________________

### Medium Priority Issues
- [ ] Issue 1: _______________________
- [ ] Issue 2: _______________________

---

## 📊 Test Results Summary

**Date Started**: _______________  
**Date Completed**: _______________  
**Tester**: _______________  

**Total Tests**: _____  
**Passed**: _____  
**Failed**: _____  
**Partial**: _____  

**Critical Issues**: _____  
**High Priority Issues**: _____  
**Medium Priority Issues**: _____  

---

## 📝 Notes

- Use browser DevTools Network tab to verify API calls
- Check console for errors
- Take screenshots of issues
- Document all findings

---

## 🔗 Quick Links

- **Test Credentials**: `TEST_CREDENTIALS.md`
- **Detailed Testing Guide**: `TESTING_GUIDE.md`
- **Verification Report**: `VERIFICATION_REPORT.md`
- **Actions Completed**: `ACTIONS_COMPLETED.md`

---

**Status**: Ready for Testing  
**Last Updated**: December 2024

