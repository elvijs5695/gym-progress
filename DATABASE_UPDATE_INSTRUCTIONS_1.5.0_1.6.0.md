# Gym Progress database update — Android 1.5.0 / PWA 1.6.0

## Required before testing account sync

This release contains the first client-side programme, workout-history and Tracker cloud exchange. One **manual Supabase update is required**. Android Room and PWA IndexedDB changes are automatic.

### 1. Back up Supabase first
Use the Supabase dashboard backup available for your project, or otherwise make sure you can restore the project before changing production schema. The migration only changes one CHECK constraint, but a backup is still recommended.

### 2. Check whether the training sync foundation already exists
In **Supabase Dashboard → SQL Editor → New query**, run:

```sql
select to_regclass('public.training_sync_records') as training_sync_table;
```

- If the result is `training_sync_records`, continue to step 3.
- If the result is `null`, first run the full file `SUPABASE_TRAINING_SYNC_FOUNDATION.sql`, then continue to step 3. The foundation file included with this release already allows all three domains: `programme`, `workout_log`, `tracker`.

### 3. Run the release update
Open `SUPABASE_TRAINING_SYNC_UPDATE_1.5.0_1.6.0.sql`, paste the **whole file** into the SQL Editor and click **Run** once.

It changes the existing domain constraint from:

```text
programme | workout_log
```

to:

```text
programme | workout_log | tracker
```

It also reapplies authenticated API privileges and keeps anonymous access revoked. Existing rows are not deleted or rewritten.

### 4. Verify the constraint
The update file ends with a verification query. Its result must contain:

```sql
CHECK ((domain = ANY (ARRAY['programme'::text, 'workout_log'::text, 'tracker'::text])))
```

Equivalent PostgreSQL formatting is fine as long as all three domain names are present.

You can also run:

```sql
select domain, entity_type, count(*)
from public.training_sync_records
group by domain, entity_type
order by domain, entity_type;
```

Immediately after the SQL update it is normal for this query to return **zero rows**. Rows appear only after an authenticated device enables and performs training-data sync.

## What the apps migrate automatically

### Android 1.5.0
Room migrates **database v13 → v14 automatically on first launch**. It:
- adds the Tracker sync domain;
- adds/retains stable sync identities, revisions and tombstones;
- backfills existing Tracker items and Tracker daily entries into local sync metadata;
- installs local change triggers so later programme, workout-history and Tracker edits become pending sync changes.

Do **not** clear app data or reinstall to force this migration. Existing local training data is preserved.

### PWA 1.6.0
The existing IndexedDB/state is upgraded automatically during normal loading. It adds/updates local sync metadata for Programme, Workout history and Tracker without replacing the local database.

Do **not** clear browser/site storage before upgrading if you want to preserve local data.

## First two-device sync test

After applying the SQL update:

1. Open updated Gym Progress on **Device A**.
2. Sign in. The app should offer/review sync for **Programme**, **Workout history** and **Tracker**.
3. Leave all three selected and choose sync/merge.
4. In Supabase run:

```sql
select owner_id, domain, entity_type, sync_id, updated_at
from public.training_sync_records
order by owner_id, domain, updated_at;
```

With all three domains enabled you should normally see **3 `device_snapshot` rows for Device A** — one per domain.

5. Open updated Gym Progress on **Device B** with different local data and sign into the **same account**.
6. It should report the detected differences (workouts/logs/exercises/Tracker records) and offer a merge.
7. Sync all three domains. Afterward the same query should normally show **6 snapshot rows** — three for each device.
8. Reopen/check Device A. Its automatic sync check should receive Device B's merged changes.

The exact row count can be lower if you deliberately disable a domain.

## Automatic sync triggers in this release
Once a domain has been enabled, the clients check/synchronise on normal app activity, including:
- app/PWA launch and authenticated resume;
- returning online;
- periodic checks while the app is active (approximately once per minute);
- completed workout;
- local programme/Tracker changes after persistence;
- opening relevant Programme, Log or Settings routes.

An active/in-progress workout itself is **not uploaded**. It becomes eligible after completion.

## Expected failure if the SQL update is skipped
If the old foundation is still limited to `programme` and `workout_log`, Tracker snapshot upload is rejected by PostgreSQL's CHECK constraint. The client should report **“Sync failed — local data safe”**. Your local programme, workout history and Tracker data remain intact.

## Logout behaviour
Signing out only stops authenticated cloud exchange. It does **not** delete local programme, workout history or Tracker data.
