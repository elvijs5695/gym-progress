# Gym Progress PWA v1.7.2

Paired release: **PWA 1.7.2 / Android 1.6.2**.

- Sync-conflict text now receives the available row width instead of being squeezed by the radio control.
- Each completed exercise can store its own optional comment; new workouts no longer ask for one workout-wide comment.
- Active-workout `Next` advances by exercise/superset stage, not set.
- Startup renders IndexedDB state before optional rules/cloud work; local data remains authoritative.
- Temporary network/server failures no longer erase the saved login session.
- Workout volume progress uses the same total-volume basis as the displayed absolute volume.

No Supabase schema migration is required. Existing IndexedDB data is preserved and normalised to internal state v8. Do not clear site data.
