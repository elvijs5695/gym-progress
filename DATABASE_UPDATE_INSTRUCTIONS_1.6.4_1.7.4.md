# Gym Progress 1.6.4 / 1.7.4 — database upgrade

Upgrade Android without uninstalling. Room automatically migrates **18→19** by adding nullable `distanceKm REAL`, `averageHeartRateBpm INTEGER`, `averagePowerWatts INTEGER` and `sessionRpe INTEGER` to the local `performed_sets` table. The migration retains all existing records. PWA retains its existing IndexedDB database. **Do not run Android `ALTER TABLE` statements in Supabase.** Supabase `training_sync_records` remains generic JSON; no schema migration is necessary. Do not clear local app or site data.
