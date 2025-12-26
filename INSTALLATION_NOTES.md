# Installation Notes for New Dependencies

## Required Package Installation

After pulling the latest changes, you need to install the new dependencies:

```bash
npm install
```

This will install:
- `bcryptjs` - For password hashing
- `jose` - For JWT token creation and verification
- `@types/bcryptjs` - TypeScript types for bcryptjs

## Database Migration

After installing dependencies, you need to run database migrations to add the new models:

```bash
# Generate Prisma client with new models
npm run db:generate

# Create and apply migration
npm run db:migrate

# Or if you prefer to push schema directly (development only)
npm run db:push
```

## Environment Variables

Make sure your `.env` file includes:

```env
DATABASE_URL="your-database-url"
DIRECT_URL="your-direct-database-url"
JWT_SECRET="your-secret-key-change-in-production"  # Add this!
```

**Important**: Set a strong `JWT_SECRET` in production!

## Initial User Setup

After migrations, you'll need to create initial user accounts. You can do this via:

1. **API Registration Endpoint**: `POST /api/auth/register`
2. **Database Seed Script**: Update `prisma/seed.ts` to create users
3. **Prisma Studio**: `npm run db:studio`

Example user creation via API:
```json
POST /api/auth/register
{
  "email": "hr@mofa.gov.gh",
  "password": "secure-password",
  "role": "hr",
  "staffId": "STAFF001"
}
```

## Testing Authentication

1. Start the dev server: `npm run dev`
2. Navigate to the login page
3. Use registered credentials to login
4. The system will now use real JWT authentication instead of mock credentials

## Notes

- All existing mock authentication has been replaced with real JWT-based auth
- Sessions are stored in the database
- Passwords are hashed using bcryptjs
- Tokens expire after 7 days (configurable in `lib/auth.ts`)
- Middleware protects routes based on user roles

