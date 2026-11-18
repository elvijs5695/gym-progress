# Gym Progress — Release 1.6.4 Android / 1.7.4 PWA

## Major new capabilities

1. **Cardio logging.** Time/duration, optional distance, average heart rate, average power and session RPE; pace derived from distance and time. Cardio has its own exercise mode and is excluded from lifting volume and e1RM. Progress displays neutral, separate duration, distance, pace, average heart-rate and power charts rather than inventing a universal improvement percentage. Progress displays neutral, separate duration, distance, pace, average heart-rate and power charts rather than inventing a universal improvement percentage. Training load (duration in minutes × session RPE) is optional, not a fitness score.
2. **Workout-only exercise replacement.** During the workout, including rest before a new exercise, use **Later / Replace / Skip**. Alternatives are restricted to explicit verified analogue links or compatible canonical movement families. Ranking prioritises exercise suitability, then an equivalent exercise used on other programme days with recorded weights. Replacements use their own last working weight (editable); the original programme is not modified.
3. **Practical automatic barbell ramps.** Automatic warm-up plates use the 20 kg bar and 10/15/20 kg plates per side. No 1.25/2.5/5 kg plates in ramp sets. Example 97.5 work -> 50/70/90 ramp; 120 -> 60/80/100; 170 -> 90/120/140. Other equipment rounds suggestions to 0.5 kg. Working weights entered manually stay exact.
4. **Accurate rest prescription.** Countdown/next-set information reads the current prescribed load *after* autoregulation or a manual adjustment, not a cached prior weight.
5. **Private whole-workout comments return.** Optional overall log note on workout completion, separate from per-exercise notes and social sharing comments.

## Performance and small fixes

- Tracker `+` responds optimistically before disk/cloud sync, with safe persistence of each increment.
- PWA Logs renders history in batches and indexes sets by exercise rather than scanning all sets repeatedly.
- Android Logs memoises session metrics during scrolling instead of recalculating them for each card.
- Comment text inputs request automatic sentence capitalisation.
- Existing workout history, templates, local IDs and cloud sync data are retained.

## Upgrade and database

- Android versionCode **16004**, Room **v19**, non-destructive migration **18 → 19** adds nullable cardio fields to `performed_sets`. Install over the existing app; do not uninstall/clear data.
- PWA **1.7.4** uses the existing IndexedDB storage. Deploy the complete PWA, including the new `exercise-alternatives.js` file and the updated service worker.
- **No Supabase SQL schema change required.** Sync records keep their existing schema with optional new JSON payload properties.
- Legacy clients do not understand the new cardio fields; use current Android/PWA versions on devices that synchronise after using new features.

## Verification limitations

The PWA project validator, JS syntax checks and Kotlin executable ramp tests can be run in this environment. Full Android `assembleDebug`, Room device migration, Supabase round-trip, notification behaviour and interactive UI/fitness use need a real Android SDK/device or browser with a working account. Static checks are not equivalent to successful Android compilation.
