# PWA v1.6.0 validation

- `npm run check`: PASS — 64 PWA files checked.
- JavaScript syntax validation: PASS.
- Release checks cover real Programme/Workout history/Tracker sync orchestration, active-workout exclusion, sync migration assets, grouped superset stage counter, input limits, post-workout colour semantics and service-worker caching.
- Manual two-device Supabase integration test remains required after applying the database SQL because the validation environment does not use the user’s live Supabase project.
