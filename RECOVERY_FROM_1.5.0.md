# Gym Progress PWA 1.5.1 - recovery after empty local state in 1.5.0

The Friends feed/timeline is stored in Supabase. Programme and workout history are local IndexedDB data. Seeing Friends data while Programme/Logs are empty therefore means the local PWA state was not loaded; it does not mean the Supabase migration deleted programme/history.

## Recovery procedure

1. Do not clear browser/site data and do not uninstall the PWA.
2. Keep the pre-update Gym Progress JSON backup safe. Do not overwrite it with an export from the empty state.
3. Deploy PWA 1.5.1 to exactly the same hosting origin/path used for 1.5.0.
4. Open the PWA and confirm Settings shows version 1.5.1.
5. Go to Settings -> Restore backup.
6. Select the user's pre-update `gym_progress_backup_*.json` file (backup schema v3 is supported).
7. Confirm Restore.
8. Verify Home/Programme, Logs, Progress and the next-workout rotation before making any edits or starting a workout.
9. Export a new Full backup. It should use `gym-progress-backup-v4` and contain `user_exercises`, `userExerciseId` and `programmeExerciseId` fields.
10. Only after this user is confirmed should the second production user be upgraded.

## 1.5.1 protection

- The IndexedDB name/store/key are unchanged from 1.4.9/1.5.0.
- Before migrating legacy local data, 1.5.1 stores an exact `recovery:pre-identity-migration-v1` snapshot in the same IndexedDB.
- It verifies that programme/history row counts survive normalization before writing the migrated state.
- If no app-state record is returned, it does not immediately write empty defaults over storage.
- Before a manual Restore, it stores `recovery:pre-restore-latest` when current training data exists.
