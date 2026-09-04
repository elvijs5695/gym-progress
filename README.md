# Gym Progress PWA v1.6.0

Local-first Gym Progress PWA paired with Android v1.5.0.

This release enables real authenticated bidirectional exchange for **Programme**, **completed Workout history**, and **Tracker** while preserving a complete offline local copy. It also includes adaptive progression/fatigue explanations, grouped superset workout stages and a revised full-width workout summary.

## Required database step
Before testing account sync, follow `DATABASE_UPDATE_INSTRUCTIONS_1.5.0_1.6.0.md` and run the included Supabase update SQL. Local PWA storage upgrades automatically; do not clear site data.

Run `npm run check` for release static validation.
