# Gym Progress PWA architecture — v1.3

The PWA is a behavioural port of Android and remains a static, no-build GitHub Pages app.
Domain rules live in small pure JavaScript modules; `app.js` coordinates UI and events;
IndexedDB is the local source of truth. Historical sessions are snapshots.

## Performance rules

- Visible clocks update at whole-second cadence; user actions update immediately.
- Timer ticks never rebuild the complete screen.
- Persistence calls from one UI event are coalesced and IndexedDB writes stay ordered.
- Service-worker navigation is network-first with an offline shell fallback.
- Versioned same-origin assets render cache-first and refresh in the background.
- Static PWA notifications remain best-effort; the UI must not imply native reliability.

## Compatibility

Existing IndexedDB state and backup formats remain readable. v1.3 intentionally avoids a
destructive storage rewrite; future normalised stores should be introduced behind the same
persistence adapter and dual-read during migration.
