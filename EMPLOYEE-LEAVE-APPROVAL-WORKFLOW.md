# Employee Leave Approval Workflow & Status Visibility

## Overview
This document describes how employees can see the status of their leave requests and understand the approval workflow in the system.

## 📋 Leave Request Submission

### 1. **Submitting a Leave Request**
- Employees navigate to **"Apply for Leave"** from the dashboard or navigation menu
- Fill out the leave form with:
  - Leave type (Annual, Sick, Maternity, etc.)
  - Start and end dates
  - Reason/description
  - Supporting documents (if required)
- Submit the request
- **Immediate feedback**: The request appears in their leave history with status "Pending"

### 2. **Initial Status**
- Status: **Pending** (yellow/amber indicator)
- Icon: ⏰ Clock icon
- Badge: "Pending" (secondary/amber color)

---

## 🔍 How Employees See Approval Status

### **Dashboard View**

#### **Key Metrics Cards**
1. **Pending Requests Card**
   - Shows count of all pending leave requests
   - Color: Amber/Yellow
   - Quick visual indicator of how many leaves are awaiting approval

2. **Approved Leaves Card**
   - Shows count of approved leaves for the year
   - Color: Green
   - Tracks successful approvals

#### **Recent Leave Requests Section**
- Displays the **5 most recent** leave requests
- Shows for each request:
  - **Leave Type** badge
  - **Status Badge** with icon:
    - ✅ Green checkmark for "Approved"
    - ❌ Red X for "Rejected"
    - ⏰ Amber clock for "Pending"
  - **Date Range** (From/To)
  - **Duration** (number of days)
  - **Current Approval Stage** (if pending):
    - Shows which approver role is currently reviewing
    - Example: "⏳ Awaiting Manager approval"
  - **Approval Date** (if approved/rejected)
  - **Approver Name** (if approved)

---

### **Leave History Page**

#### **Status Filtering**
Employees can filter their leave requests by:
- **All** - Shows all requests
- **Pending** - Only pending requests
- **Approved** - Only approved requests
- **Rejected** - Only rejected requests

#### **Detailed Status Display**

For each leave request, employees see:

1. **Main Status Indicator**
   - Large status badge with icon
   - Color-coded:
     - 🟢 Green for Approved
     - 🔴 Red for Rejected
     - 🟡 Amber for Pending

2. **Approval Workflow Visualization**
   - Shows **all approval levels** in a step-by-step format
   - Each level displays:
     - **Level Number** (e.g., Level 1, Level 2)
     - **Approver Role** (Manager, HR Officer, etc.)
     - **Status Badge**:
       - "Approved" (green) - Completed
       - "Rejected" (red) - Rejected at this level
       - "Awaiting" (amber) - Currently pending at this level
     - **Approver Name** (if approved)
     - **Approval Date** (if approved)
     - **Comments** (if provided by approver)

3. **Current Pending Level Highlighting**
   - The level currently awaiting approval is **highlighted** with:
     - Amber background
     - Border highlight
     - "Awaiting" badge
     - Message: "⏳ Waiting for [Role] approval"

4. **Approval Information**
   - **Approved By**: Name of the person who approved
   - **Approval Date**: When it was approved
   - **Download Approval Letter**: Button appears for approved leaves

---

## 📱 Notifications

### **In-App Notifications**
When a leave request is approved or rejected, employees receive:

1. **Notification Badge**
   - Red dot/badge on the notifications icon
   - Shows unread count

2. **Notification Details**
   - **Type**: "Leave Approved" or "Leave Rejected"
   - **Icon**:
     - ✅ Green checkmark for approved
     - ❌ Red X for rejected
   - **Message**: 
     - "Your [Leave Type] leave request for [X] day(s) has been approved."
     - "Your [Leave Type] leave request for [X] day(s) has been rejected."
   - **Link**: Click to view the leave request details
   - **Timestamp**: When the notification was created

3. **Email Notifications** (if enabled)
   - Email sent to employee's registered email address
   - Contains same information as in-app notification
   - Includes link to view the request in the portal

---

## 🔄 Approval Workflow Stages

### **Single-Level Approval**
1. Employee submits request → Status: **Pending**
2. Manager/HR reviews → Status: **Approved** or **Rejected**
3. Employee sees final status immediately

### **Multi-Level Approval**
1. Employee submits request → Status: **Pending**
2. **Level 1 (Manager)**:
   - Status: **Pending** → Employee sees "Awaiting Manager approval"
   - Status: **Approved** → Moves to Level 2
   - Status: **Rejected** → Final status: **Rejected**
