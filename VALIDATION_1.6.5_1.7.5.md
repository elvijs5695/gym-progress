# Gym Progress Android 1.6.5 / PWA 1.7.5 — validation

## Checks performed in this environment

- Android project static validator: **PASS**, 54 Kotlin source files.
- The new Android reference catalogue classes were compiled with **stub Android/JSON/network types** using `kotlinc`: PASS. This tests only the isolated new components, not the complete Android project.
- PWA `npm run check`: **PASS**, JS syntax, existing formula, sync and catalogue guards.
- PWA SQL/mock/offline regression `node tools/validate-reference.mjs`: **PASS**, relationship mapping, cached catalogue, offline fallback, cardio category, authoritative published relationships.
- SQL migration static inspection: 14 seeded cardio exercises, 50 directed substitutions, and every substitution key resolves against the original or newly seeded catalogue.

## Checks NOT performed here

- **Full Android `:app:assembleDebug` was not run** (no Android SDK/Gradle toolchain available). The user's Android Studio build is required to confirm the reported compiler error is fully resolved and detect any subsequent compiler errors.
- **SQL was not executed** on a live/staging Supabase database. Run the included SQL in Supabase SQL Editor after backup, and verify the 205 exercise/50 substitution counts.
- No two-device Android/PWA live sync, offline reconnect, production deployment or interactive UI integration test was performed.

## Essential user-side acceptance tests

1. In Android Studio, run `:app:assembleDebug`; check `ActiveWorkoutScreen.kt` no longer reports unresolved `transientMessage`.
2. Apply the additive Supabase SQL and verify its result counts and read-only RPC using the verification queries in the instructions.
3. Open `Replace` for bench press, squat and deadlift on Android and PWA and confirm suitable alternatives. Check the list favours eligible exercises from the programme with known weights.
4. Go offline after one successful catalogue fetch: replacements and cardio catalogue remain available.
5. Confirm replacing an exercise does not change the original programme, other exercise load values or prior workout history.
6. Confirm cardio appears in exercise selection in both clients; cardio data remains excluded from strength-volume/e1RM calculations.
