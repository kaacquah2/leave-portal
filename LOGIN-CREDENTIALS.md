# Login Credentials Guide

## Quick Setup: Create Test Users

The seed script creates staff members but **does not create User accounts** for login. You need to create User accounts separately.

### Option 1: Using the Registration API (Recommended)

Start your development server first:
```bash
npm run dev
```

Then create users using the registration API:

#### Create HR User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hr@mofad.gov.gh",
    "password": "Password123!",
    "role": "hr",
    "staffId": "MFA-008"
  }'
```

#### Create Manager User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@mofad.gov.gh",
    "password": "Password123!",
    "role": "manager",
    "staffId": "MFA-001"
  }'
```

#### Create Employee User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "employee@mofad.gov.gh",
    "password": "Password123!",
    "role": "employee",
    "staffId": "MFA-002"
  }'
```

#### Create Admin User
```bash 
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admighn@mofad.gov.",
    "password": "Password123!",
    "role": "admin",
    "staffId": null
  }'
```

### Option 2: Using Prisma Studio

1. Open Prisma Studio:
```bash
npm run db:studio
```

2. Navigate to the `User` table
3. Click "Add record"
4. Fill in:
   - `email`: Your email address
   - `passwordHash`: You'll need to hash the password (see below)
   - `role`: `hr`, `manager`, `employee`, or `admin`
   - `staffId`: Match an existing staff member's `staffId` (or `null` for admin)
   - `active`: `true`

**Note**: For password hashing, you can use the registration API or create a simple script.

### Option 3: Quick Test Credentials Script

Create a file `scripts/create-test-users.ts`:

```typescript
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../lib/auth'

const prisma = new PrismaClient()

async function main() {
  const password = 'Password123!'
  const passwordHash = await hashPassword(password)

  // Create HR User
  await prisma.user.upsert({
    where: { email: 'hr@mofad.gov.gh' },
    update: {},
    create: {
      email: 'hr@mofad.gov.gh',
      passwordHash,
      role: 'hr',
      staffId: 'MFA-008', // Lucy Wambui - HR Officer
      active: true,
    },
  })

  // Create Manager User
  await prisma.user.upsert({
    where: { email: 'manager@mofad.gov.gh' },
    update: {},
    create: {
      email: 'manager@mofad.gov.gh',
      passwordHash,
      role: 'manager',
      staffId: 'MFA-001', // John Mwangi - Senior Fisheries Officer
      active: true,
    },
  })

  // Create Employee User
  await prisma.user.upsert({
    where: { email: 'employee@mofad.gov.gh' },
    update: {},
    create: {
      email: 'employee@mofad.gov.gh',
      passwordHash,
      role: 'employee',
      staffId: 'MFA-002', // Mary Wanjiku - Aquaculture Specialist
      active: true,
    },
  })

  // Create Admin User
  await prisma.user.upsert({
    where: { email: 'admin@mofad.gov.gh' },
    update: {},
    create: {
      email: 'admin@mofad.gov.gh',
      passwordHash,
      role: 'admin',
      staffId: null,
      active: true,
    },
  })

  console.log('✅ Test users created successfully!')
  console.log('\n📋 Login Credentials:')
  console.log('   HR:      hr@mofad.gov.gh / Password123!')
  console.log('   Manager: manager@mofad.gov.gh / Password123!')
  console.log('   Employee: employee@mofad.gov.gh / Password123!')
  console.log('   Admin:   admin@mofad.gov.gh / Password123!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

Then run:
```bash
npx tsx scripts/create-test-users.ts
```

---

## Default Test Credentials (After Setup)

Once you've created users using any method above:

| Role     | Email                      | Password      | Staff ID |
|----------|----------------------------|---------------|----------|
| HR       | hr@mofad.gov.gh           | Password123!  | MFA-008  |
| Manager  | manager@mofad.gov.gh      | Password123!  | MFA-001  |
| Employee | employee@mofad.gov.gh     | Password123!  | MFA-002  |
| Admin    | admin@mofad.gov.gh        | Password123!  | -        |

---

## Available Staff Members (from Seed)

The seed script creates these staff members. You can create user accounts for any of them:

- **MFA-001**: John Mwangi - Senior Fisheries Officer
- **MFA-002**: Mary Wanjiku - Aquaculture Specialist
- **MFA-003**: Peter Ochieng - Research Scientist
- **MFA-004**: Sarah Kamau - Policy Analyst
- **MFA-005**: David Kipchoge - Fisheries Officer
- **MFA-006**: Grace Njeri - Extension Officer
- **MFA-007**: James Omondi - Administrative Officer
- **MFA-008**: Lucy Wambui - HR Officer

---

## Important Notes

1. **Staff ID must exist**: When creating a user with a `staffId`, that staff member must already exist in the database (created by the seed script).

2. **Email must be unique**: Each user account requires a unique email address.

3. **Password requirements**: 
   - Minimum 8 characters (enforced by registration API)
   - Use strong passwords in production

4. **Role options**: `hr`, `manager`, `employee`, or `admin`

5. **Admin users**: Can have `staffId` set to `null` if they're not linked to a specific staff member.

---

## Troubleshooting

### "User with this email already exists"
- The email is already registered. Use a different email or delete the existing user.

### "Staff member not found"
- The `staffId` doesn't exist. Run the seed script first: `npm run db:seed`

### "Staff member already has an account"
- That staff member already has a user account. Use a different `staffId` or email.

### "Invalid email or password" on login
- Check that the user exists
- Verify the password is correct
- Ensure the user account is `active: true`

