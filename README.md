# CURRENT RELEASE: Android 1.6.8 / PWA 1.7.8

See RELEASE_NOTES_1.6.8_1.7.8.md and UI_PARITY_CONTRACT_1.6.8_1.7.8.md. No new database migration is needed for this update.

# Gym Progress PWA v1.7.8

Paired release: **Android 1.6.8 / PWA 1.7.8**.

Offline-first web client with locally persisted workout data and a public, read-only Supabase exercise reference catalogue. Shared substitutions are cached for offline operation; refresh is non-blocking.

**No new SQL migration for 1.6.8/1.7.8.** Earlier catalogue/social SQL migrations must already be applied if you use those features. Historical instructions are retained below: The SQL is at `supabase/SUPABASE_EXERCISE_REFERENCE_CARDIO_UPDATE_1.6.5_1.7.5.sql`.

Run `npm run check` before deployment. Latest changes: `RELEASE_NOTES_1.6.6_1.7.6.md`.

New workout / cardio flow and rest-preserving exercise management: `RELEASE_NOTES_1.6.6_1.7.6.md`. **No new SQL migration** for 1.6.6/1.7.6.
