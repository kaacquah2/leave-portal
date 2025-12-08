# Database Setup Guide

This application now uses **Neon** (PostgreSQL) for data persistence instead of localStorage.

## Prerequisites

1. A Neon database account (sign up at https://neon.tech)
2. Node.js and npm installed

## Setup Steps

### 1. Create a Neon Database

1. Go to https://console.neon.tech
2. Create a new project
3. Copy your connection string (it will look like: `postgresql://user:password@host/database?sslmode=require`)

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
```

Replace the connection string with your actual Neon database connection string.

### 3. Generate Prisma Client

Run the following command to generate the Prisma client:

```bash
npx prisma generate
```

### 4. Run Database Migrations

Create and apply the database schema:

```bash
npx prisma migrate dev --name init
```

This will:
- Create a migration file
- Apply the schema to your Neon database
- Generate the Prisma client

### 5. (Optional) Seed Initial Data

If you want to populate the database with initial data, you can create a seed script or manually add data through the application.

## Development

### View Database in Prisma Studio

To view and edit your database data visually:

```bash
npx prisma studio
```

This will open a web interface at http://localhost:5555

### Reset Database

If you need to reset your database:

```bash
npx prisma migrate reset
```

**Warning:** This will delete all data in your database!

## API Routes

All data operations now go through API routes:

- `/api/staff` - Staff management
- `/api/leaves` - Leave requests
- `/api/balances` - Leave balances
- `/api/payslips` - Payslips
- `/api/performance-reviews` - Performance reviews
- `/api/leave-policies` - Leave policies
- `/api/holidays` - Holidays
- `/api/leave-templates` - Leave templates
- `/api/audit-logs` - Audit logs

## Migration from localStorage

The application has been migrated from localStorage to Neon database. All existing localStorage data will need to be migrated manually or re-entered through the application interface.

## Troubleshooting

### Connection Issues

- Verify your `DATABASE_URL` is correct in `.env`
- Check that your Neon database is active
- Ensure your IP is allowed (Neon databases are accessible from anywhere by default)

### Schema Issues

If you make changes to the Prisma schema:

1. Update `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name your_migration_name`
3. Run `npx prisma generate`

### Type Errors

If you see TypeScript errors related to Prisma:

```bash
npx prisma generate
```

This regenerates the Prisma client with the latest schema.

