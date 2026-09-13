# Gym Progress PWA v1.7.2 — 2026-09-12

## Sync review
- Widened conflict-choice text: the label now consumes the remaining row width while the radio control has a fixed compact width.

## Workout comments and status
- Added one optional comment per exercise, prompted when that exercise finishes.
- Comments sync as part of `session_exercise`, survive backup/restore and appear in workout history/detail exports.
- New workouts no longer ask for a final workout-wide note; historical workout notes remain readable.
- `Next` now advances by exercise/superset stage instead of the next pending set; the final stage points to Stretching.

## Volume
- Workout total continues to sum every exercise occurrence.
- Workout percentage progress is now derived from current total volume versus previous identical-workout total volume, matching the absolute numbers shown.

## Login and local-first loading
- Failed token refresh only clears login when the refresh token is explicitly rejected (400/401/403); transient network/server failures keep the local session.
- IndexedDB loads and renders before the performance-rules fetch and before background cloud reconciliation.
- Periodic full training sync is reduced to five minutes, with existing launch/change/resume/online sync points retained.

## Data
- Internal state version advances to v8 to normalise `session_exercises.note`.
- No IndexedDB store-version change and no Supabase schema migration.
