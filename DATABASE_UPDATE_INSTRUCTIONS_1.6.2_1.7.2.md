# Database update — Android 1.6.2 / PWA 1.7.2

## Supabase

**No Supabase schema migration is required for this release.**

The existing generic `training_sync_records` structure already carries the new `note` property inside the `session_exercise` payload. Existing cloud rows without `note` are treated as `note = ""` by both new clients.

## Android

Install Android 1.6.2 **over** the existing app. Do not uninstall the old app and do not clear app data.

Room upgrades from schema 17 to 18 with:

```sql
ALTER TABLE session_exercises
ADD COLUMN note TEXT NOT NULL DEFAULT '';
```

This is registered as a normal non-destructive Room migration. Existing programme, workout history, performed sets, Tracker state and sync metadata are preserved.

## PWA

PWA 1.7.2 keeps the existing IndexedDB database/store identity. Its internal state version advances to v8 and normalises every `session_exercise` to contain an exercise `note` string. Existing data is preserved; do not clear site data.

## Historical Tracker cleanup

The previous `tracker_entry` history cleanup remains independent of this release. Current clients use `tracker_item` + `tracker_state`; no new historical Tracker rows are introduced by this update.
