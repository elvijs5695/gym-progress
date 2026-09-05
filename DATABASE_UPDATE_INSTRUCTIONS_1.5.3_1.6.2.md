# Gym Progress database update — Android 1.5.4 / PWA 1.6.3

## Required action

**No new database migration is required for this release.**

### Android
- Room schema stays at **v14**.
- Do not uninstall the app or clear app data.
- Scheduled/current programme-day sync metadata is installed/maintained automatically by the app.

### PWA
- No IndexedDB schema reset or manual migration is required.
- Do not clear site data before updating.

### Supabase
Run **no additional SQL** for 1.5.3 / 1.6.3 if you already applied the previous required migrations:
1. training-sync foundation;
2. Tracker sync-domain update;
3. account/data-control RPC update from Android 1.5.1 / PWA 1.6.1.

The existing `public.training_sync_records` table already supports the new record-level convergence model and the `programme_schedule` record stored inside the `programme` domain.

## Suggested post-update test
1. Update both devices without clearing local data.
2. Ensure Programme, Workout history and Tracker sync are enabled.
3. Complete a workout on Device A.
4. Open/resume Device B or use Sync now.
5. Confirm the new workout appears on Device B and that a second sync does not keep reporting the same difference.
6. Delete that workout on one device and confirm the entire session disappears locally in one action, then disappears on the other device after sync.
7. Change the scheduled/current programme day and a Tracker value; both should update immediately on the editing device and later propagate to the other device.
