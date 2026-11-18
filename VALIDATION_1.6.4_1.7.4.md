# Validation — Gym Progress Android 1.6.4 / PWA 1.7.4

## Checks actually performed

- PWA `npm run check`: PASS (80 project files).
- PWA `node --check app.js`: PASS.
- PWA `node tools/release-164-smoke.mjs`: PASS (barbell warm-up weights 97.5/120/170 kg, machine 0.5 kg rounding, basic exercise-alternative matching, cardio lifting-volume isolation, exact user-entered weights, summary formulas).
- Android `python3 tools/validate_source.py`: PASS (53 Kotlin files and historical identity/sync/migration safeguards; upgraded checks explicitly test version 1.6.4/Room v19 and cardio fields).
- Android ramp calculator compiled with actual Kotlin compiler and ran in a minimal independent test harness: PASS, 97.5 -> 50/70/90, 120 -> 60/80/100, 170 -> 90/120/140, machine 102.5 -> 56.5/77/92.
- Android Room history `@Query` SQL parsed and executed using in-memory SQLite against a matching table-column mock: PASS (checks SQLite syntax, NOT Room code generation or real migrations).
- All release ZIP archives: ZIP CRC integrity and member presence checked after packaging.

## Not verified in this environment

**Android was not compiled with Gradle `assembleDebug`.** This environment has no Android SDK / Gradle wrapper or configured Gradle installation. Kotlin source-token validation and a calculator-only Kotlin compile are NOT a full Android build.

The following still require manual/device/integration verification:

1. Android Studio Gradle `:app:assembleDebug` and install over Android 1.6.3 (Room v18 -> v19), retaining local data.
2. Active workout rest timer after a suggested reduction displays the accepted next-set weight, on-screen and in Android notification.
3. Workout completion stores the general private session note; exercise notes/share notes remain distinct.
4. Exercise `Later / Replace / Skip`, including when rest leads into a new exercise, and substitute ranking by equivalence then known loads from other programme days.
5. Cardio logging, History, Progress charts (duration/distance/pace/HR/power), offline persistence and Android/PWA sync/restore; cardio must not contribute to lifting volume/e1RM.
6. Tracker first-click and rapid repeated `+` taps; validate no lost increments during async persistence.
7. Android and PWA cold-start, large Logs, session changes and scroll smoothness.
8. Automatic sentence capitalisation depends on users' keyboard/browser implementation.

No Supabase schema change is required. Keep the app installed, and do NOT clear Room/IndexedDB data. Use both latest clients for cardio sync because older apps do not understand the new fields.
