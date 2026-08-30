# Gym Progress PWA v1.5.8

Local-first Gym Progress PWA. Update over the existing site origin and **do not clear browser/site data**. The v1.5.2+ IndexedDB recovery protections remain unchanged.

## v1.5.8 highlights

- Restores the Logs screen and keeps all transient informational notices on one 3.0 s fade timing.
- Superset + controls overlap the boundary between programme cards; superset cards use the normal card colour.
- Heavy compound exercises can be supersetted. Timed exercises remain excluded from paired supersets because the paired workout UI is set/rep based.
- Unequal supersets (for example 3 sets + 2 sets) finish correctly without replaying the shorter exercise.
- A superset now uses one combined ramp-up flow for both exercises.
- Tracking mode is suggested from equipment but remains user-overridable; “Timed / mat” is now simply “Timed”.
- Tracker reminders for multi-increment goals use 0 / 25 / 50 / 75 / 100% day checkpoints.
- A compact English/Latvian “What’s new” brief appears once per version and cumulatively summarises the major UI/UX changes since PWA v1.5.0.

No new Supabase SQL is required.
