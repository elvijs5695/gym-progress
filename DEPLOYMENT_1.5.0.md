# Gym Progress 1.4.0 Android / 1.5.0 PWA — production update procedure

This is the release order to use for the two existing production users. Do not skip the local JSON backups or the Supabase pre-check.

## A. Files used in this release

- Android source: `GymProgress-v1.4.0-source.zip`
- PWA: `GymProgress-PWA-v1.5.0.zip`
- Supabase pre-check: `SUPABASE_PRE_MIGRATION_CHECK.sql`
- Supabase migration: `SUPABASE_EXERCISE_CATALOGUE_AND_COMPARISON.sql`
- Supabase post-check: `SUPABASE_POST_MIGRATION_VERIFY.sql`

The database migration is additive. It does **not** drop the existing Gym Progress social tables. `profiles`, `friendships`, `activity_events`, `social_state`, and `social_notifications` are still used by the app and are therefore not obsolete.

## B. Before touching Supabase or either production app

1. Ask **both existing users** to open their current Gym Progress app/PWA.
2. Export a fresh **Gym Progress JSON backup** from each user.
3. Put the two JSON files somewhere outside the phone/browser and keep them unchanged.
4. Do not edit the users' programmes between this backup and their app update if avoidable. The release contains the reviewed mapping for the two supplied production datasets.
5. Keep the previous Android source/APK and previous PWA deployment available for reference, but do not assume an Android database can safely be downgraded after v1.4.0 has opened it.

## C. Back up Supabase

### Minimum dashboard check

1. Open the Supabase Dashboard and select the production Gym Progress project.
2. Open **Database → Backups**.
3. Confirm that a recent backup/restore point exists and note its timestamp.
4. If your Supabase plan does not provide a usable managed backup, create a logical backup with the Supabase CLI before continuing.

### Optional extra safety export

Export the current rows of these public tables to CSV if you want a simple human-readable copy as well:

- `profiles`
- `friendships`
- `activity_events`
- `social_state`
- `social_notifications`

The bundled `supabase/SUPABASE_BACKUP_BEFORE_EXERCISE_MIGRATION.md` contains the CLI dump option and additional notes.

## D. Run the Supabase pre-migration check

1. In Supabase open **SQL Editor → New query**.
2. Open `SUPABASE_PRE_MIGRATION_CHECK.sql` from this release.
3. Copy the complete file into the SQL Editor.
4. Press **Run**.
5. Confirm that the existing social objects reported by the query are present, especially:
   - `profiles`
   - `friendships`
   - `activity_events`
   - `social_state`
   - `social_notifications`
   - `social_is_friend`
6. Save the result or take a screenshot.
7. **If a required object is missing, stop. Do not run the catalogue migration until the existing social schema is understood/repaired.**

## E. Apply the catalogue + comparison migration

1. Open another **SQL Editor → New query**.
2. Open `SUPABASE_EXERCISE_CATALOGUE_AND_COMPARISON.sql`.
3. Copy the **entire** file and run it as one query.
4. Wait for successful completion.
5. The file is wrapped in `BEGIN` / `COMMIT`; a SQL error should abort the transaction rather than leave a deliberately half-applied release migration.
6. Do **not** run the older `SUPABASE_SOCIAL_SETUP.sql` or historical social-update scripts again as part of this release if the pre-check passed. They are retained only as historical/bootstrap files.

The migration creates/seeds:

- 27 exercise families;
- 191 canonical exercises;
- English and Latvian catalogue translations;
- catalogue aliases;
- catalogue-candidate infrastructure;
- derived e1RM comparison points;
- RLS/policies and comparison RPCs, including the atomic history-reconciliation RPC used for retroactive link/opt-in changes.

## F. Verify Supabase immediately

1. Open **SQL Editor → New query**.
2. Run the complete `SUPABASE_POST_MIGRATION_VERIFY.sql` file.
3. Confirm at least:
   - exercise families: **27 or more**;
   - canonical exercises: **191 or more**;
   - translations: **382 or more**;
   - aliases: **76 or more**;
   - friend-e1RM eligible exercises: **9** in the reviewed initial catalogue;
   - comparison RPCs are present, including `social_replace_exercise_comparison_points(jsonb)`;
   - the old social tables still exist.
4. If these checks do not match, stop the app rollout and fix the database first.

## G. Deploy and test PWA 1.5.0 first

