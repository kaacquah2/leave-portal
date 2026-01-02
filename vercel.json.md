# Vercel Configuration Documentation

This file documents the `vercel.json` configuration for the HR Leave Portal deployment.

## Function Timeouts

The configuration uses different timeout values for different endpoint types:

- **Default API routes**: 30 seconds
- **Bulk operations**: 60 seconds
  - `/api/leaves/bulk` - Bulk leave approval/rejection
  - `/api/staff/bulk-upload` - Bulk staff upload from CSV/Excel
  - `/api/staff/bulk-assign-manager` - Bulk manager assignment
- **Report generation**: 60 seconds
  - `/api/reports/export` - Export reports (PDF, Excel, CSV)
  - `/api/reports/**` - All report endpoints
  - `/api/compliance/report` - Compliance reports
- **File uploads**: 60 seconds
  - `/api/documents/upload` - Document uploads
- **Cron jobs**: 300 seconds (5 minutes)
  - `/api/cron/**` - Scheduled background jobs

## Region Configuration

- **Primary region**: `iad1` (US East - Washington, D.C.)
- This region is selected for:
  - Low latency for users in the region
  - Compliance with data residency requirements (if applicable)
  - Cost optimization

To change the region, update the `regions` array in `vercel.json`. Available regions:
- `iad1` - US East (Washington, D.C.)
- `sfo1` - US West (San Francisco)
- `hnd1` - Asia Pacific (Tokyo)
- `syd1` - Asia Pacific (Sydney)
- `fra1` - Europe (Frankfurt)
- `lhr1` - Europe (London)

## Environment Variables

All required environment variables are documented in `README.md`. Key variables include:

- **Database**: `DATABASE_URL`, `DIRECT_URL`
- **Authentication**: `JWT_SECRET`
- **Email**: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_FROM_NAME`
- **Push Notifications**: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`
- **Application**: `NEXT_PUBLIC_APP_URL`, `ELECTRON_API_URL`

Set these in the Vercel dashboard under Project Settings → Environment Variables.

## Cron Jobs

Scheduled jobs configured in `vercel.json`:

- **Daily Reminders**: Runs at 9:00 AM UTC daily
  - Path: `/api/cron/daily-reminders`
  - Schedule: `0 9 * * *` (cron format)

To add more cron jobs, add entries to the `crons` array in `vercel.json`.

## Build Configuration

- **Build command**: `prisma generate && npm run build`
- **Development command**: `npm run dev`
- **Install command**: `npm install`
- **Framework**: Next.js (auto-detected)

## Notes

- The `PRISMA_GENERATE_DATAPROXY` environment variable is set to `true` to enable Prisma Data Proxy for better connection pooling
- `NODE_ENV` is set to `production` for production deployments
- Function timeouts can be adjusted based on actual usage patterns and performance requirements

