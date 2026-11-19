# Android / PWA UX parity contract — 1.6.7 / 1.7.7

Applies equally to both clients; platform-specific exceptions are explicit.

1. After warming up, before the first exercise and each new exercise, show a BEFORE EXERCISE card with Later / Replace / Skip (where applicable) and Begin exercise.
2. Once Begin exercise is pressed, hide those management actions from the working set/activity. Change exercise returns to the choice screen only while no set has been completed; for active cardio the timer will restart.
3. During a rest after a set, display REST and NEXT cards separately. NEXT SET appears without exercise management actions when staying on the same exercise; NEXT EXERCISE shows actions if changing exercises.
4. Later / Replace / Skip affects the upcoming target, not the rest timer; the timer, source set, start/end time and reminders must remain unchanged. The next label/weight reflects the resulting action.
5. Replacements with external loads require a valid positive weight; bodyweight/cardio replacements do not require a kilogram value. Unverified manual choices are not labelled equivalent.
6. Cardio is one continuous duration-based activity: elapsed time counts up with a green bar indicating percentage of target duration completed. Unlike a timer, target completion does not automatically stop the activity.
7. Cardio's optional distance, HR, power and RPE can be N/A; missing values are stored as null and omitted from charts. A short RPE explanation appears in the capture form.
8. Cardio load (duration × session RPE) is displayed prominently in cardio logs; mixed-session summaries separately display cardio load and strength volume, not a combined percentage.
9. Progress comparisons are per selected exercise, separating cardio performance from strength e1RM and volume.
10. After completion, cardio activity is available for Friends sharing with the duration record schema update.
11. Android-only: notifications are updated/cancelled when no longer relevant; PWA uses web notification facilities independently.
