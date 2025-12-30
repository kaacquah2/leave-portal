# System Administration Guide
## HR Leave Portal - Ministry of Fisheries and Aquaculture

**Version**: 1.0  
**Last Updated**: December 2024

---

## 📋 Table of Contents

1. [Installation & Setup](#installation--setup)
2. [Database Management](#database-management)
3. [Configuration](#configuration)
4. [Scheduled Jobs](#scheduled-jobs)
5. [Backup & Recovery](#backup--recovery)
6. [Monitoring](#monitoring)
7. [Troubleshooting](#troubleshooting)

---

## 🚀 Installation & Setup

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database
- SMTP server for email notifications

### Initial Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Create `.env` file with:
   ```
   DATABASE_URL="postgresql://user:password@host:port/database"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   SMTP_HOST="smtp.example.com"
   SMTP_PORT=587
   SMTP_USER="noreply@mofa.gov.gh"
   SMTP_PASSWORD="password"
   ```

3. **Run Database Migration**:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

4. **Seed Initial Data**:
   ```bash
   npm run db:seed
   ```

5. **Run Setup Script**:
   ```bash
   tsx scripts/setup-initial-data.ts
   ```

6. **Start Application**:
   ```bash
   npm run dev
   ```

---

## 💾 Database Management

### Running Migrations

```bash
# Create new migration
npx prisma migrate dev --name migration-name

# Apply migrations
npx prisma migrate deploy

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset
```

### Database Backup

**Automated Backup**:
```bash
# Run backup script
tsx scripts/backup-database.ts
```

**Manual Backup**:
```bash
pg_dump -h host -U user -d database -F c -f backup.sql
```

### Database Restore

```bash
# Restore from backup
tsx scripts/restore-database.ts backup-file.sql
```

**WARNING**: Restore will overwrite current database!

---

## ⚙️ Configuration

### System Settings

Access via Admin portal or database:

- **Accrual Schedule**: Monthly accrual processing
- **Accrual Day**: Day of month to run accrual (default: 1)
- **Year-End Month**: Month for year-end processing (default: 12)
- **Approval Reminder Days**: Days before sending reminder (default: 3)
- **Email Settings**: SMTP configuration

### Leave Policies

Configure via HR Portal → Leave Policies:
- Set accrual rates
- Configure carry-forward rules
- Set expiration rules
- Define approval levels

---

## ⏰ Scheduled Jobs

### Monthly Accrual

**Cron Schedule**: `0 0 1 * *` (1st of every month at midnight)

**Manual Run**:
```bash
tsx scripts/scheduled-accrual.ts
```

**What It Does**:
- Processes leave accrual for all active staff
- Updates leave balances
- Creates accrual history records

### Year-End Processing

**Cron Schedule**: `0 0 1 1 *` (January 1st at midnight)

**Manual Run**:
```bash
tsx scripts/year-end-processing.ts
```

**What It Does**:
- Processes carry-forward for eligible leave types
- Forfeits unused leave (based on policy)
- Creates year-end processing records

### Approval Reminders

**Cron Schedule**: `0 9 * * *` (Daily at 9 AM)

**Manual Run**:
```bash
tsx scripts/scheduled-reminders.ts
```

**What It Does**:
- Finds pending approvals older than threshold
- Sends reminder notifications
- Creates reminder audit logs

### Setting Up Cron Jobs

**Linux/Mac**:
```bash
crontab -e

# Add:
0 0 1 * * cd /path/to/app && tsx scripts/scheduled-accrual.ts
0 0 1 1 * cd /path/to/app && tsx scripts/year-end-processing.ts
0 9 * * * cd /path/to/app && tsx scripts/scheduled-reminders.ts
```

**Windows (Task Scheduler)**:
- Create scheduled tasks for each script
- Set triggers to run at specified times

---

## 💾 Backup & Recovery

### Automated Backups

**Daily Backup**:
```bash
# Add to cron: 0 2 * * * (2 AM daily)
tsx scripts/backup-database.ts
```

**Backup Retention**:
- Script automatically keeps last 30 days
- Older backups are deleted

### Backup Location

- Default: `./backups/`
- Configure via `BACKUP_DIR` environment variable

### Restore Procedure

1. **Stop Application**: Stop the application
2. **Restore Database**: 
   ```bash
   tsx scripts/restore-database.ts backup-file.sql
   ```
3. **Verify Data**: Check critical data
4. **Restart Application**: Start the application

### Disaster Recovery Plan

1. **Identify Issue**: Determine scope of data loss
2. **Stop Application**: Prevent further data corruption
3. **Restore Latest Backup**: Use most recent backup
4. **Verify Integrity**: Check data consistency
5. **Resume Operations**: Restart application
6. **Document Incident**: Record what happened

---

## 📊 Monitoring

### System Health

**API Endpoint**: `/api/monitoring/health`

**Checks**:
- Database connectivity
- Memory usage
- Disk space
- System errors

### Business Alerts

**Automatic Checks**:
- Balance inconsistencies (negative balances)
- Approval delays (pending > 3 days)
- Accrual failures (not run in 35+ days)

**Access Alerts**:
- Via Admin portal
- Via email notifications
- Via API endpoint

### Monitoring Setup

1. **Set Up Health Checks**:
   - Configure monitoring endpoint
   - Set up external monitoring (if needed)

2. **Configure Alerts**:
   - Set up email notifications
   - Configure alert thresholds

3. **Regular Review**:
   - Review alerts daily
   - Investigate issues promptly

---

## 🔧 Troubleshooting

### Common Issues

#### Database Connection Errors

**Problem**: Cannot connect to database

**Solution**:
- Verify DATABASE_URL is correct
- Check database server is running
- Verify network connectivity
- Check firewall rules

#### Accrual Not Running

**Problem**: Accrual hasn't run

**Solution**:
- Check cron job status
- Verify script permissions
- Run manually to test
- Check logs for errors

#### Balance Inconsistencies

**Problem**: Negative or incorrect balances

**Solution**:
- Review accrual history
- Check leave approvals
- Manually adjust if needed
- Investigate root cause

#### Email Not Sending

**Problem**: Email notifications not working

**Solution**:
- Verify SMTP settings
- Test email configuration
- Check email server logs
- Verify firewall rules

---

## 📞 Support

### Getting Help

- **Documentation**: Check this guide first
- **Logs**: Review application logs
- **Database**: Check database logs
- **IT Support**: Contact IT department

---

**End of System Administration Guide**

