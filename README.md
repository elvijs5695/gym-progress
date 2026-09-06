# Gym Progress PWA v1.7.1

Paired release: **PWA 1.7.1 / Android 1.6.1**.

This release changes Tracker persistence to match its intended purpose: current-day progress rather than an accumulating history log.

- `tracker_item` remains persistent configuration.
- `tracker_state` is one mutable current-day state per Tracker item.
- The same state record resets to zero on the next local day instead of creating another dated history row.
- Legacy `tracker_entry` data is migration input only: today's value is preserved; older values are intentionally discarded.
- Account sync exchanges `tracker_item` + `tracker_state`; historical cloud `tracker_entry` rows are ignored by current clients.

PWA 1.7.1 keeps the existing IndexedDB database/store identity and performs an internal v6 -> v7 state migration with a recovery snapshot. Do not clear site data.

No Supabase schema migration is required. After both current clients are installed, the recommended cloud cleanup is a per-account backup and clean reseed; see `DATABASE_UPDATE_INSTRUCTIONS_1.6.1_1.7.1.md`.
