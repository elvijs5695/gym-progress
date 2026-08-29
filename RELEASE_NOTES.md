# Gym Progress PWA v1.5.2

## Recovery hotfix
- Fixes a blank screen possible on the first load after v1.5.1 when the previous service worker supplied an old cached `db.js` to the new `app.js`.
- Top-level ES-module dependencies are now version-busted.
- New service worker uses network-first handling for code/config files with cache fallback for offline use.
- Adds a visible module-load error fallback instead of an empty black page.
- Adds standalone `recovery.html` for restoring a pre-update JSON backup directly into the original IndexedDB.
- Retains the v1.5.1 protections against writing empty defaults after a missing initial state read.
