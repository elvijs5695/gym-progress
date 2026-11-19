# Gym Progress 1.6.6 / 1.7.6 — validation

## Executed

- `node --check app.js`: passed.
- `npm run check`: passed, **92 PWA files checked**.
- `node tools/validate-cardio.mjs`: passed (cardio analytics, missing effort, mixed workout, comparison guards, start without audio blocking).
- `node tools/validate-rest-actions.mjs`: passed (Later, Skip, Replace preserve a rest timer including phase/end timestamps and update the next exercise; PWA controls centred and evenly distributed).
- `node tools/validate-reference.mjs`: passed (SQL catalogue seeds, relationships, remote cache/offline fallback).
- `node tools/validate-rules.mjs`: passed (10 cases).
- `node tools/validate_intelligence.mjs`: passed (adaptive progression and local sync).
- `python tools/validate_source.py`: passed (**55 Kotlin source files**).
- Isolated Kotlin cardio-effort tests (`kotlinc`, Java): passed.
- Executable SQLite cardio-history query tests: passed.
- ZIP archive integrity and cross-package checks: passed.

## Not executed (must not be interpreted as verified)

- Full Android Gradle `:app:assembleDebug` and on-device Room upgrade: Android SDK/Gradle build environment unavailable here.
- End-to-end PWA in Chrome: container browser navigation to localhost was blocked by administrator. A mocked JavaScript start test was executed, not a live browser test.
- Live cross-device Supabase sync, live SQL migration, notifications under background restrictions and long-duration workouts: require testing with your deployment.

## Priority manual acceptance checks

1. In PWA create a cardio day, choose Running: editor must show **target duration in minutes**, not sets/rest/compound. Start the day and confirm active view opens.
2. Finish a cardio activity: logged duration, optional distance/HR/power/RPE are persisted; revisit exercise-specific cardio Progress.
3. Do three consecutive exercises A/B/C: after A, during the 90-second rest, choose **Later** for B. Ensure the timer stays on its original end time and **Next** changes to C. Test after next and end.
4. Repeat and choose **Replace** B. Ensure the timer continues and the next activity name/load update while programme remains intact.
5. Repeat and choose **Skip** B: timer unchanged, next is C. Skip the final remaining exercise while resting; timer should finish before stretching begins.
6. Confirm PWA Later/Replace/Skip are evenly distributed blue-grey buttons, visually distinct from Complete.
7. Repeat the rest tests in Android; confirm notification updates Next without restarting rest.
8. Log cardio-only RPE 6 and mixed cardio/strength day; confirm colour/effort is meaningful for cardio-only, neutral for mixed/unknown.
9. Check old strength workouts, progression estimates, manual weights (e.g. 28.75 kg), and offline sync unchanged.
