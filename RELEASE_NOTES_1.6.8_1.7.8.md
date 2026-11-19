# Gym Progress 1.6.8 / 1.7.8 — stabilisation

## Common Android/PWA behaviour
- Next exercise actions Later/Replace/Skip appear during rest; the same pre-exercise panel appears only if there was no preceding rest.
- Once an exercise begins, it has Back, Skip set/activity, Skip exercise; no Change exercise action. Back on first set returns to pre-exercise. With logged completed sets, Back reverses the latest saved set (confirmation of actual data changes recommended in UI tests).
- Rest Skip is primary within the rest card; Later/Replace/Skip are secondary actions in the next-exercise card.
- Cardio elapsed timer freezes when the user opens the optional-measurements dialog. Its captured duration is saved; Back resumes from the captured elapsed time rather than counting the time spent entering data.
- N/A visibly marks and disables the chosen field. No value is saved for it; N/A is null, not numeric zero.
- Cardio Progress shows Duration first and selects it by default, while keeping power, pace, HR, distance, RPE and load separately available.
- Logs show separate strength/cardio metrics for mixed sessions. Multiple cardio activities sum duration/distance/training load, but mean HR and mean RPE are calculated by duration-weighting ONLY activities with those measurements. Average power across modalities is deliberately not calculated.
- No new Supabase SQL/Room migration: existing columns and sync contract remain unchanged.

## Validation limits
PWA source validators and isolated state regression tests can be executed locally. The Android source is **not claimed to compile** without an actual Gradle assembleDebug build with Android SDK. UI fit and interaction need real-device/browser verification.

### Important data rules
- No user history or planned weights are rewritten by this release.
- `N/A` is an absent measurement (`NULL`/`null`); an actual input of zero is never used as its replacement.
- Cardio session time and distance are sums across cardio activities. Session heart rate is a **duration-weighted mean of activities with recorded HR**, not a mean of missing zeroes. Session RPE likewise uses only recorded RPE. Power is not averaged across different cardio modalities.
- An active first set cannot be "undone" as a saved record until it is saved. **Back to set** cancels the unsaved RIR/result-entry stage; after saving, Undo reverses the persisted set.
- During cardio data entry, the activity timer is paused at the captured duration. The general workout elapsed time may continue as normal.
