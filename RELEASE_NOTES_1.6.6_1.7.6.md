# Gym Progress — Android 1.6.6 / PWA 1.7.6

## New workout flow and performance (highest priority)

1. **Cardio activity workflow:** Cardio is a single continuous exercise with an editable target duration in minutes, not strength-style sets, seconds per set, rest, ramp-up or compound classification. During activity, elapsed time is displayed; the logged result can include duration, distance, average heart rate, average power and session RPE. Existing cardio rows remain compatible and strength exercise forms are unaffected.
2. **Exercise-specific cardio Progress:** Cardio and strength are never blended into a shared performance percentage. Cardio Progress defaults to measured power when available, otherwise pace (when distance and duration are known), otherwise duration. Separate metric views include distance, heart rate, RPE and training load. Matched-effort comparisons require RPE within 1 point, and comparable distance for pace or duration for power; otherwise no change percentage is asserted.
3. **Cardio effort on workout card and timeline:** A cardio-only workout shows an effort band from logged session RPE: 1–3 easy, 4–6 moderate, 7–8 hard, 9–10 very hard. Missing RPE is neutral. Mixed cardio/strength days have a neutral overall effort colour: RIR and cardio RPE are not averaged together. Session-RPE load (minutes x RPE) is displayed as training load, not an overall fitness score.
4. **PWA workout launch:** Starting a workout no longer waits for an AudioContext to become ready or for the full IndexedDB persistence commit before showing the active screen. Start failures surface as an error instead of silently doing nothing. This addresses an identified potential hang; actual browser/device reproduction remains a release test.
5. **Later / Replace / Skip during pre-exercise rest:** Management actions are available before the next exercise and update the upcoming target. **Rest remains running**: the start/end timestamps, countdown and elapsed-rest attribution are not reset, skipped or shortened. A replacement changes only that session and never a programme; the next name and prescription update immediately. Later reorders pending exercises. Skip marks the selected activity as skipped and moves the upcoming target to the next pending activity, or stretching after the timer expires. Rest remains untouched even for the last exercise.

## UI and compatibility fixes

6. **PWA action layout:** Three evenly distributed, centred blue-grey management buttons are visually distinct from the primary Complete action. When an eligible exercise lacks safe alternatives, Replace explains the absence instead of silently hiding.
7. **Android cardio display:** The in-progress cardio timer displays elapsed time at a more compact size with the target displayed separately; activity completion uses cardio language.
8. **Log presentation:** Cardio history shows relevant duration, distance, heart rate, power and effort, rather than zero-kilogram strength volume or lifting-specific RIR categories. Workout history distinguishes mixed sessions.
9. **Android rest notification:** A new rest-label-only refresh changes the notification's next-exercise name without modifying countdown timestamps.

## Data/storage

- **No new Supabase SQL migration in this release.** The corrected exercise reference and cardio catalogue SQL delivered for 1.6.5/1.7.5 is still required if not already installed.
- **No new Android Room migration:** remains v19; local old data retained.
- **No schema change to `training_sync_records`.** Cardio continues using the existing fields in set records.
- Public exercise catalogue and replacement cache remain offline-first and unchanged.

## Important limitations

- PWA unit/source tests and isolated Kotlin/SQLite tests passed. A complete Android `:app:assembleDebug` cannot be performed here (Android SDK/Gradle build environment absent).
- A live browser workout-start test was attempted, but the container Chromium denied access to localhost (`ERR_BLOCKED_BY_ADMINISTRATOR`). PWA launch is validated with isolated code tests; user-device testing is still necessary.
- Duration x RPE quantifies approximate session training load, **not a universal cardio performance score**. Power/pace are compared only within the same exercise and similar recorded effort/conditions.
