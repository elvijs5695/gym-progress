# PWA v1.7.2 validation

- Version/cache markers: **1.7.2**.
- Internal state schema: **v8**.
- Existing backup schema remains `gym-progress-backup-v6`; exercise notes are included as normal state fields.
- `node tools/validate.mjs`: **73 PWA files passed**.
- Performance-rule cases: **10 passed**.
- Adaptive-progression + local sync metadata tests: **passed**.
- JavaScript syntax checks for app, auth, training sync and metrics: **passed**.
- Regression guards cover conflict-row layout, stage-level Next, local-first startup, resilient auth refresh, Tracker current-state sync and stable record identity.
