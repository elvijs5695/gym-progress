GYM PROGRESS PWA 1.7.2 / ANDROID 1.6.1

Tracker now uses one current-day state per Tracker item instead of accumulating historical daily rows.

IMPORTANT DATABASE NOTE
- No new Supabase schema SQL.
- Deploy PWA 1.7.2 over the existing files on the same origin; do not clear site data.
- Install Android 1.6.1 over the existing app; Room migrates v16 -> v17 automatically.
- Today's Tracker values are preserved; older Tracker daily values are intentionally retired.
- Do not use the old cleanup procedure. After both clients are updated, use DATABASE_CLEAN_RESEED_1.6.1_1.7.2.sql for a controlled per-account cloud reseed.

Read DATABASE_UPDATE_INSTRUCTIONS_1.6.1_1.7.2.md before cloud cleanup.
