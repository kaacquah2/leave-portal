# MoFAD Leave Approval Workflow - Visual Guide

## 🎯 Quick Reference: Workflow by Unit Type

### Type A: Units Under Chief Director (No Directorate)

**Workflow Pattern:**
```
┌─────────────┐
│  EMPLOYEE  │
│  Submits   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ SUPERVISOR  │ Level 1
│  (Direct    │
│  Reports)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  UNIT_HEAD  │ Level 2
│  (Unit      │
│  Manager)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   CHIEF     │ Level 3
│  DIRECTOR   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ HR_OFFICER  │ Level 4 (Final)
│  (Balance   │
│  Deducted)  │
└─────────────┘
```

**Units in This Category:**
- Ministerial Secretariat
- Protocol Unit
- Public Affairs / Communications Unit
- PPME Unit (Office of Chief Director)
- Internal Audit Unit
- Legal Unit
- RSIM Unit
- Procurement Unit

---

### Type B: Units Under Directorate (Standard)

**Workflow Pattern:**
```
┌─────────────┐
│  EMPLOYEE  │
│  Submits   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ SUPERVISOR  │ Level 1
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  UNIT_HEAD  │ Level 2
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  DIRECTOR   │ Level 3
│ (Directorate│
│    Head)    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ HR_OFFICER  │ Level 4 (Final)
│  (Balance   │
│  Deducted)  │
└─────────────┘
```

**Units in This Category:**
- Accounts Unit (Finance & Administration)
- Budget Unit (Finance & Administration)
- Stores Unit (Finance & Administration)
- Transport & Logistics Unit (Finance & Administration)
- Records / Registry Unit (Finance & Administration)
- Policy Analysis Unit (PPME Directorate)
- Monitoring & Evaluation Unit (PPME Directorate)
- Project Coordination Unit (PPME Directorate)
- ICT Unit (PPME Directorate - to be confirmed)

---

### Type C: HRMU Special Case (Segregation of Duties)

**Workflow Pattern:**
```
┌─────────────┐
│  EMPLOYEE  │
│  (HRMU     │
│   Staff)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ SUPERVISOR  │ Level 1
│ (Senior HR  │
│   Officer)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  UNIT_HEAD  │ Level 2
│ (HR Manager │
│    HRMU)    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  DIRECTOR   │ Level 3
│ (Director,  │
│ Finance &   │
│   Admin)    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ HR_DIRECTOR │ Level 4 ⚠️
│ (Separate   │
│  from HRMU) │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ HR_OFFICER  │ Level 5 (Final)
│ (Separate   │
│  from HRMU) │
│  (Balance   │
│  Deducted)  │
└─────────────┘
```

**Why Special?**
- HRMU staff cannot approve their own leave
- Requires HR Director (separate role) approval
- Final approval by HR Officer (separate from HRMU)
- Ensures segregation of duties

---

## 📊 UNIT-TO-WORKFLOW MAPPING

| Unit | Directorate | Workflow Type | Level 3 Approver | Special Notes |
|------|-------------|---------------|------------------|---------------|
| Ministerial Secretariat | None | Type A | CHIEF_DIRECTOR | - |
| Protocol Unit | None | Type A | CHIEF_DIRECTOR | - |
| Public Affairs Unit | None | Type A | CHIEF_DIRECTOR | - |
| PPME Unit (Chief Dir) | None | Type A | CHIEF_DIRECTOR | - |
| Internal Audit Unit | None | Type A | CHIEF_DIRECTOR | Unit Head has AUDITOR role |
| Legal Unit | None | Type A | CHIEF_DIRECTOR | - |
| RSIM Unit | None | Type A | CHIEF_DIRECTOR | - |
| Procurement Unit | None | Type A | CHIEF_DIRECTOR | - |
| **HRMU** | **Finance & Admin** | **Type C** | **DIRECTOR → HR_DIRECTOR** | **5 Levels** |
| Accounts Unit | Finance & Admin | Type B | DIRECTOR | - |
| Budget Unit | Finance & Admin | Type B | DIRECTOR | - |
| Stores Unit | Finance & Admin | Type B | DIRECTOR | - |
| Transport Unit | Finance & Admin | Type B | DIRECTOR | - |
| Records Unit | Finance & Admin | Type B | DIRECTOR | - |
| Policy Analysis Unit | PPME | Type B | DIRECTOR | - |
| M&E Unit | PPME | Type B | DIRECTOR | - |
| Project Coordination Unit | PPME | Type B | DIRECTOR | - |
| ICT Unit | PPME (or None) | Type A or B | DIRECTOR or CHIEF_DIRECTOR | Confirm reporting |

---

## 🔄 REJECTION FLOW

**If Rejected at Any Level:**

```
┌─────────────┐
│  EMPLOYEE  │
│  Submits   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ SUPERVISOR  │ ✅ Approved
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  UNIT_HEAD  │ ❌ REJECTED
│  (Workflow  │
│   STOPS)    │
└─────────────┘
       │
       ▼
┌─────────────┐
│  EMPLOYEE   │
│  Notified   │
│  (Balance   │
│  NOT        │
│  Deducted)  │
└─────────────┘
```

**Key Points:**
- ❌ Rejection at any level = Final Status: REJECTED
- ⏹️ Workflow stops immediately
- 💰 Balance NOT deducted
- 📧 Employee notified with rejection reason
- 🔄 Employee can submit new request

---

## ✅ APPROVAL FLOW

**Complete Approval:**

```
┌─────────────┐
│  EMPLOYEE  │
│  Submits   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ SUPERVISOR  │ ✅ Level 1
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  UNIT_HEAD  │ ✅ Level 2
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ DIRECTOR/   │ ✅ Level 3
│CHIEF_DIRECTOR│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ HR_OFFICER  │ ✅ Level 4 (Final)
│             │
│ • Balance   │
│   Deducted  │
│ • Record    │
│   Locked    │
│ • Letter    │
│   Generated │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  EMPLOYEE   │
│  Notified   │
│  ✅ APPROVED│
└─────────────┘
```

---

## 📋 PROCESS CHECKLIST

### For Employees:
- [ ] Check leave balance before submitting
- [ ] Fill all required fields
- [ ] Upload required documents (if applicable)
- [ ] Accept declaration
- [ ] Submit request
- [ ] Monitor notifications for status updates
- [ ] Download approval letter when approved

### For Approvers:
- [ ] Review request promptly (within 24 hours)
- [ ] Check leave balance
- [ ] Verify work coverage
- [ ] Check for conflicts
- [ ] Approve or Reject with comments
- [ ] Provide clear rejection reasons if rejecting

---

## 🎯 ESTIMATED PROCESSING TIME

**Standard Processing:**
- Level 1 (Supervisor): 1 day
- Level 2 (Unit Head): 1 day
- Level 3 (Director/Chief Director): 1 day
- Level 4 (HR Officer): 1 day
- **Total**: 3-5 working days

**Escalation:**
- If pending > 24 hours: Reminder sent
- If pending > 3 days: HR escalation

---

**Status**: ✅ Complete Visual Guide  
**Use**: Training and Reference Material

