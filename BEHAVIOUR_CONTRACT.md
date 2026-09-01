# Gym Progress cross-platform behaviour contract

Android is authoritative. PWA must reproduce the externally observable rules below.

- Failure records only successfully completed repetitions plus the Failure flag.
- RIR is mandatory for a completed working set, including Failure.
- A skipped set is retained in history but excluded from volume/e1RM/progression.
- Dumbbell weight is the weight of one dumbbell; Pair volume uses multiplier 2.
- Plain bodyweight progression changes repetitions, not kilograms.
- Loaded exercises respond to failed performance with a future load reduction, not a rep
  reduction; all advice remains optional.
- A single failed set does not force workout-level Failure. Aborted is separate and absolute.
- Aborted sessions stay in Logs but are excluded from Progress and future baselines.
- Programme edits affect future sessions only; historical snapshots remain immutable.
- Barbell manual adjustment uses 0.25 kg; progression advice remains performance-sensitive.
- Full backup is versioned/restorable; analysis export is a separate format.
- Existing local data must survive ordinary application updates.

## Friends / social contract

- Account use is optional and must not change training behaviour or local persistence.
- Private programme/log/Progress data is never uploaded as part of social sync.
- Friend lookup is exact e-mail only; confirmed requests are mutual friendships represented by one shared relationship row. Either friend can remove that relationship for both users.
- Only explicitly selected post-workout cards are published; default is private.
- Workout summary and record comments are optional, limited to 500 characters, and the comment field is shown only after that card is selected for sharing.
- Weight records compare completed working-set maximums with older sessions only.
- Rep records compare completed reps at the same weight with older sessions only.
- Social effort is stored as a stable language-neutral key and localized by the viewing client.
- Feed pagination is cursor-based in batches of 20.
- Deleting a social event never deletes or edits the local workout.
- Unseen friend activity, incoming requests and accepted-request confirmations may badge Friends but cannot interrupt a workout. Friend request/acceptance notifications are social metadata, not training data.

## v1.5.10 Tracker/chart/rest contract
- Tracker settings expose the master notification switch and Edit/Delete actions; deleting an item must not trigger a general data reset.
- Tracker current-day state rolls over by local calendar date at midnight while prior dated entries remain stored.
- Weight/e1RM chart grids use human-readable gym-friendly intervals rather than arbitrary fraction-derived labels.
- Friend comparison always renders an isolated qualifying point, including an overlap-safe marker when both users occupy the same chart coordinate.
- Rest Skip must work both in the normal REST phase and while ENTRY/SUPERSET_ENTRY is displaying a still-active rest object.
