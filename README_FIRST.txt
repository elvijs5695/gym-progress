GYM PROGRESS PWA 1.5.20 - UPDATE NOTES

1. Export a current backup before deployment.
2. Deploy the v1.5.20 files over the existing PWA on the SAME origin.
3. Do not clear browser/site data. IndexedDB database/store/key identity is unchanged.
4. Open once online so the v1.5.20 service-worker shell is installed.
5. Verify:
   - active status is N/X • Next: Exercise;
   - thin live workout-progress bar advances through sets/rest/timed work;
   - Progress > All occurrences uses cycle-best max weight/volume/e1RM;
   - workout completion shows the deterministic progression/trend summary.
6. Export a post-update backup; schema should be gym-progress-backup-v5.

TRAINING CLOUD SYNC
- v1.5.20 adds local stable IDs/revisions/tombstones/per-domain metadata and the private Supabase foundation SQL.
- Cloud programme/history exchange is NOT enabled yet and no training data is silently uploaded.
- Keep the same IndexedDB identity. Do not replace local state with a cloud snapshot as a shortcut.
