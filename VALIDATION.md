# PWA v1.5.20 validation

Date: 2026-09-04

- PWA static validator: PASS (61 files checked after adding the integration validator).
- JavaScript syntax validation: PASS.
- `tools/validate_intelligence.mjs`: PASS.
  - verifies HOLD/ON_TRACK personal-rhythm interpretation on synthetic exposure history;
  - verifies persisted confidence/reason data and NORMAL workout state;
  - verifies stable sync ID retention on edit, revision increment and deletion tombstone creation.
- IndexedDB database/store/key identity remains unchanged.
- Backup schema: `gym-progress-backup-v5`; v1-v4 remain accepted.
- Service worker includes `progression-intelligence.js` and `sync-foundation.js`.
- Supabase training-sync foundation is transactional, private under RLS, authenticated-only and anonymous access is revoked.

Recommended browser smoke tests:
1. Update existing site data in place and confirm programme/history are intact.
2. Resume an active workout and verify simplified Next + progress bar through ramp/set/rest/timed/unload phases.
3. Finish a workout and inspect trend/recovery summary.
4. Compare All occurrences with a specific occurrence in Progress.
5. Export/restore a v5 backup and import one older backup.