3. **Level 2 (HR Officer)**:
   - Status: **Pending** → Employee sees "Awaiting HR Officer approval"
   - Status: **Approved** → Final status: **Approved**
   - Status: **Rejected** → Final status: **Rejected**

### **Visual Workflow Example**

```
Leave Request: Annual Leave (5 days)
├─ Level 1 (Manager): ✅ Approved by John Doe on Jan 15, 2024
└─ Level 2 (HR Officer): ⏳ Awaiting approval
```

---

## ✅ Approval Confirmation

### **When Leave is Approved**

1. **Status Changes**
   - Badge changes from "Pending" to "Approved" (green)
   - Icon changes from clock to checkmark

2. **Information Displayed**
   - ✅ Approval date
   - ✅ Approver name
   - ✅ All approval levels show "Approved" status

3. **Actions Available**
   - **Download Approval Letter**: Button appears
   - Click to generate and download/print official approval letter

4. **Notifications**
   - In-app notification appears
   - Email notification sent (if enabled)
   - Badge count updates

5. **Leave Balance Updates**
   - Leave balance automatically deducted
   - Updated balance visible in "Leave Balances" section

---

## ❌ Rejection Handling

### **When Leave is Rejected**

1. **Status Changes**
   - Badge changes from "Pending" to "Rejected" (red)
   - Icon changes from clock to X

2. **Information Displayed**
   - ❌ Rejection date
   - ❌ Rejector name
   - ❌ Rejection level (which level rejected it)
   - ❌ Comments (if provided by approver)

3. **Notifications**
   - In-app notification appears
   - Email notification sent (if enabled)

4. **Leave Balance**
   - Leave balance **NOT** deducted
   - Original balance remains unchanged

---

## 📊 Real-Time Updates

### **Automatic Refresh**
- Dashboard and leave history pages automatically refresh
- Status updates appear without manual page refresh
- Uses real-time data synchronization

### **Offline Support**
- Status visible even when offline (from local cache)
- Updates sync when connection is restored

---

## 🎯 Key Features for Status Visibility

1. **Color-Coded Status**
   - Green = Approved
   - Red = Rejected
   - Amber = Pending

2. **Icon Indicators**
   - ✅ CheckCircle for approved
   - ❌ XCircle for rejected
   - ⏰ Clock for pending

3. **Badge System**
   - Clear, readable status badges
   - Consistent across all views

4. **Workflow Visualization**
   - Step-by-step approval levels
   - Current stage highlighted
   - Progress tracking

5. **Notification System**
   - Immediate alerts for status changes
   - Multiple notification channels
   - Click-through to details

6. **Quick Access**
   - Dashboard shows recent requests
   - One-click navigation to full history
   - Filter by status

---

## 📍 Where to Check Status

1. **Dashboard** → Recent Leave Requests section
2. **Leave History** → Full list with filters
3. **Notifications** → Status change alerts
4. **Email** → Status change notifications (if enabled)

---

## 🔔 Best Practices for Employees

1. **Check Dashboard Regularly**
   - View recent requests at a glance
   - Monitor pending count

2. **Review Notifications**
   - Check notification center for updates
   - Click through to see details

3. **Use Leave History**
   - Filter by status to find specific requests
   - View complete approval workflow

4. **Download Approval Letters**
   - Save approved leave letters for records
   - Print for HR/payroll purposes

5. **Monitor Leave Balances**
   - Check balance after approval
   - Verify correct deduction

---

## 🛠️ Technical Implementation

### **Status Tracking**
- Status stored in database: `pending`, `approved`, `rejected`
- Approval levels tracked in `approvalLevels` array
- Timestamps for all status changes

### **Real-Time Updates**
- WebSocket/SSE for live updates
- Polling fallback for status checks
- Local cache for offline viewing

### **Notification System**
- Database notifications table
- Push notifications (if enabled)
- Email notifications (if configured)

---

## 📝 Summary

Employees have **multiple ways** to see if their leave has been approved:

1. ✅ **Dashboard** - Quick overview with recent requests
2. ✅ **Leave History** - Detailed view with full workflow
3. ✅ **Notifications** - Real-time alerts for status changes
4. ✅ **Email** - Status change notifications
5. ✅ **Visual Indicators** - Color-coded badges and icons
6. ✅ **Workflow Display** - Step-by-step approval progress

The system provides **clear, immediate feedback** at every stage of the approval process, ensuring employees always know the status of their leave requests.

