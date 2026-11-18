# Gym Progress 1.6.5 Android / 1.7.5 PWA — Supabase update

**This release DOES require a Supabase SQL migration.** Earlier 1.6.4 / 1.7.4 did not. The SQL is additive and does **not** migrate users' workouts or change the generic `training_sync_records` table.

## 1. Back up your Supabase project

Before running SQL against your production project, use Supabase backups (or export all relevant tables, especially `training_sync_records`, `canonical_exercises`, `exercise_families`, translations and aliases). Test the migration against a copy if possible. This assistant has **not** connected to or modified your actual Supabase instance.

## 2. Ensure the existing canonical catalogue is installed

The existing catalogue script must already have been executed:

`supabase/SUPABASE_EXERCISE_CATALOGUE_AND_COMPARISON.sql`

Do not reapply the legacy baseline to an established production installation unless needed, after checking its behaviour and backing up. The new file assumes the tables `canonical_exercises`, `canonical_exercise_translations`, `canonical_exercise_aliases`, and `exercise_families` already exist.

## 3. Run this NEW SQL in Supabase SQL Editor

`supabase/SUPABASE_EXERCISE_REFERENCE_CARDIO_UPDATE_1.6.5_1.7.5.sql`

The SQL transaction:

- Adds `category` (`STRENGTH` or `CARDIO`) to `canonical_exercises`; existing catalogue entries remain `STRENGTH`.
- Adds `legacy_exercise_key` for matching pre-existing Android/PWA exercise identifiers.
- Adds **seven cardio families** and **fourteen cardio exercises**, with English/Latvian names and aliases.
- Creates `canonical_exercise_substitutions` with canonical UUID references, `EQUIVALENT`/`CLOSE`, and priorities; seeds **50 directed relationships**.
- Adds public read-only `gym_exercise_reference_snapshot()` RPC for the same reference data in both clients.
- Grants the minimum read-only reference permissions needed for the public catalogue; it grants no anonymous write permissions.

It does not delete history, overwrite workouts, or add new rows to `training_sync_records`.

## 4. Confirm the migration

Run these in Supabase SQL Editor:

```sql
SELECT category, count(*)
FROM public.canonical_exercises
GROUP BY category
ORDER BY category;

SELECT count(*) AS substitutions
FROM public.canonical_exercise_substitutions
WHERE status = 'ACTIVE';

SELECT jsonb_array_length(public.gym_exercise_reference_snapshot()->'exercises') AS exercises,
       jsonb_array_length(public.gym_exercise_reference_snapshot()->'relations') AS relationships;

SELECT key, category
FROM public.canonical_exercises
WHERE category = 'CARDIO'
ORDER BY key;
```

For an unchanged initial 191-exercise catalogue, expect **191 STRENGTH + 14 CARDIO = 205**, with at least **50 active directed relations**. If your original catalogue was customised, totals may differ. Record any SQL errors instead of running destructive cleanup.

## 5. Deploy the clients

- Deploy PWA **1.7.5** after the SQL migration.
- Install Android **1.6.5** over your existing installation without clearing data. Build in Android Studio with `:app:assembleDebug`.
- Android stays on **Room database version 19**. PWA's IndexedDB data contract is unchanged.
- Both apps use the public Supabase endpoint `/rest/v1/rpc/gym_exercise_reference_snapshot` with the **publishable** client key, even when no Friends account is signed in.
- Both apps save a last-known-good snapshot locally and work offline. Before a first successful fetch, a bundled catalogue/relationship fallback remains in place. Background refresh is limited to about once every six hours. Neither app waits for SQL while opening its main screen.
- An actual edit to the reference catalogue can be picked up without publishing another app build (subject to the refresh interval). Changing the workout itself does not write back to the global catalogue.

### Known boundaries

- Relationships are curated data, not AI-inferred anatomy. When no explicit relationship exists, existing conservative same-family substitution fallback rules may still suggest related alternatives.
- `CARDIO` is a category in the *canonical reference catalogue*; individual cardio workout/session fields were already added in 1.6.4 / 1.7.4 and do not require this SQL migration.
- This migration deliberately does not merge/delete user-created exercise IDs or rewrite previously logged working weights.
- The application-level catalogue cache currently uses Android SharedPreferences / PWA localStorage; user workout data remains in Room / IndexedDB, respectively.
- The SQL is intended to be re-runnable (seed updates are upserts), but **back up before every production execution**.
