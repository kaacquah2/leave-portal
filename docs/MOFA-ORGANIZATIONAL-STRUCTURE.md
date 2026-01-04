# MoFA Organizational Structure - Detailed Documentation

**Organization**: Ministry of Fisheries and Aquaculture (MoFA), Ghana  
**Last Updated**: December 2024  
**Total Units**: 18 Units

---

## 📋 Table of Contents

1. [Executive Overview](#executive-overview)
2. [Organizational Hierarchy](#organizational-hierarchy)
3. [Unit Structure by Directorate](#unit-structure-by-directorate)
4. [Role Hierarchy](#role-hierarchy)
5. [Reporting Lines](#reporting-lines)
6. [Approval Workflows by Structure](#approval-workflows-by-structure)
7. [Special Workflow Cases](#special-workflow-cases)

---

## 🏛️ Executive Overview

### Top-Level Structure

```
┌─────────────────────────────────────────────────────────┐
│              MINISTRY OF FISHERIES AND                  │
│              AQUACULTURE (MoFA), GHANA                  │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
   ┌────▼────┐                        ┌────▼────┐
   │ MINISTER│                        │  CHIEF  │
   │         │                        │DIRECTOR │
   │(Political)                       │(Administrative)│
   └────┬────┘                        └────┬────┘
        │                                   │
        │                                   │
   Office of the                    Office of the
   Minister                          Chief Director
   (3 Units)                         (5 Units)
```

---

## 🏢 Organizational Hierarchy

### Level 1: Executive Authority

#### **Office of the Minister**
- **Head**: Minister (Political Head)
- **Administrative Oversight**: Chief Director
- **Purpose**: Political leadership and policy direction
- **Units**: 3 units

#### **Office of the Chief Director**
- **Head**: Chief Director
- **Role**: Administrative Head & Accounting Officer
- **Purpose**: Administrative oversight and coordination
- **Units**: 5 units

### Level 2: Directorates

#### **Finance & Administration Directorate**
- **Head**: Director, Finance & Administration
- **Purpose**: Financial management, human resources, and administrative services
- **Units**: 6 units

#### **Policy, Planning, Monitoring & Evaluation (PPME) Directorate**
- **Head**: Director, PPME
- **Purpose**: Policy development, planning, monitoring, and evaluation
- **Units**: 4 units

---

## 📊 Unit Structure by Directorate

### 1. OFFICE OF THE MINISTER
*Reports to: Chief Director (Administrative oversight)*

| # | Unit Name | Special Notes |
|---|-----------|---------------|
| 1 | **Ministerial Secretariat** | Supports Minister's office operations |
| 2 | **Protocol Unit** | Handles diplomatic and official protocols |
| 3 | **Public Affairs / Communications Unit** | Public relations and communications |

**Total Units**: 3

---

### 2. OFFICE OF THE CHIEF DIRECTOR
*Reports to: Chief Director*

| # | Unit Name | Special Notes |
|---|-----------|---------------|
| 4 | **Policy, Planning, Monitoring & Evaluation (PPME)** | Strategic planning unit (Note: This is a unit, not the directorate) |
| 5 | **Internal Audit Unit** | ⚠️ **Special Workflow: AUDIT** - Unit Head has AUDITOR role |
| 6 | **Legal Unit** | Legal services and compliance |
| 7 | **Research, Statistics & Information Management (RSIM) Unit** | Research and data management |
| 8 | **Procurement Unit** | Procurement and supply chain management |

**Total Units**: 5

**Special Notes**:
- **Internal Audit Unit**: Unit Head automatically has AUDITOR role (read-only access, compliance monitoring)
- All units report directly to Chief Director

---

### 3. FINANCE & ADMINISTRATION DIRECTORATE
*Reports to: Director, Finance & Administration*

| # | Unit Name | Special Notes |
|---|-----------|---------------|
| 9 | **Human Resource Management Unit (HRMU)** | ⚠️ **Special Workflow: HRMU** - Requires HR Director approval |
| 10 | **Accounts Unit** | Financial accounting and reporting |
| 11 | **Budget Unit** | Budget planning and management |
| 12 | **Stores Unit** | Inventory and asset management |
| 13 | **Transport & Logistics Unit** | Transportation and logistics services |
| 14 | **Records / Registry Unit** | Document management and registry |

**Total Units**: 6

**Special Notes**:
- **HRMU**: Requires additional HR Director approval step for segregation of duties (HRMU staff cannot approve their own leave without HR Director oversight)

---

### 4. POLICY, PLANNING, MONITORING & EVALUATION (PPME) DIRECTORATE
*Reports to: Director, PPME*

| # | Unit Name | Special Notes |
|---|-----------|---------------|
| 15 | **Policy Analysis Unit** | Policy development and analysis |
| 16 | **Monitoring & Evaluation Unit** | Program monitoring and evaluation |
| 17 | **Project Coordination Unit** | Project management and coordination |
| 18 | **ICT Unit** | Information and Communication Technology |

**Total Units**: 4

**Note**: The ICT Unit reports to PPME Director (confirmed in system configuration)

---

## 👥 Role Hierarchy

### Complete Role Structure (13 Roles)

The system supports the following roles in hierarchical order:

#### **1. EMPLOYEE** (Base Role)
- **Level**: Base
- **Authority**: None (cannot approve)
- **Scope**: Own information only
- **Description**: All confirmed MoFA staff members

#### **2. SUPERVISOR** (Level 1 Approval)
- **Level**: 1
- **Authority**: Approve direct reports' leave
- **Scope**: Direct reports only
- **Description**: Immediate Supervisor / Line Manager

#### **3. UNIT_HEAD** (Level 2 Approval)
- **Level**: 2
- **Authority**: Approve unit-level leave
- **Scope**: Unit staff
- **Description**: Head of functional unit

#### **4. DIVISION_HEAD** (Level 3 Approval)
- **Level**: 3
- **Authority**: Approve division-level leave
- **Scope**: Division staff
- **Description**: Head of division under directorate
- **Note**: Not commonly used in MoFA structure

#### **5. DIRECTOR** (Level 4 Approval)
- **Level**: 4
- **Authority**: Approve directorate-level leave
- **Scope**: Directorate staff
- **Description**: Director of MoFA Directorate

#### **6. REGIONAL_MANAGER** (Regional Approval)
- **Level**: Regional
- **Authority**: Approve regional/district staff leave
- **Scope**: Regional/district staff
- **Description**: Head of MoFA Regional Office

#### **7. HR_OFFICER** (Final Approval Authority)
- **Level**: Final
- **Authority**: Final approval for all leave requests
- **Scope**: Organization-wide
- **Description**: HR Officer (HRM)
- **Responsibilities**:
  - Final approval authority
  - Manages all staff records
  - Configures leave policies
  - Deducts leave balance on approval

#### **8. HR_DIRECTOR** (Strategic HR)
- **Level**: Strategic
- **Authority**: Approve senior staff/director leave
- **Scope**: Organization-wide
- **Description**: Head of Human Resource Directorate
- **Responsibilities**:
  - Approve senior staff leave
  - Manage organizational structure
  - Full HR management capabilities
  - Special approval for HRMU staff (segregation of duties)

#### **9. CHIEF_DIRECTOR** (Executive Authority)
- **Level**: Executive
- **Authority**: Highest approval authority
- **Scope**: Organization-wide
- **Description**: Chief Director / Ministerial Authority
- **Responsibilities**:
  - Approves Directors & HR Director leave
  - Executive oversight
  - Approves units reporting directly to Chief Director

#### **10. AUDITOR** (Read-Only)
- **Level**: Compliance
- **Authority**: None (read-only)
- **Scope**: Organization-wide (read-only)
- **Description**: Internal Auditor (IAA)
- **Responsibilities**:
  - Read-only access to all data
  - Audit log access
  - Compliance monitoring
- **Note**: Internal Audit Unit Head automatically has this role

#### **11. SYSTEM_ADMIN** (Technical)
- **Level**: Technical
- **Authority**: System configuration only
- **Scope**: Technical systems
- **Description**: System Administrator
- **Restrictions**:
  - Cannot approve leave (segregation of duties)
  - Cannot edit staff salary/contracts

#### **12. SECURITY_ADMIN** (Security)
- **Level**: Security
- **Authority**: Security and compliance
- **Scope**: Security systems
- **Description**: Security Administrator
- **Restrictions**:
  - Cannot approve leave (segregation of duties)

#### **13. ACTING_ROLE** (Temporary Authority)
- **Level**: Temporary
- **Authority**: Full scope of acting role
- **Scope**: Based on acting role
- **Description**: Acting appointments for temporary role coverage
- **Requirements**:
  - Formally recognized by PSC
  - Must have authority source (appointment letter reference)
  - Automatically expires on end date

---

## 🔄 Reporting Lines

### Standard Reporting Structure

```
EMPLOYEE
  │
  ├─→ SUPERVISOR (Level 1)
  │     │
  │     ├─→ UNIT_HEAD (Level 2)
  │     │     │
  │     │     ├─→ DIVISION_HEAD (Level 3) [if exists]
  │     │     │     │
  │     │     │     └─→ DIRECTOR / CHIEF_DIRECTOR (Level 4)
  │     │     │           │
  │     │     │           └─→ HR_DIRECTOR (Level 5) [if HRMU]
  │     │     │                 │
  │     │     │                 └─→ HR_OFFICER (Final)
  │     │     │
  │     │     └─→ DIRECTOR / CHIEF_DIRECTOR (Level 3)
  │     │           │
  │     │           └─→ HR_DIRECTOR (Level 4) [if HRMU]
  │     │                 │
  │     │                 └─→ HR_OFFICER (Final)
  │     │
  │     └─→ REGIONAL_MANAGER (Regional Staff)
  │           │
  │           └─→ DIRECTOR (HQ)
  │                 │
  │                 └─→ HR_OFFICER (Final)
```

### Senior Staff Reporting Structure

```
DIRECTOR / SENIOR STAFF
  │
  ├─→ HR_DIRECTOR (Level 1)
  │     │
  │     └─→ CHIEF_DIRECTOR (Level 2)
```

---

## 📋 Approval Workflows by Structure

### Workflow Type 1: HQ/Directorate Staff

**Standard Flow**:
```
Employee → Supervisor → Unit Head → Directorate Head → HR Officer (Final)
```

**With Division**:
```
Employee → Supervisor → Unit Head → Division Head → Directorate Head → HR Officer (Final)
```

**Units Reporting to Chief Director**:
```
Employee → Supervisor → Unit Head → Chief Director → HR Officer (Final)
```

**Examples**:
- Finance & Administration Directorate staff
- PPME Directorate staff
- Office of Chief Director units
- Office of Minister units

---

### Workflow Type 2: Regional/District Staff

**Standard Flow**:
```
Employee → Supervisor → Regional Manager → Directorate (HQ) → HR Officer (Final)
```

**Examples**:
- Regional office staff
- District office staff

---

### Workflow Type 3: Senior Staff/Directors

**Simplified Flow**:
```
Director/Senior Staff → HR Director → Chief Director
```

**Criteria**:
- Position contains "Director"
- Grade includes "Director"
- Titles: Chief Director, Deputy Director, Director

---

### Workflow Type 4: HRMU Staff (Special Case)

**Special Flow** (Segregation of Duties):
```
Employee → Supervisor → Unit Head → Directorate Head → HR Director → HR Officer (Final)
```

**Reason**: HRMU staff require additional HR Director approval to prevent conflicts of interest (HR staff approving their own leave).

---

## ⚠️ Special Workflow Cases

### Case 1: Internal Audit Unit

**Unit**: Internal Audit Unit  
**Special Feature**: Unit Head has AUDITOR role  
**Workflow**: Standard HQ workflow  
**Access**: Read-only access to all data for compliance monitoring

**Approval Workflow**:
```
Employee → Supervisor → Unit Head (AUDITOR) → Chief Director → HR Officer (Final)
```

---

### Case 2: HRMU (Human Resource Management Unit)

**Unit**: Human Resource Management Unit (HRMU)  
**Special Feature**: Additional HR Director approval required  
**Workflow**: Extended workflow with HR Director step

**Approval Workflow**:
```
Employee → Supervisor → Unit Head → Directorate Head → HR Director → HR Officer (Final)
```

**Reason**: Segregation of duties - HR staff cannot approve their own leave without HR Director oversight.

---

### Case 3: Units Reporting to Chief Director

**Units**:
- Ministerial Secretariat
- Protocol Unit
- Public Affairs / Communications Unit
- Policy, Planning, Monitoring & Evaluation (PPME) Unit
- Internal Audit Unit
- Legal Unit
- Research, Statistics & Information Management (RSIM) Unit
- Procurement Unit

**Workflow**:
```
Employee → Supervisor → Unit Head → Chief Director → HR Officer (Final)
```

**Note**: These units do not have a Directorate Head, so they report directly to Chief Director.

---

## 📈 Organizational Statistics

### Summary by Directorate

| Directorate | Number of Units | Reporting Authority |
|------------|----------------|-------------------|
| Office of the Minister | 3 | Chief Director |
| Office of the Chief Director | 5 | Chief Director |
| Finance & Administration Directorate | 6 | Director, F&A |
| PPME Directorate | 4 | Director, PPME |
| **TOTAL** | **18** | - |

### Summary by Role Level

| Role Level | Number of Roles | Approval Authority |
|-----------|----------------|-------------------|
| Base | 1 | None |
| Level 1-4 | 4 | Sequential approval |
| Regional | 1 | Regional approval |
| Final | 1 | Final approval |
| Strategic | 1 | Senior staff approval |
| Executive | 1 | Highest authority |
| Compliance | 1 | Read-only |
| Technical | 2 | System only |
| Temporary | 1 | Acting authority |
| **TOTAL** | **13** | - |

---

## 🔍 Key Organizational Rules

### Rule 1: Reporting Authority
- Units with `directorate: null` report to **Chief Director**
- Units with a directorate report to **Director** of that directorate

### Rule 2: Approval Routing
- HQ staff: Route through Unit Head → Directorate/Chief Director → HR
- Regional staff: Route through Regional Manager → Directorate (HQ) → HR
- Senior staff: Route through HR Director → Chief Director

### Rule 3: Special Cases
- **HRMU**: Always requires HR Director approval (segregation of duties)
- **Internal Audit Unit**: Unit Head has AUDITOR role (read-only)
- **Senior Staff**: Simplified workflow (HR Director → Chief Director)

### Rule 4: Sequential Approval
- Each level must approve before next level can act
- Cannot skip approval levels
- System enforces sequential workflow

### Rule 5: Self-Approval Prevention
- Approvers cannot approve their own leave requests
- System validates and prevents self-approval

---

## 📝 Notes

1. **Division Level**: The division level exists in the system but is not commonly used in MoFA structure. Most directorates operate with Units directly reporting to Directors.

2. **Total Units**: The system is configured with exactly **18 units** as per MoFA organizational structure.

3. **Special Workflows**: Two units have special workflow requirements:
   - **Internal Audit Unit**: AUDITOR role for compliance
   - **HRMU**: Additional HR Director approval for segregation of duties

4. **Regional Structure**: Regional and District offices follow a different approval workflow that routes through Regional Manager before reaching HQ Directorate.

5. **Chief Director Authority**: Units reporting directly to Chief Director bypass the Directorate level in approval workflows.

---

## 🔗 Related Documentation

- **System Workflow**: `docs/SYSTEM_PROCESS_AND_WORKFLOW.md`
- **Unit Mapping**: `lib/mofa-unit-mapping.ts`
- **Approval Workflow**: `lib/mofa-approval-workflow.ts`
- **Organizational Component**: `components/organizational-structure.tsx`

---

**Document Version**: 1.0  
**Last Updated**: December 2024  
**Maintained By**: HR Information Systems

