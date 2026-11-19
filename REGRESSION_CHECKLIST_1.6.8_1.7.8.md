# Regression verification — Android 1.6.8 / PWA 1.7.8

## Required hands-on checks after building/deploying
1. On a narrow Android screen, confirm Later / Replace / Skip text fits in the pre-exercise panel.
2. First exercise, first set: Begin -> Set Complete -> Back to set -> Set Complete -> RIR -> Save; confirm only one set was saved.
3. During a later active exercise, Back/Skip set/Skip exercise are present; no Change exercise CTA.
4. During rest before a new exercise, the NEXT EXERCISE decisions work without resetting rest. When rest ends, the exercise starts without a second BEFORE EXERCISE panel; the first exercise without preceding rest still shows it.
5. Cardio: start, run for a short interval, open finish-form, leave it open for 30 seconds; confirm captured activity duration stays fixed. Cancel/back should resume the timer without counting the data-entry interval.
6. For each cardio measurement, toggle N/A on/off; confirm the input displays N/A and cannot be edited while selected. Saving must store null and Progress must omit the missing metric from its chart.
7. In Progress for a cardio exercise, Duration must be the first and initially selected metric. Switch exercise; verify the default resets to Duration.
8. In Logs, make a mixed workout with lifting and 2 cardio activities. Confirm both strength volume and cardio time/load appear. Where HR/RPE are available, check duration-weighted averages and that missing entries contribute neither zero nor imaginary values.
9. Confirm the separate REST skip button is visibly more prominent than NEXT EXERCISE management controls.
10. Confirm Android Room migrations and cloud sync preserve all pre-existing workout records and exact manual weights.

## Automated checks performed
- PWA source validator (includes module syntax)
- PWA existing workout-flow/cardio/rest and reference validators
- New PWA state tests for first-set Back, N/A, paused cardio duration, weighted cardio averages
- Android static validator (55 Kotlin source files)
- Isolated Kotlin exercise-day cardio calculation test

## Not verified here
- Real Android Gradle `assembleDebug`
- Android on-device Compose layout and interaction
- Real deployed PWA browser interaction
- Supabase remote sync on live accounts
