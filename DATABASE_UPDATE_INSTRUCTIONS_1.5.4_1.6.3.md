# Gym Progress database update — Android 1.5.4 / PWA 1.6.3

## Required action
**No new database SQL is required for this hotfix.**

Keep the Supabase migrations already applied for 1.5.0/1.6.0 and 1.5.1/1.6.1. Do not rerun or alter the database to fix the `ON CONFLICT DO UPDATE command cannot affect row a second time` error; that error was caused by duplicate rows inside a client upsert batch and is fixed in client code.

- Android Room: remains schema v14; no manual action.
- PWA IndexedDB: no schema reset; do not clear site data.
- Supabase: no new SQL.

After installing/deploying the hotfix, run Sync again. Existing cloud records can remain in place.
