# Gym Progress PWA v1.6.0 — 2026-09-05

## Feature release

### Real account sync
- Programme, completed workout history and Tracker now exchange through the signed-in account.
- First sign-in/review reports differing local/cloud workouts, exercises, logs and Tracker records before merge.
- Sync remains local-first: logout or network failure never deletes local training data.
- Automatic checks run on launch/resume, reconnect, relevant navigation, local changes, workout completion and a periodic active-app interval.
- Active/in-progress workouts are deliberately excluded until completion.
- Genuine same-record conflicts are surfaced for review instead of silently replacing a whole database.

### Tracker sync
- Tracker item settings and daily Tracker entries are part of the `tracker` sync domain.
- This requires the included Supabase database update before testing cloud sync. See `DATABASE_UPDATE_INSTRUCTIONS_1.5.0_1.6.0.md`.

### Workout UI
- Warm-up, stretching and the final complete state show only the workout progress bar; no misleading `Next` text.
- A superset counts as one workout stage (`x/y`).
- Share cards are selectable by clicking/tapping the whole card.
- Share cards use the workout day/name directly; the old `Shareable workout card` label is removed.
- Post-workout exercise rows no longer repeat per-exercise volume; layout is redistributed around the useful result.
- Workout summary uses the full mobile width. PROGRESS is green; HOLD/NORMAL remain neutral; REDUCE, slowing/stalled/declining states and recovery attention are red.

### What’s new / intelligence
- The first-open What’s New panel now calls out account sync and explains PROGRESS, HOLD and REDUCE plus the main longer-term trend labels.

### Input safety
- Free-text inputs now have practical caps (exercise/workout names, Tracker names, e-mail fields, notes/comments).

## Database
**Manual Supabase action required.** Run `supabase/SUPABASE_TRAINING_SYNC_UPDATE_1.5.0_1.6.0.sql` before testing Tracker/account sync. PWA local IndexedDB migration is automatic and non-destructive.
