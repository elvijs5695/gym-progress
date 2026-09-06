# Database update — Android 1.6.1 / PWA 1.7.1

## What changes

Tracker is now modelled as current-day state rather than history:

- `tracker_item` = persistent Tracker definition;
- `tracker_state` = exactly one mutable current-day value per Tracker item;
- legacy `tracker_entry` = retired historical daily-row format.

Historical Tracker values are intentionally not used for analysis in this release.

## Android upgrade

Android 1.6.1 automatically migrates Room **v16 -> v17**. Install over the existing app and do not clear app data. Today's Tracker amount is retained; older Tracker daily rows are retired.

## PWA upgrade

PWA 1.7.1 keeps the same IndexedDB database/store identity. Its internal state normalisation upgrades from v6 to v7:

1. a pre-migration recovery snapshot is saved when training data exists;
2. today's legacy Tracker value is preserved;
3. one `tracker_state` is created per Tracker item;
4. older legacy Tracker daily entries are discarded;
5. legacy `tracker_entry` sync metadata is removed.

Do not clear site data.

## Supabase

**No Supabase schema migration is required.** `training_sync_records.entity_type` already supports the new `tracker_state` type.

Old cloud `tracker_entry` rows are ignored by Android 1.6.1 and PWA 1.7.1. They are intentionally not deleted automatically during normal sync.

## Recommended cloud cleanup

After installing the new clients, use `DATABASE_CLEAN_RESEED_1.6.1_1.7.1.sql`.

1. Verify one authoritative device contains the complete Programme, workout history, Tracker definitions and today's Tracker amounts.
2. Close all other Gym Progress clients.
3. Back up that account's `training_sync_records` rows.
4. Delete only that account's rows from `training_sync_records`.
5. Open the authoritative updated client and sync once. The empty cloud is repopulated from canonical local state even if those local records were already marked clean.
6. Sync again unchanged. Row count must remain stable and preview should report no differences.
7. Only then open/sync the second client.

After the clean reseed the Tracker domain should contain only `tracker_item` and `tracker_state` rows.
