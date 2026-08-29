# Back up Supabase before the exercise-catalogue migration

Do this **before** running `SUPABASE_EXERCISE_CATALOGUE_AND_COMPARISON.sql`.

1. In Supabase Dashboard open **Project Settings → Database** and confirm automated backups / PITR status for the project.
2. Create an independent logical backup from a trusted machine with PostgreSQL client tools:

```bash
pg_dump --format=custom --no-owner --no-acl --dbname="$SUPABASE_DATABASE_URL" --file=gym_progress_before_exercise_catalogue.dump
```

3. Also export the small application tables as CSV from the Table Editor if you want a human-readable secondary copy: `profiles`, `friendships`, `activity_events`, `social_state`, `social_notifications`.
4. Verify the dump exists and is non-zero before applying SQL.
5. Keep the two users' Gym Progress JSON backups separately. The cloud migration does not replace local workout backups.

The migration **does not drop any currently used social table**. The current social tables are all referenced by live client features, so dropping them would be destructive rather than cleanup. New catalogue/comparison tables are additive.
