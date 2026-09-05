# Gym Progress PWA v1.6.3

Local-first Gym Progress PWA paired with Android v1.5.1.

This patch makes the Gym Progress account an app-level concept rather than a Friends-only control, improves sync onboarding for already-authenticated users, clarifies progression/trend terminology, and adds cloud-aware destructive data/account controls.

## Required database step
**Manual Supabase action is required before using cloud erase or Delete account.** Follow `DATABASE_UPDATE_INSTRUCTIONS_1.5.1_1.6.3.md` and run `supabase/SUPABASE_ACCOUNT_DATA_CONTROL_UPDATE_1.5.1_1.6.3.sql` once. This is applied after the previous social + training-sync migrations.

PWA IndexedDB needs no manual migration and must not be cleared during update.

Run `npm run check` for release static validation.
