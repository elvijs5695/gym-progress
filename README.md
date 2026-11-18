# Gym Progress PWA v1.7.5

Paired release: **Android 1.6.5 / PWA 1.7.5**.

Offline-first web client with locally persisted workout data and a public, read-only Supabase exercise reference catalogue. Shared substitutions are cached for offline operation; refresh is non-blocking.

**Run the additive Supabase migration** documented in `DATABASE_UPDATE_INSTRUCTIONS_1.6.5_1.7.5.md` before deployment. The SQL is at `supabase/SUPABASE_EXERCISE_REFERENCE_CARDIO_UPDATE_1.6.5_1.7.5.sql`.

Run `npm run check` before deployment. Latest changes: `RELEASE_NOTES_1.6.5_1.7.5.md`.
