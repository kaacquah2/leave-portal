# Quick Start Guide
## HR Staff Leave Portal - Implementation Complete

---

## 🚀 Getting Started

### Step 1: Install Dependencies
```bash
npm install
```

This installs:
- `bcryptjs` - Password hashing
- `jose` - JWT token handling
- `@types/bcryptjs` - TypeScript types

### Step 2: Database Setup

1. **Generate Prisma Client**:
   ```bash
   npm run db:generate
   ```

2. **Run Migrations**:
   ```bash
   npm run db:migrate
   ```
   
   Or push schema directly (development only):
   ```bash
   npm run db:push
   ```

### Step 3: Configure Environment

Add to your `.env` file:
```env
DATABASE_URL="your-database-url"
DIRECT_URL="your-direct-database-url"
JWT_SECRET="your-strong-secret-key-minimum-32-characters"
```

**Important**: Use a strong, random JWT_SECRET in production!

### Step 4: Create Initial Users

You need to create at least one admin/HR user to get started. Options:

#### Option A: Via API (Recommended)
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@mofa.gov.gh",
    "password": "SecurePassword123!",
    "role": "hr",
    "staffId": "ADMIN001"
  }'
```

#### Option B: Via Prisma Studio
```bash
npm run db:studio
```
Then manually create a user in the User table.

#### Option C: Update Seed Script
Edit `prisma/seed.ts` to create initial users, then:
```bash
npm run db:seed
```

### Step 5: Start Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` and login with your created credentials.

---

## 📋 Available API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/register` - Register new user

### Attendance
- `GET /api/attendance` - List attendance
- `POST /api/attendance` - Create record
- `POST /api/attendance/clock-in` - Clock in
- `POST /api/attendance/clock-out` - Clock out
- `GET /api/attendance/[id]` - Get record
- `PATCH /api/attendance/[id]` - Update record

### Documents
- `GET /api/documents` - List documents
- `POST /api/documents` - Create document
- `GET /api/documents/[id]` - Get document
- `PATCH /api/documents/[id]` - Update document
- `DELETE /api/documents/[id]` - Delete document

### Notifications
- `GET /api/notifications` - List notifications
- `POST /api/notifications` - Create notification
- `PATCH /api/notifications/[id]` - Mark as read
- `POST /api/notifications/mark-read` - Mark all as read

### Timesheets
- `GET /api/timesheets` - List timesheets
- `POST /api/timesheets` - Create timesheet
- `GET /api/timesheets/[id]` - Get timesheet
- `PATCH /api/timesheets/[id]` - Update timesheet
- `POST /api/timesheets/[id]/approve` - Approve/reject

### Disciplinary Actions
- `GET /api/disciplinary` - List actions
- `POST /api/disciplinary` - Create action
- `GET /api/disciplinary/[id]` - Get action
- `PATCH /api/disciplinary/[id]` - Update action

### Recruitment
- `GET /api/recruitment/jobs` - List jobs
- `POST /api/recruitment/jobs` - Create job
- `GET /api/recruitment/candidates` - List candidates
- `POST /api/recruitment/candidates` - Create candidate

### Salary
- `GET /api/salary` - List salary structures
- `POST /api/salary` - Create salary structure

### Administration
- `GET /api/admin/users` - List users
- `POST /api/admin/users` - Create user
- `GET /api/admin/audit-logs` - View audit logs

### Leave Management
- `POST /api/leaves/[id]/cancel` - Cancel leave

---

## 🔐 User Roles

- **hr** - Full HR access
- **manager** - Team management access
- **employee** - Self-service access
- **admin** - System administration

---

## 🧪 Testing the System

1. **Create Test Users**:
   ```bash
   # HR User
   POST /api/auth/register
   {
     "email": "hr@test.com",
     "password": "test123",
     "role": "hr",
     "staffId": "HR001"
   }
   
   # Employee User
   POST /api/auth/register
   {
     "email": "employee@test.com",
     "password": "test123",
     "role": "employee",
     "staffId": "EMP001"
   }
   ```

2. **Test Login**:
   - Visit login page
   - Use created credentials
   - Should redirect to portal

3. **Test API**:
   ```bash
   # Get auth token from login response
   # Then use in API calls:
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        http://localhost:3000/api/attendance
   ```

---

## 📝 Next Steps

1. ✅ Backend infrastructure complete
2. ⏳ Create UI components for new features
3. ⏳ Implement file upload handling
4. ⏳ Add email notifications
5. ⏳ Create admin dashboard
6. ⏳ Add advanced reporting

---

## 🐛 Troubleshooting

### "JWT_SECRET is not set"
- Add `JWT_SECRET` to `.env` file
- Restart dev server

### "Database connection error"
- Check `DATABASE_URL` in `.env`
- Verify database is accessible
- Run `npm run db:generate`

### "User not found" on login
- Create user via registration API
- Check user exists in database
- Verify email/password are correct

### "Unauthorized" errors
- Check token is being sent in requests
- Verify token hasn't expired
- Check user role has required permissions

---

## 📚 Documentation

- **MISSING_FEATURES_REPORT.md** - Complete list of missing features
- **IMPLEMENTATION_SUMMARY.md** - What's been implemented
- **INSTALLATION_NOTES.md** - Detailed installation guide
- **README.md** - Project overview

---

**Status**: Backend complete, UI components in progress

