# Scheduled Jobs Setup Guide
## HR Leave Portal - Cron Jobs Configuration

---

## 📋 Required Scheduled Jobs

### 1. Monthly Accrual Processing
**Schedule**: 1st of every month at midnight  
**Script**: `scripts/scheduled-accrual.ts`  
**Purpose**: Process leave accrual for all active staff

### 2. Year-End Processing
**Schedule**: January 1st at midnight  
**Script**: `scripts/year-end-processing.ts`  
**Purpose**: Process carry-forward and forfeiture

### 3. Approval Reminders
**Schedule**: Daily at 9 AM  
**Script**: `scripts/scheduled-reminders.ts`  
**Purpose**: Send reminders for pending approvals

### 4. Database Backup
**Schedule**: Daily at 2 AM  
**Script**: `scripts/backup-database.ts`  
**Purpose**: Create database backups

---

## 🐧 Linux/Mac Setup

### Using Crontab

1. **Open Crontab**:
   ```bash
   crontab -e
   ```

2. **Add Jobs**:
   ```cron
   # Monthly accrual - 1st of every month at midnight
   0 0 1 * * cd /path/to/leave-portal && tsx scripts/scheduled-accrual.ts >> logs/accrual.log 2>&1

   # Year-end processing - January 1st at midnight
   0 0 1 1 * cd /path/to/leave-portal && tsx scripts/year-end-processing.ts >> logs/year-end.log 2>&1

   # Approval reminders - Daily at 9 AM
   0 9 * * * cd /path/to/leave-portal && tsx scripts/scheduled-reminders.ts >> logs/reminders.log 2>&1

   # Database backup - Daily at 2 AM
   0 2 * * * cd /path/to/leave-portal && tsx scripts/backup-database.ts >> logs/backup.log 2>&1
   ```

3. **Verify**:
   ```bash
   crontab -l
   ```

---

## 🪟 Windows Setup

### Using Task Scheduler

1. **Open Task Scheduler**
2. **Create Basic Task** for each job:

#### Monthly Accrual:
- **Name**: Monthly Leave Accrual
- **Trigger**: Monthly, Day 1, Time: 00:00
- **Action**: Start a program
- **Program**: `node`
- **Arguments**: `scripts/scheduled-accrual.ts`
- **Start in**: `C:\path\to\leave-portal`

#### Year-End Processing:
- **Name**: Year-End Leave Processing
- **Trigger**: Monthly, January, Day 1, Time: 00:00
- **Action**: Start a program
- **Program**: `node`
- **Arguments**: `scripts/year-end-processing.ts`

#### Approval Reminders:
- **Name**: Approval Reminders
- **Trigger**: Daily, Time: 09:00
- **Action**: Start a program
- **Program**: `node`
- **Arguments**: `scripts/scheduled-reminders.ts`

#### Database Backup:
- **Name**: Database Backup
- **Trigger**: Daily, Time: 02:00
- **Action**: Start a program
- **Program**: `node`
- **Arguments**: `scripts/backup-database.ts`

---

## ☁️ Cloud Setup

### AWS EventBridge / Lambda

Create Lambda functions for each scheduled job and trigger via EventBridge.

### GitHub Actions

Create workflow files in `.github/workflows/`:

```yaml
name: Monthly Accrual
on:
  schedule:
    - cron: '0 0 1 * *'
jobs:
  accrual:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: tsx scripts/scheduled-accrual.ts
```

---

## ✅ Verification

### Test Jobs Manually

```bash
# Test monthly accrual
tsx scripts/scheduled-accrual.ts

# Test year-end processing
tsx scripts/year-end-processing.ts

# Test reminders
tsx scripts/scheduled-reminders.ts

# Test backup
tsx scripts/backup-database.ts
```

### Check Logs

- Review log files in `logs/` directory
- Check application logs
- Verify database for results

---

**End of Cron Jobs Setup Guide**

