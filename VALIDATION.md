# PWA v1.5.2 validation

- JavaScript syntax checked for all JS/MJS files.
- All non-DOM application modules imported successfully in Node.
- Release validator passed, including the shared performance-rule cases, catalogue counts, reviewed migration counts, friend-comparison rules, timed/mat exercises, supersets, Tracker and migration safeguards.
- v1.5.2 avoids a hard dependency on the new db.js recovery export, so an old service-worker-cached db.js cannot cause a named-export module-link failure.
- Top-level imports are version-busted for the first load after deployment.
- Service worker uses network-first code/config loading with offline cache fallback.
- Standalone recovery.html is included for restoring a pre-update JSON backup directly into the original IndexedDB if the normal app cannot render.

Runtime/device/browser validation remains required on the user's deployed PWA.
