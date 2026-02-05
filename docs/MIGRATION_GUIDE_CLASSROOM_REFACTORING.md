# Classroom Model Refactoring - Migration Guide

## Overview

This guide documents the migration from the legacy `Classroom` model to the new `ClassroomDefinition`/`ClassroomOffering` system.

## What Changed

### Removed
- `Classroom` model (legacy, simple classroom without academic year awareness)
- `Student.class_id` field (direct reference to Classroom)
- Legacy `ClassroomsController` (`GET /classrooms`, `POST /classrooms`)
- Legacy service methods (`list()`, `create()`)

### Updated
- Student import now uses `ClassroomDefinition` and creates `StudentEnrollment` records
- All classroom management now uses the academic year-aware system

## Migration Steps

### ⚠️ Current Status

**Note**: The database schema changes appear to have been applied already (the `Classroom` table and `Student.class_id` column don't exist). However, Prisma migration tracking shows pending migrations. You may need to:

1. **Mark migrations as applied** (if changes were applied manually):
   ```bash
   npx prisma migrate resolve --applied 20250127000000_remove_legacy_classroom_model
   ```

2. **Or apply the pending migrations**:
   ```bash
   npx prisma migrate deploy
   ```

### Step 1: Run Data Migration Script (If Needed)

**BEFORE** applying the schema migration, run the data migration script to migrate existing data (if you have existing `Classroom` records):

```bash
npx ts-node scripts/migrate-classroom-to-definition.ts
```

This script will:
1. Migrate all `Classroom` records to `ClassroomDefinition`
2. Create `ClassroomOffering` records for the active academic year
3. Create `StudentEnrollment` records for students with `class_id` set

**Review the output** to ensure all data was migrated successfully.

**Note**: If your database doesn't have any `Classroom` records, you can skip this step.

### Step 2: Apply Schema Migration (If Needed)

If the schema changes haven't been applied yet, apply the migration:

```bash
npx prisma migrate deploy
```

Or if using `migrate dev`:

```bash
npx prisma migrate dev
```

This will:
1. Remove `Student.class_id` column
2. Drop the `Classroom` table
3. Remove foreign key constraints

**Note**: If the database is already in the correct state, you may need to mark the migration as applied instead.

### Step 3: Regenerate Prisma Client

```bash
npx prisma generate
```

### Step 4: Verify

1. Check that all endpoints work correctly
2. Verify student import creates enrollments
3. Test classroom management endpoints
4. Verify no references to `Classroom` or `class_id` remain

## Breaking Changes

### API Changes
- `GET /classrooms` - **REMOVED** (was legacy endpoint)
- `POST /classrooms` - **REMOVED** (was legacy endpoint)

Use the new endpoints instead:
- `GET /schools/:schoolId/classroom-definitions`
- `POST /schools/:schoolId/classroom-definitions`
- `GET /classroom-definitions/:id`
- `PATCH /classroom-definitions/:id`

### Student Import Changes
- Student import now requires an active academic year for the school
- If `className` is provided, the import will:
  1. Create/find `ClassroomDefinition`
  2. Use the active academic year (if present) and create a `StudentEnrollment` record that references the `ClassroomDefinition` and the academic year (no `ClassroomOffering` required)

If no academic year exists, the student will be imported but without enrollment (warning logged).

**Note on migrations:** This refactor includes manual SQL steps which have been added under `prisma/migrations/20260204_migrate_enrollments` and `prisma/migrations/20260204_add_unique_active_enrollment`. Run those SQLs (or apply equivalent Prisma migrations) to backfill `classroom_definition_id`, add `deleted_at`, `type`, `reason` columns, and to create a unique index preventing more than one pending/active enrollment per student per academic year.

## Rollback Plan

If you need to rollback:

1. **Restore the schema**:
   ```bash
   git checkout HEAD -- prisma/schema.prisma
   npx prisma migrate resolve --rolled-back <migration_name>
   ```

2. **Restore data** (if needed):
   - Restore from database backup taken before migration
   - Or manually recreate `Classroom` records from `ClassroomDefinition`

## Notes

- The legacy `ClassroomsController` was already proxying to `ClassroomDefinition`, so API impact is minimal
- Students imported before this migration may need manual enrollment creation if they had `class_id` set
- All new student imports will automatically create proper enrollment records

## Support

If you encounter issues during migration:
1. Check the data migration script output for errors
2. Verify academic years exist for all schools
3. Ensure all students with `class_id` have corresponding `Classroom` records
4. Review the migration SQL for any database-specific issues
