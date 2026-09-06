# Database update instructions — Android 1.6.0 / PWA 1.7.0

## Required database changes

**None.**

- Android remains on **Room v16**.
- PWA uses the existing IndexedDB schema.
- Existing Supabase `training_sync_records` schema and account-data migrations remain sufficient.
- Do not run new SQL.
- Do not uninstall the Android app, clear Android app data, clear PWA site data or delete IndexedDB.

## Upgrade

1. Install Android 1.6.0 over the existing Android release.
2. Deploy PWA 1.7.0 over the existing PWA files on the same origin.
3. Sign in normally.
4. Open **Review & sync now**. The dialog should appear immediately with a loading state.
5. After a successful unchanged sync, open review again. It should show **Up to date** and only **Close**.
6. Repeated unchanged sync checks must not increase `training_sync_records` row count.
