# PWA v1.7.1 validation

- Version/cache markers: **1.7.1**.
- Internal state schema: v7.
- Backup schema: `gym-progress-backup-v6`.
- One `tracker_state` per Tracker item; today's legacy value is preserved and older values are discarded.
- Sync foundation exchanges `tracker_state`, removes legacy local `tracker_entry` metadata, and does not recognise `tracker_entry` as a current cloud entity.
- Midnight rollover updates the same logical state instead of adding a history row.
- Empty-cloud reseed remains supported because canonical eligible records are uploaded during sync even if previously clean.
- Existing stable-ID/revision/tombstone/alias sync guards remain enabled.
- No Supabase schema migration.

Validation is run with `npm run check`, including JavaScript syntax checks and architecture regression guards.
