GYM PROGRESS 1.4.0 ANDROID / 1.5.0 PWA - START HERE

Do this in this order. Do not uninstall Android or clear browser/site data.

1. BACK UP BOTH USERS LOCALLY
   - In the CURRENT app/PWA, export a fresh Gym Progress JSON for each production user.
   - Store those JSON files outside the phone/browser.
   - Keep them unchanged until the release is fully verified.

2. BACK UP SUPABASE
   - Open Supabase Dashboard > Database > Backups and confirm a pre-migration restore point.
   - If you do not have a usable managed backup, follow SUPABASE_BACKUP_BEFORE_EXERCISE_MIGRATION.md and create CLI dumps.

3. RUN THE READ-ONLY PRECHECK
   - Supabase > SQL Editor > New query.
   - Paste and run the complete SUPABASE_PRE_MIGRATION_CHECK.sql.
   - All existing social objects in the first result must be non-null.
   - Save/screenshot the results.
   - If a required object is missing, STOP.

4. RUN THE DATABASE MIGRATION
   - New SQL query.
   - Paste and run the complete SUPABASE_EXERCISE_CATALOGUE_AND_COMPARISON.sql.
   - Run it once as one query. It is wrapped in BEGIN/COMMIT.
   - Do NOT rerun old social bootstrap/update SQL as part of this release.

5. RUN THE READ-ONLY POSTCHECK
   - Paste and run SUPABASE_POST_MIGRATION_VERIFY.sql.
   - Expected minimums:
       exercise families >= 27
       canonical exercises >= 191
       translations >= 382
       aliases >= 76
       friend-e1RM eligible exercises >= 9
   - Confirm the three comparison RPCs exist and old social tables still exist.
   - If these checks fail, STOP before deploying apps.

6. DEPLOY PWA 1.5.0 FIRST
   - Replace hosted files with the contents of GymProgress-PWA-v1.5.0.zip.
   - Do NOT clear browser data.
   - Open and refresh once.
   - Verify version 1.5.0 and existing programme/history.
   - Test exercise identity, Progress, one timed/mat exercise, a superset, ramp-up, Next info and Tracker.
   - Export a post-update backup. It should use gym-progress-backup-v4.
   - If the user uses Friends, open Friends once while online to reconcile eligible historical e1RM points.

7. BUILD AND INSTALL ANDROID 1.4.0
   - Open GymProgress-v1.4.0-source in Android Studio.
   - Build normally.
   - Install OVER the existing app using the same application ID.
   - DO NOT uninstall the old app and DO NOT clear app data.
   - Room migrates the local DB non-destructively to v12 on first launch.
   - Verify version 1.4.0 and all existing programme/history.
   - Test Android reminders/audio/ramp/Next/timed exercise/superset/Tracker and Friends if used.
   - Export a post-update backup.

8. UPDATE THE SECOND PRODUCTION USER
   - Only after the first user's real-data smoke test is satisfactory.
   - Keep that user's own pre-update JSON backup separate.

9. IF SOMETHING FAILS
   - Do not delete local data to make the app start.
   - Keep both pre- and post-update JSON backups.
   - If SQL migration errors before COMMIT, stop and keep the SQL error text.
   - If Android 1.4.0 has already migrated Room to v12, do not expect a safe downgrade to 1.3.10; prefer a corrected 1.4.x build.

Full details and rollback notes: GymProgress_Deployment_1.4.0_1.5.0.md
