# HR User Manual
## HR Leave Portal - Ministry of Fisheries and Aquaculture Development

**Version**: 1.0  
**Last Updated**: December 2024

---

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard](#dashboard)
3. [Staff Management](#staff-management)
4. [Manager Assignment](#manager-assignment)
5. [Leave Management](#leave-management)
6. [Leave Policies](#leave-policies)
7. [Holidays](#holidays)
8. [Reports](#reports)
9. [System Administration](#system-administration)
10. [Troubleshooting](#troubleshooting)

---

## 🚀 Getting Started

### Logging In

1. Open the HR Leave Portal application
2. Enter your HR email address
3. Enter your password
4. Click "Sign In"

### Initial Setup

Before first use, complete:
- Configure leave policies
- Set up holidays
- Import staff records
- Assign managers to staff
- Set up initial leave balances

---

## 📊 Dashboard

The HR dashboard provides:

- **Total Staff**: Number of active staff members
- **Pending Leaves**: Leave requests awaiting approval
- **Leave Statistics**: Leave utilization, balances, etc.
- **System Health**: System status and alerts

### Quick Actions

- **Add Staff**: Create new staff member
- **Process Leaves**: Review and approve leave requests
- **View Reports**: Generate reports

---

## 👥 Staff Management

### Adding Staff

1. Navigate to "Staff Management"
2. Click "Add Staff"
3. Fill in required information:
   - Personal details (name, email, phone)
   - Employment details (department, position, grade)
   - Join date
   - Manager assignment (optional)

4. **Initial Leave Balance**:
   - Set initial leave balances
   - Or leave at 0 (will accrue automatically)

5. Click "Save"

### Editing Staff

1. Find staff member in list
2. Click "Edit"
3. Update information
4. Click "Save"

### Terminating Staff

1. Find staff member
2. Click "Terminate"
3. Enter termination date and reason
4. Confirm termination

**Note**: Terminated staff cannot access the system or create leave requests.

---

## 👔 Manager Assignment

### Assigning Managers

1. Navigate to "Manager Assignment"
2. Choose assignment mode:
   - **Single Assignment**: Assign one staff member
   - **Bulk Assignment**: Assign multiple staff members

3. **Single Assignment**:
   - Select staff member
   - Select manager
   - Click "Assign Manager"

4. **Bulk Assignment**:
   - Select multiple staff members
   - Select manager
   - Click "Assign Manager"

### Manager Overview

View all managers and their team sizes:
- Manager name and position
- Number of team members
- Team member list

---

## 📝 Leave Management

### Viewing All Leaves

1. Navigate to "Leave Management"
2. View all leave requests:
   - Filter by status (Pending, Approved, Rejected)
   - Filter by department
   - Filter by leave type
   - Search by staff name/ID

### Approving/Rejecting Leaves

1. Click on a leave request
2. Review details:
   - Staff information
   - Leave type and dates
   - Available balance
   - Reason and attachments

3. **Approve**:
   - Click "Approve"
   - System automatically deducts balance
   - Employee receives notification

4. **Reject**:
   - Click "Reject"
   - Add rejection reason (required)
   - Employee receives notification

### Bulk Operations

1. Select multiple leave requests
2. Choose action (Approve/Reject)
3. Add comments (optional)
4. Click "Process Selected"

**Note**: System validates balance for each request before approval.

---

## ⚙️ Leave Policies

### Managing Leave Policies

1. Navigate to "Leave Policies"
2. View all leave type policies
3. **Edit Policy**:
   - Click "Edit" on a policy
   - Update:
     - Maximum days
     - Accrual rate
     - Accrual frequency
     - Carry-forward rules
     - Expiration rules
     - Approval levels

4. Click "Save"

### Policy Settings

- **Max Days**: Maximum days allowed per year
- **Accrual Rate**: Days accrued per period
- **Accrual Frequency**: Monthly, Quarterly, or Annual
- **Carry-Forward**: Whether unused days can be carried forward
- **Max Carry-Forward**: Maximum days that can be carried forward
- **Expiration**: When unused leave expires
- **Approval Levels**: Number of approval levels required

---

## 📅 Holidays

### Managing Holidays

1. Navigate to "Holidays"
2. **Add Holiday**:
   - Click "Add Holiday"
   - Enter name and date
   - Select type (Public, Company, Regional)
   - Mark as recurring if applicable
   - Click "Save"

3. **Edit/Delete Holiday**:
   - Click "Edit" or "Delete"
   - Make changes
   - Save or confirm deletion

**Note**: Holidays are automatically excluded from leave day calculations.

---

## 📊 Reports

### Generating Reports

1. Navigate to "Reports"
2. Select report type:
   - Leave utilization report
   - Balance report
   - Department-wise report
   - Custom report

3. **Configure Report**:
   - Select date range
   - Select departments/staff
   - Choose filters

4. **Generate and Export**:
   - Click "Generate Report"
   - Export as PDF, Excel, or CSV

---

## 🔧 System Administration

### Accrual Processing

**Monthly Accrual**:
- Runs automatically on 1st of each month
- Can be triggered manually via API
- Processes leave accrual for all active staff

**Year-End Processing**:
- Runs at end of year (December)
- Processes carry-forward and forfeiture
- Can be triggered manually

### Monitoring

1. Navigate to "System Health" (if available)
2. View:
   - System health status
   - Balance inconsistencies
   - Approval delays
   - Accrual status

### Approval Reminders

- System automatically sends reminders for pending approvals
- Reminders sent after configured days (default: 3 days)
- Can be sent manually via API

---

## ❓ Troubleshooting

### Common Issues

#### Balance Inconsistencies

**Problem**: Negative balances or incorrect balances

**Solution**:
- Check accrual history
- Review leave approvals
- Manually adjust balance if needed (with audit log)
- Contact IT if issue persists

#### Approval Not Working

**Problem**: Cannot approve leave request

**Solution**:
- Check if balance is sufficient
- Verify leave is still pending
- Check system logs
- Contact IT if issue persists

#### Accrual Not Running

**Problem**: Accrual hasn't run in a while

**Solution**:
- Check scheduled job status
- Run accrual manually
- Verify system settings
- Contact IT if issue persists

---

## 📞 Support

### Getting Help

- **IT Support**: Contact IT for technical issues
- **System Administrator**: For system configuration
- **Email**: it-support@mofad.gov.gh (example)

---

**End of HR User Manual**

