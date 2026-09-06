# Gym Progress PWA v1.7.1 — 2026-09-05

## Tracker current-state model

Tracker now stores and syncs one current daily state per Tracker item instead of accumulating one row for every item/day combination.

- Tracker item definitions remain persistent.
- Today's amount is preserved during upgrade.
- Older Tracker daily values are intentionally not retained as history.
- At local day rollover the current state becomes today's state with amount zero; no historical row is created.
- Sync now uses the `tracker_state` entity type and ignores legacy cloud `tracker_entry` rows.

This keeps Tracker's normal cloud working set proportional to the number of Tracker items rather than the number of days the app has been used.

## Database

No IndexedDB database/store version change and no Supabase schema SQL are required. Internal state normalisation advances to v7 and backup schema to `gym-progress-backup-v6`.

Existing legacy cloud Tracker rows are intentionally left untouched until the controlled per-account cloud reseed described in the database instructions.
