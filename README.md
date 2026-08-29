# Gym Progress PWA v1.5.2

Emergency recovery build after the v1.5.0 local-state migration issue and the v1.5.1 mixed service-worker module-cache blank screen.

Key recovery protections:
- version-busted top-level module imports;
- network-first service-worker handling for application code/config;
- visible startup/module-load fallback;
- no automatic empty-state overwrite on a missing IndexedDB read;
- migration record-count validation;
- standalone `recovery.html` that can restore a good pre-update JSON backup even if the main app does not load.
