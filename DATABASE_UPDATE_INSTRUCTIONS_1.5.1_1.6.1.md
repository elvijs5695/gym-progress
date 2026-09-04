# Gym Progress database update — Android 1.5.1 / PWA 1.6.1

## Is a database update required?

**Yes. This Supabase SQL update is mandatory before using the new cloud erase or Delete account buttons.**

Android local Room: **no manual database action** for this patch. The Room schema remains v14.

PWA IndexedDB: **no manual database action**. Existing local data is kept and the PWA updates in place.

Supabase: **manual SQL action required once**.

## Before you run it

Your project should already have the database changes from Android 1.5.0 / PWA 1.6.0:

1. Gym Progress social schema (`public.profiles` exists).
2. Training sync foundation (`public.training_sync_records` exists).
3. Tracker domain update (the `domain` constraint allows `programme`, `workout_log`, and `tracker`).

Check the two required tables in Supabase SQL Editor:

```sql
select
  to_regclass('public.profiles') as profiles,
  to_regclass('public.training_sync_records') as training_sync_records;
```

Both result cells should contain the table name, not `null`.

If one is `null`, do **not** run the new update first. Apply the earlier Gym Progress social/training-sync setup supplied with the previous release, then return here.

## Apply the update

1. Open your Supabase project.
2. Open **SQL Editor**.
3. Choose **New query**.
4. Open `SUPABASE_ACCOUNT_DATA_CONTROL_UPDATE_1.5.1_1.6.1.sql` from this release.
5. Copy the whole file into the SQL Editor.
6. Press **Run** once.
7. The script is transactional. If an error is raised, the migration is rolled back.

Expected final verification output: two functions, both with `security_definer = true`:

- `gym_delete_my_account`
- `gym_erase_my_training_cloud`

You can re-run the file if needed; the functions and grants are replaced safely.

## What the new functions do

### `gym_erase_my_training_cloud('workout_log')`

Used by **Erase exercise log data** while signed in. It deletes this account's:

- synced workout-history snapshot rows;
- shared workout/record activity derived from that history;
- friend-comparison e1RM points derived from that history.

It keeps programme sync, Tracker sync, profile/account and friendships.

### `gym_erase_my_training_cloud('all')`

Used by **Erase all training data** while signed in. It deletes this account's:

- Programme / Workout history / Tracker sync rows;
- programme recovery snapshots;
- shared workout/record activity;
- friend-comparison e1RM points;
- user-created catalogue-candidate rows where present.

It keeps the login account, profile and friendships.

The client performs the cloud deletion **before** local deletion. If cloud deletion fails, local data is deliberately left untouched and the app reports the failure.

### `gym_delete_my_account()`

Used by **Delete account**. It permanently deletes the authenticated `auth.users` row. Existing Gym Progress foreign keys cascade that deletion through profile, friendships, social notifications/activity, comparison points and training sync. User-created rows that would otherwise be anonymised are explicitly removed first.

The app also erases the local training copy on the device after the server confirms account deletion.

## Verification before testing destructive actions

Sign in, then run:

```sql
select auth.uid();
```

In the SQL Editor this normally returns `null` because the editor is not the app user session; that is expected. Do **not** manually execute the RPC from SQL Editor as another user. Test it from the app UI using a disposable test account.

Recommended test:

1. Create a disposable Gym Progress account.
2. Enable Programme, Workout history and Tracker sync.
3. Confirm `training_sync_records` contains rows for that account.
4. Use **Erase exercise log data** and confirm only workout-history/derived rows disappear.
5. Recreate test data.
6. Use **Erase all training data** and confirm the account/profile remains but training sync rows disappear.
7. Recreate test data again.
8. Use **Delete account** and confirm the user disappears from Supabase Authentication → Users and their profile/training/social rows are gone.

## Important warning

These operations are destructive and have no server-side undo unless you separately maintain a database backup. The UI therefore uses explicit warnings and a second confirmation for the broadest delete operations.