1. Replace the deployed PWA files with the contents of `GymProgress-PWA-v1.5.0.zip` using the same hosting location/path as before.
2. Do **not** clear browser site data.
3. Open the PWA normally and refresh once so the new service worker/app shell can take over.
4. Confirm the displayed version is **1.5.0**.
5. On one existing user's real data, check:
   - programme and workout history are still present;
   - exercise names remain in the language/name in which they were created when the interface language changes;
   - Progress still contains the correct old history;
   - duplicate programme occurrences of one exercise no longer depend on the name for identity;
   - catalogue-linked/local status behaves as expected;
   - Timed exercise creation works;
   - supersets work;
   - max ramp-up sets and plate-friendly barbell ramps work;
   - the post-ramp rest and Next information work;
   - Tracker data can be configured and changed.
6. Export a fresh backup from v1.5.0 and confirm the backup schema is `gym-progress-backup-v4` and contains `user_exercises`, `userExerciseId`, and `programmeExerciseId` data.
7. If signed into Friends, open Friends once. This deliberately reconciles the user's full locally-derived eligible e1RM history with Supabase, so link/unlink and programme-occurrence comparison choices apply retroactively.

### PWA reminder limitation

Tracker reminders are checked while the PWA is running/resumes. A fully closed static PWA cannot provide guaranteed background push without Web Push/server push infrastructure. This limitation does not affect Tracker storage or Android background reminders.

## H. Build and test Android 1.4.0

1. Open the **`GymProgress-v1.4.0-source` folder** in Android Studio.
2. Let Gradle/Android Studio sync.
3. Build the app normally.
4. Before installing over a production phone, keep that user's fresh pre-update JSON backup from step B.
5. Install **over the existing Gym Progress app** with the same application ID. Do **not** uninstall it and do **not** clear app data.
6. Launch it. Room performs the non-destructive database migration to schema v12.
7. Confirm the installed version is **1.4.0**.
8. Test the same identity/history cases as the PWA plus:
   - app launches with all old programme/history data;
   - Android background Tracker reminder scheduling;
   - audio warnings/countdown;
   - ramp flow and normal rest after ramp;
   - active workout Next weight/reps;
   - timed exercise completion without RIR/weight/reps;
   - superset pair flow;
   - Friends sign-in/comparison if used.
9. Open Friends once while signed in to reconcile historical comparison points.
10. Export a new post-migration JSON backup.

### Important Android rollback note

Once Android 1.4.0 has opened and migrated the on-device Room database to v12, **do not simply install v1.3.10 over that same database and expect a safe downgrade**. If a serious defect is found, prefer a fixed 1.4.x build. The pre-update JSON backup is the safety copy for user training data.

## I. Roll out to the second production user

Only after the first user's PWA/Android migration and real workout smoke test are satisfactory:

1. repeat the install/update for the second user;
2. preserve their separate pre-update JSON backup;
3. verify their reviewed custom/local mappings, especially exercises intentionally kept local;
4. open Friends once if they use social comparison;
5. export a post-update backup.

## J. What to do if something fails

### Supabase migration fails before COMMIT

- Stop.
- Keep the error text.
- Do not run random older SQL files to compensate.
- The release migration is transactional; diagnose the error, correct the migration if necessary, then rerun only after confirming database state with the pre/post checks.

### New app launches but a user's local migration looks wrong

- Do not continue editing that user's programme/history.
- Keep both the pre-update and post-update JSON exports.
- Use the pre-update JSON as the source for a corrected migration/import build.
- Do not delete local data merely to make the app start unless no non-destructive recovery remains.

### Social comparison looks wrong

- First verify the canonical link and the programme occurrence's **Compare with friends** toggle.
- Open Friends while online; the new clients replace the user's derived comparison cache from local history, so stale server points are removed and eligible historical points are backfilled.
- Friend comparison uses only qualifying **Estimated 1-rep max (e1RM)** points; raw working weight and Volume are not compared between friends.

## K. Release validation already performed before packaging

- PWA JavaScript syntax and source validator (**52 PWA files checked**).
- Shared performance-rule cases.
- 191-exercise / 27-family catalogue counts and reviewed migration counts.
- Both supplied production JSON backups migrated through the new PWA identity migration with no missing UserExercise/ProgrammeExercise IDs and no duplicate programme IDs.
- Android source/static validator over **48 Kotlin files**.
- Android/PWA catalogue and reviewed migration assets cross-checked.
- Supabase migration copies in Android/PWA kept byte-identical.

Not performed in this environment: Android Gradle/Compose build, Android install-over Room migration on a real phone, real Supabase execution, OTP delivery, or two-device social round trip. These are the device/backend checks in sections F–I.
