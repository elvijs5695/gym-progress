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
