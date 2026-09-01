# Gym Progress PWA v1.5.12

Local-first Gym Progress PWA. Deploy over the existing site/origin and **do not clear browser/site data**. IndexedDB identity and recovery safeguards are unchanged.

## v1.5.12 highlights

- Active-workout header no longer alternates/fades between Current and Next. Elapsed time, focus-stage number, **Now**, and **Next** are shown together.
- Warm-up and stretching are outside the stage count; ramp-up, exercise, result/rest and deload stay within the same focus stage.
- Supersets count as one focus stage.
- The finish celebration image remains visible for twice as long (4.4 s total animation window).
- Selecting shareable cards preserves the summary dialog/page scroll position when the optional comment field appears.
- Per-exercise workout conclusion now explicitly reports **Volume** and **Max weight** for weighted exercises, rather than an ambiguous weight value.
- Timed/bodyweight summaries retain modality-appropriate metrics.

No IndexedDB identity change and no Supabase schema migration are required.
