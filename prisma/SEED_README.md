# Database Seed Script

This seed script populates the database with sample data for testing and development purposes.

## What Gets Seeded

The seed script creates:

- **8 Staff Members** - Sample employees with various departments and positions
- **5 Leave Policies** - Policies for Annual, Sick, Unpaid, Special Service, and Training leave
- **8 Leave Balances** - Leave balances for each staff member
- **11 Holidays** - Public holidays and company holidays for 2024
- **4 Leave Templates** - Pre-configured leave request templates
- **5 Leave Requests** - Sample leave requests in various states (pending, approved)
- **5 Payslips** - Sample payslips for November 2024
- **3 Performance Reviews** - Sample performance reviews for Q3 2024
- **7 Audit Logs** - Sample audit trail entries

## Prerequisites

1. Ensure your `.env` file has a valid `DATABASE_URL` configured
2. Make sure you've run database migrations: `npm run db:migrate`
3. Install dependencies: `npm install` (tsx will be installed as a dev dependency)

## Running the Seed Script

### Option 1: Using npm script (Recommended)

```bash
npm run db:seed
```

### Option 2: Using Prisma's seed command

```bash
npx prisma db seed
```

### Option 3: Direct execution

```bash
npx tsx prisma/seed.ts
```

## Important Notes

⚠️ **Warning**: The seed script will **DELETE ALL EXISTING DATA** before seeding. This ensures a clean state but means you'll lose any existing data in your database.

If you want to keep existing data, edit `prisma/seed.ts` and comment out the deletion section at the beginning of the `main()` function.

## Verifying the Seed

After running the seed script, you can verify the data was inserted:

1. **Using Prisma Studio**:
   ```bash
   npm run db:studio
   ```
   This will open a web interface at http://localhost:5555 where you can browse all tables.

2. **Using the Application**:
   Start your development server and check the dashboard:
   ```bash
   npm run dev
   ```

## Sample Staff IDs

The seed script creates staff members with the following IDs:
- MFA-001: John Mwangi
- MFA-002: Mary Wanjiku
- MFA-003: Peter Ochieng
- MFA-004: Sarah Kamau
- MFA-005: David Kipchoge
- MFA-006: Grace Njeri
- MFA-007: James Omondi
- MFA-008: Lucy Wambui

## Troubleshooting

### Error: "DATABASE_URL environment variable is not set"
- Make sure your `.env` file exists and contains a valid `DATABASE_URL`
- Check that the connection string is correct

### Error: "tsx: command not found"
- Run `npm install` to install dev dependencies including tsx

### Error: "Table does not exist"
- Run `npm run db:migrate` to create the database tables first

### Error: Foreign key constraint violations
- Make sure you're running the seed script in the correct order (it's already ordered correctly)
- Check that all referenced staff IDs exist

## Customizing the Seed Data

To customize the seed data, edit `prisma/seed.ts` and modify the arrays for each entity type. The script will automatically handle relationships and foreign keys.

