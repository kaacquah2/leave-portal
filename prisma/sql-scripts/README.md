# SQL Scripts

This directory contains standalone SQL scripts that are not part of the Prisma migration system.

## Files

- `add_government_compliance_features.sql` - Government compliance features (notification preferences, salary structure enhancements)
- `add_performance_management_models.sql` - Performance management models

## Usage

These scripts can be run manually on the database if needed, but they should ideally be integrated into proper Prisma migrations.

⚠️ **Note**: These scripts were moved from the `migrations/` directory because they are not standard Prisma migration files. If you need to apply these changes, consider:

1. Creating proper Prisma migrations that include these changes
2. Running these scripts manually on the database
3. Integrating the changes into your schema.prisma and generating new migrations

## Integration

To properly integrate these changes:

1. Review the SQL scripts
2. Update `schema.prisma` with the corresponding models/fields
3. Generate a new migration: `npx prisma migrate dev --name add_government_compliance`
4. Test the migration on a development database
5. Apply to production using `npx prisma migrate deploy`

