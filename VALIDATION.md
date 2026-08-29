# Gym Progress PWA v1.5.0 validation

`npm run check` passes and currently checks **52 PWA files**. The release validator covers:

- JavaScript syntax for all JS/MJS files;
- canonical performance-rule cases;
- service-worker asset coverage;
- stable UserExercise/ProgrammeExercise ID Progress selectors;
- 191-exercise / 27-family catalogue and 32-user / 42-occurrence reviewed migration assets;
- conservative legacy migration that never canonical-links from display-name similarity alone;
- comparison-grade e1RM rules and programme-selected friend comparison;
- retroactive comparison-history reconciliation through `social_replace_exercise_comparison_points`;
- timed/mat exercises, supersets, ramp controls, Tracker, current chart geometry/units;
- required Supabase migration, backup, pre-check and post-check assets.

The two supplied production JSON backups were also run through the new identity migration independently: no template/session exercise was left without UserExercise/ProgrammeExercise IDs and no duplicate ProgrammeExercise IDs were generated.

Live browser/device and production-Supabase execution remain user validation steps.
