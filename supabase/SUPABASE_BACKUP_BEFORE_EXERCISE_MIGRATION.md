# Supabase backup before Gym Progress exercise migration

Do this **before** running `SUPABASE_EXERCISE_CATALOGUE_AND_COMPARISON.sql`.

## Minimum backup procedure

1. Open the Gym Progress project in Supabase Dashboard.
2. Open **Database → Backups** and confirm that a restorable backup exists from before the migration. Supabase Pro, Team and Enterprise projects have managed daily backups; if PITR is enabled, confirm the available restore window. Free projects should create an independent logical dump before continuing.
3. For an independent logical copy, use the Supabase CLI from a trusted machine. With the production database connection string in `SUPABASE_DATABASE_URL`, create separate role/schema/data dumps:

```bash
supabase db dump --db-url "$SUPABASE_DATABASE_URL" -f roles.sql --role-only
supabase db dump --db-url "$SUPABASE_DATABASE_URL" -f schema.sql
supabase db dump --db-url "$SUPABASE_DATABASE_URL" -f data.sql --use-copy --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes"
```

4. Verify that the three output files exist and are non-zero.
5. As an optional human-readable secondary copy, export these application tables from Supabase Table Editor as CSV:
   - `profiles`
   - `friendships`
   - `activity_events`
   - `social_state`
   - `social_notifications`
6. Keep the two users' **local Gym Progress JSON backups** separately. The Supabase backup does not contain their local workout/programme database.
7. Run `SUPABASE_PRE_MIGRATION_CHECK.sql` and save/screenshot its result before applying the migration.

## Important cleanup note

The migration does **not** drop any currently used Gym Progress application table. The existing tables `profiles`, `friendships`, `activity_events`, `social_state`, and `social_notifications` are still used by live social features. Dropping them would destroy functionality/data, not clean up obsolete schema.

The migration does remove/recreate obsolete **policies/triggers where required** using `DROP ... IF EXISTS`, and adds the new catalogue/comparison tables. No currently known production table is safe or useful to drop.
