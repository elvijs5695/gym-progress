# Gym Progress Android 1.6.5 / PWA 1.7.5 — release notes

## Significant fixes and improvements

1. **Fix Android build failure**: corrected `ActiveWorkoutScreen.kt` local declaration order for `transientMessage` (formerly unresolved at line 190). This specific source error is addressed; a full Gradle build has not been run here.
2. **Shared SQL-based exercise substitutions**: Android and PWA now read equivalence/close links and priorities from one central Supabase reference catalogue instead of maintaining independent authoritative hard-coded mappings. The existing bundled mapping remains solely for first-install/offline fallback.
3. **Cardio in the shared SQL catalogue**: `category` distinguishes strength from cardio; 14 additional cardio exercises (including indoor/outdoor running, cycling, walking, rowing, elliptical, swimming, ski erg, stair climber, air bike, jump rope and hiking) are included with English/Latvian labels.
4. **Offline-first reference refresh**: a valid shared snapshot is cached on each device and refreshed in the background without delaying app startup; no Friends sign-in is required for public reference reads.
5. **Legacy exercise-ID compatibility**: old local workout exercise keys are mapped to stable canonical IDs when generating SQL substitution suggestions. Existing programme history and recorded weights are not rewritten.

## Additional PWA fix

Fixed a rest-transition JavaScript variable typo (`newE` vs `e`) that could throw at runtime in a ramp-up check.

## Technical/database notes

- **Supabase SQL migration required**: `supabase/SUPABASE_EXERCISE_REFERENCE_CARDIO_UPDATE_1.6.5_1.7.5.sql` (run in SQL editor after a backup).
- No `training_sync_records` schema change.
- No local Room schema migration (remains v19) and no IndexedDB data reset.
- Replacement ranking still prioritises suitable alternatives already appearing in another programme day and those with known working weights; weights from a different exercise are **never** converted automatically.

See `DATABASE_UPDATE_INSTRUCTIONS_1.6.5_1.7.5.md` and `VALIDATION_1.6.5_1.7.5.md`.
