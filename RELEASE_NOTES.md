# Gym Progress PWA v1.6.2 — 2026-09-05

## Sync convergence
- Training sync now converges record-by-record instead of repeatedly comparing stale whole-device snapshots.
- Completed workout sessions, exercise rows and performed sets are uploaded as revisioned cloud records.
- Active/in-progress workouts remain excluded until completion.
- Scheduled/current programme day is included in Programme sync.
- Legacy device snapshots are still readable for transition but are removed after successful record-level exchange.
- Manual and automatic sync should settle to the same shared state instead of repeatedly reporting the same stale workout-log differences.

## Local-first UI fixes
- Tracker add/edit/delete/value changes render immediately on the current device; cloud sync follows afterwards.
- Deleting a workout-history session removes the session and all child exercise/set rows in one local operation before syncing the deletion.
- Pending local tombstones cannot be resurrected by stale remote records.

## Workout/account polish
- Account identity is hidden during active workouts and completed-workout/share-summary screens.
- On ordinary sections, the account control shares the same header row as the section title and does not shift the title downward.
- Workout Complete and Share are neutral/white.
- PROGRESS is green only when its count is above zero; REDUCE/attention is red only when non-zero/actionable.
- Destructive warning copy is bold but not red merely because it is a warning.

## Database
No new Supabase SQL is required for PWA 1.6.2. The existing `training_sync_records` schema already supports the record-level records and programme schedule state used here. No IndexedDB schema reset is required.
