# Gym Progress 1.6.7 / 1.7.7 — Database update

1. Preserve existing device data. Do not clear Room or IndexedDB.
2. If not already applied, complete the **fixed** SQL exercise catalogue migration from 1.6.5/1.7.5 first (the original version had a foreign-key issue).
3. In Supabase SQL Editor, run `SUPABASE_SOCIAL_CARDIO_SHARE_1.6.7_1.7.7.sql` to permit cardio duration records in Friends. This changes only constraints on `public.activity_events`. It does not alter existing workout history.
4. Deploy PWA, ensure its new service worker loads (close/reopen if an older cached page persists). Build and install Android over the existing application.
5. Check cardio share and existing weight/reps share on a test account.

No additional Room migration (still v19); no `training_sync_records` schema change.
