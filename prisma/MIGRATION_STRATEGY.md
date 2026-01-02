# Prisma Migration Strategy

This document outlines the migration strategy for the HR Leave Portal database schema.

## Overview

The database uses Prisma ORM with PostgreSQL. This document provides guidelines for:
- Creating and applying migrations
- Handling schema changes safely
- Managing data migrations
- Rollback procedures

## Migration Workflow

### 1. Development Workflow

```bash
# 1. Make changes to schema.prisma
# 2. Create migration
npx prisma migrate dev --name descriptive_migration_name

# 3. Review generated migration SQL in prisma/migrations/
# 4. Test migration locally
# 5. Commit migration files
```

### 2. Production Deployment

```bash
# 1. Backup database first!
pg_dump -h hostname -U username -d database_name > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Apply migrations
npx prisma migrate deploy

# 3. Verify migration success
npx prisma migrate status
```

## Schema Change Guidelines

### Adding New Fields

1. **Non-nullable fields**: Always add with `@default()` or make nullable first, then populate, then make non-nullable
2. **Indexes**: Add indexes for frequently queried fields
3. **Foreign keys**: Ensure referenced tables exist

### Modifying Existing Fields

1. **Type changes**: Create migration with data transformation
2. **Renaming fields**: Use `@map` to maintain backward compatibility during transition
3. **Removing fields**: Ensure no application code depends on field before removal

### Adding Enums

1. Add enum definition to schema
2. Update existing string fields to use enum (may require data migration)
3. Test enum values match existing data

## Data Migration Best Practices

### Safe Data Migrations

```sql
-- Example: Populating new required field
BEGIN;

-- Step 1: Add column as nullable
ALTER TABLE "User" ADD COLUMN "newField" TEXT;

-- Step 2: Populate with default values
UPDATE "User" SET "newField" = 'default_value' WHERE "newField" IS NULL;

-- Step 3: Make column non-nullable (if needed)
ALTER TABLE "User" ALTER COLUMN "newField" SET NOT NULL;

COMMIT;
```

### Handling Large Data Migrations

1. **Batch processing**: Process in chunks to avoid locking
2. **Off-peak hours**: Run during low-traffic periods
3. **Monitoring**: Watch for performance impact
4. **Rollback plan**: Always have a way to undo changes

## Rollback Procedures

### Development Environment

```bash
# Reset database to last migration
npx prisma migrate reset

# Or manually revert migration
npx prisma migrate resolve --rolled-back migration_name
```

### Production Environment

**⚠️ WARNING**: Production rollbacks should be carefully planned and tested.

1. **Restore from backup** (safest method)
2. **Manual SQL rollback** (if migration is reversible)
3. **Create new migration** to undo changes (preferred for complex changes)

## Migration Naming Convention

Use descriptive names that indicate the change:

```
✅ Good:
- add_user_role_enum
- add_leave_balance_indexes
- migrate_legacy_roles_to_enum

❌ Bad:
- migration_1
- update_schema
- fix
```

## Testing Migrations

### Before Production

1. **Test on staging**: Always test migrations on staging environment first
2. **Test rollback**: Verify rollback procedure works
3. **Performance test**: Check query performance after index changes
4. **Data integrity**: Verify all data is correctly migrated

### Migration Checklist

- [ ] Schema changes reviewed
- [ ] Migration SQL reviewed
- [ ] Data migration script tested
- [ ] Rollback procedure documented
- [ ] Backup created (production)
- [ ] Staging environment tested
- [ ] Performance impact assessed
- [ ] Documentation updated

## Common Patterns

### Adding Indexes

```prisma
// Add index for frequently queried fields
@@index([staffId, status])
@@index([email])
```

### Adding Constraints

```prisma
// Unique constraint
@@unique([staffId, email])

// Foreign key (automatically created with @relation)
staff StaffMember @relation(fields: [staffId], references: [staffId])
```

### Enum Migration

```prisma
// Step 1: Add enum
enum LeaveType {
  Annual
  Sick
  // ...
}

// Step 2: Update field type
leaveType LeaveType

// Step 3: Create migration with data transformation
// Migration SQL will need to map existing string values to enum
```

## Environment-Specific Considerations

### Development

- Use `prisma migrate dev` for automatic migration creation
- Reset database freely for testing
- Use seed scripts for test data

### Staging

- Use `prisma migrate deploy` to apply migrations
- Test all migrations before production
- Maintain production-like data volume

### Production

- **Always backup before migration**
- Use `prisma migrate deploy` (not `dev`)
- Monitor application during migration
- Have rollback plan ready
- Schedule during maintenance window if possible

## Troubleshooting

### Migration Fails

1. Check error message for specific issue
2. Review migration SQL for syntax errors
3. Verify database connection and permissions
4. Check for conflicting migrations
5. Restore from backup if needed

### Data Loss Prevention

1. Always backup before migrations
2. Test migrations on copy of production data
3. Use transactions for data migrations
4. Verify data integrity after migration

## Resources

- [Prisma Migration Guide](https://www.prisma.io/docs/guides/migrate)
- [PostgreSQL Backup/Restore](https://www.postgresql.org/docs/current/backup.html)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)

## Support

For migration issues, contact the development team or refer to:
- Project documentation
- Prisma documentation
- Database administrator

---

**Last Updated**: 2024
**Schema Version**: See `prisma/migrations/` for version history

