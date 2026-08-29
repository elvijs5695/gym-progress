# Gym Progress PWA v1.5.1

Emergency local-data preservation hotfix over v1.5.0.

- Keeps the existing IndexedDB database/store/key unchanged.
- Saves an exact pre-identity-migration recovery snapshot before first migration of legacy local data.
- Verifies programme/history row counts survive normalization before writing migrated state.
- Does not automatically persist empty defaults when IndexedDB returns no app state.
- Saves a pre-restore snapshot before importing a backup and validates backup migration before replacement.
- Existing v1.5.0 users whose local state was already replaced by empty defaults must restore their pre-update JSON backup; social data is cloud-backed and is unaffected.

---

# Gym Progress PWA v1.5.0

- Replaces exercise-name identity with persistent UserExercise and ProgrammeExercise UUIDs.
- Bundles the reviewed 191-exercise EN/LV canonical catalogue and migration map for the two production backups.
- Existing personal exercise names remain stable when interface language changes; catalogue linkage is separate from display name.
- Progress groups by userExerciseId and optionally programmeExerciseId. Completed exercises from aborted workouts remain eligible.
- Friend comparison is exact-canonical-match, user-opt-in per programme occurrence, and e1RM-only. Epley+RIR v1 qualifying rules are shared with Android.
- Adds timed/mat exercises, two-exercise supersets, max ramp-up set setting, plate-friendly barbell ramps, permanent ramp disable, normal rest after ramp, Next panel, reps emphasis and revised audio cues.
- Adds local Tracker card with targets, increments/manual amounts and productive-day reminders. Browser notifications while the PWA is not running still depend on platform Web Push support; this release does not add a push server.
- Includes Supabase catalogue/comparison SQL and a backup-first migration runbook.
