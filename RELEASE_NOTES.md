# Gym Progress PWA v1.5.20 — 2026-09-04

## Active workout
- Simplified status to `N/X • Next: Exercise`; ramp-up, working sets and unload remain under the exercise name.
- Added a thin live full-width workout-progress indicator driven by completed work, live timed-set progress and rest progress.

## Progress
- **All occurrences** now aligns programme occurrences by cycle/exposure index and uses the strongest occurrence result for max weight, total volume and e1RM.
- Specific occurrence selection remains unchanged.

## Adaptive progression & fatigue intelligence
- New deterministic `progression-intelligence.js` layer above the existing immediate progression/autoregulation rules.
- Separates recommendation (`PROGRESS / HOLD / REDUCE`) from accepted/declined user decision.
- Learns exercise-specific recent progression rhythm in exposures, protects calibration/rapid-adaptation phases and evaluates recent normalised performance with a deadband.
- Adds explainable exercise trend states and confidence/reason codes.
- Adds conservative multi-workout fatigue persistence (`NORMAL / WATCH / FATIGUE_SUSPECTED / DELOAD_CANDIDATE`).
- Workout completion shows a compact trend/overall interpretation; detailed exports retain diagnostic fields for later threshold tuning.

## Local-first sync foundation
- Existing IndexedDB database/store/key identity remains unchanged.
- State internal version advances to 5 and adds `sync_foundation` shadow metadata with a stable device ID, separate programme/workout-log domain state, stable record UUIDs, revisions, pending flags and deletion tombstones.
- Existing local training data is normalised non-destructively; a pre-foundation recovery snapshot is retained during first migration.
- Future local creates/updates/deletes update the shadow sync metadata before persistence.
- Backup schema advances to `gym-progress-backup-v5`; older v1-v4 backups remain importable and receive missing sync identities locally.
- Supabase foundation SQL supplies private owner-scoped record storage and programme recovery snapshots.
- **Actual cloud exchange/merge, conflict handling and fresh-device restore are deliberately not activated in v1.5.20.**
