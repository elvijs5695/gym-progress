# Gym Progress PWA v1.5.13 — 2026-09-01

- Kept elapsed time and stage (`x/y`) fixed in the active-workout status line.
- Added overflow-only horizontal marquee for `Now / Next`; short status text stays static.
- Added startup image preload + decode for `finish-celebration.png`; the service worker continues to precache it.
- Standardised PWA expand/collapse chevrons on the Friends-panel SVG design, including workout cards, Friends comparison and Starter programme details.
- Preserved the 4.4 s finish celebration introduced in v1.5.12.

No IndexedDB or Supabase schema migration.
