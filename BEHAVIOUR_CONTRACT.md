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
- Barbell manual adjustment uses 2.5 kg; progression advice remains performance-sensitive.
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

## v1.5.11 Tracker/chart/rest/phase contract
- Tracker settings expose the master notification switch and Edit/Delete actions; deleting an item must not trigger a general data reset.
- Tracker current-day state rolls over by local calendar date at midnight while prior dated entries remain stored.
- Weight/e1RM chart grids use human-readable gym-friendly intervals rather than arbitrary fraction-derived labels.
- Friend comparison always renders an isolated qualifying point, including an overlap-safe marker when both users occupy the same chart coordinate.
- Rest Skip must work both in the normal REST phase and while ENTRY/SUPERSET_ENTRY is displaying a still-active rest object.

- Current/Next active-workout cues follow the actual runtime phase and pending action.
- Result-entry rest never exposes Skip; dedicated REST may expose Skip.
- A stale persisted active runtime must be recoverable without deleting local workout data.
- Tracker time-position markers are based only on configured productive start/end times.

## v1.5.12 active-header / finish contract
- The active header shows elapsed time, optional focus-stage `x/y`, `Now`, and `Next` simultaneously; it does not alternate/fade these labels.
- Warm-up and stretching are not focus stages.
- Ramp-up, working sets, result entry, rest and deload belong to the same focus stage for that exercise.
- Two exercises joined as one superset count as one focus stage.
- The PWA finish celebration image uses a 4.4-second animation window before the conclusion/share screen.
- Selecting shareable cards must not reset the summary scroll position when comment fields appear/disappear.
- Weighted exercise conclusion rows identify both exercise volume and maximum weight reached.
