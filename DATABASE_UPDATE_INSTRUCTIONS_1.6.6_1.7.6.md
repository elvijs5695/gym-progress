# Gym Progress 1.6.6 / 1.7.6 — database update instructions

**No additional SQL needs to be executed specifically for 1.6.6/1.7.6.**

## Existing prerequisite from the previous release

If the central exercise catalogue migration **has not been applied successfully**, complete and verify the **corrected** 1.6.5/1.7.5 SQL before deploying this release:

`supabase/SUPABASE_EXERCISE_REFERENCE_CARDIO_UPDATE_1.6.5_1.7.5.sql`

The file bundled here is the corrected SQL that inserts parent exercises first and links translations to the existing IDs. Do not rerun the old failing version. If SQL migration was successful and `category`/`canonical_exercise_substitutions` exist, **do not rerun it**.

Verify in SQL Editor:

```sql
SELECT category, count(*) FROM public.canonical_exercises GROUP BY category ORDER BY category;
SELECT count(*) AS active_relationships FROM public.canonical_exercise_substitutions WHERE status='ACTIVE';
```

In an unchanged initial catalogue the totals are 191 strength / 14 cardio with at least 50 relationships.

## Clients

- Android **1.6.6** installs over 1.6.5 without clearing data; Room remains **version 19**.
- Deploy PWA **1.7.6** completely, including `cardio-analytics.js`, and let the versioned service worker cache refresh.
- There is no change to Supabase training sync schemas or RLS in this release.

Do not use SQL to repair old workout records or wipe the cloud. This release changes workout behaviour and presentation, not the storage representation.
