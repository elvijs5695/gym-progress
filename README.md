# Gym Progress PWA v1.5.11

Local-first Gym Progress PWA. Deploy over the existing site/origin and **do not clear browser/site data**. IndexedDB identity and recovery safeguards are unchanged.

## v1.5.11 highlights

- Active Current/Next cues now follow warm-up, ramp-up, working sets, result entry, rest, weight removal and stretching.
- Result-entry rest controls show only ±30 s; the dedicated rest screen keeps Skip.
- Active runtime recovery is hardened so a stale persisted phase can be rebuilt after returning/reloading instead of trapping the workout.
- Active set counters use compact `x/y` format in all languages and active-workout Latvian labels were cleaned up.
- Tracker progress fill stops before ± controls, with more spacing and a time marker based only on the configured active-time window.
- Friend comparison uses first comparison event → today as the default short-history domain when combined history is under 30 days.
- On Finish & Save, the supplied celebration photo animates in/fades out, then a detailed conclusion and shareable cards are shown.

No IndexedDB identity change and no Supabase schema migration are required.
