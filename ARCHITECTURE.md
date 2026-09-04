# Gym Progress PWA architecture — v1.4

The PWA is a static, no-build behavioural port of Android. IndexedDB remains the local source of truth for programme, active workout, logs, settings and history.

## Local application

- Pure JavaScript domain modules contain training rules.
- `app.js` coordinates UI and events.
- IndexedDB stores local training state.
- Visible clocks update at whole-second cadence and timer ticks do not rebuild the whole screen.
- The Service Worker provides the offline application shell.

## Optional social layer

`social-api.js` is an isolated Supabase adapter and `social-config.js` contains only the public project URL/publishable key. Account creation is optional. Supabase stores only identity, friendships, friend notifications, seen-state and activity cards the user explicitly publishes.

Private programme/log data is never sent to Supabase. Workout/record cards are calculated locally after Finish & Save; all share toggles default off. The social auth session is stored separately from IndexedDB training state and is not included in Gym Progress backups.

Social/API failures must degrade only the Friends feature. The rest of the PWA remains usable offline.

## v1.5.11 Tracker notification/phase state
Tracker item configuration remains in the existing IndexedDB app state. The master reminder switch is stored separately in localStorage (`gym-progress-tracker-notifications-enabled`) and therefore does not alter IndexedDB identity or migration requirements.

Normal Progress and friend comparison share the same `niceChartAxis` scale generator. Rest Skip now explicitly handles ENTRY/SUPERSET_ENTRY states that still own a rest object.

The v1.5.11 active-workout header is derived from runtime phase plus pending-set/ramp state. Resume validates runtime references and reconstructs a stale runtime from immutable session/set records when necessary. The finish-celebration image is part of the service-worker app shell. No IndexedDB schema identity changes are introduced.

## v1.5.12 focus-stage header and finish summary
The active header derives logical focus stages from ordered session exercises and collapses each superset group into one stage. Runtime phase determines whether stage numbering is shown. Current and next phase labels are displayed simultaneously. The finish summary keeps its state in the existing in-memory share draft; share-card rerenders restore dialog/page scroll instead of resetting it. No IndexedDB schema identity changes are introduced.

## v1.5.13 active header + finish image preload

The active header separates immutable-width status cells (elapsed time and focus-stage index) from an overflow viewport containing `Now / Next`. After render, the viewport is measured; marquee animation is enabled only when content overflows. The finish image is listed in the service-worker shell, preloaded from HTML and decoded eagerly at application startup to avoid first-use animation delay.

## v1.5.16 PWA interface simplification

- Home workout cards expose direct play without expansion; due-card scheduling controls and expansion remain independent.
- Active-workout top status is intentionally reduced to elapsed time plus focus-stage index. Warm-up/stretch are outside the focus-stage count; supersets remain one focus stage.
- Ramp-up cards separate ramp prescriptions from the final working target rather than repeating the exercise header.
- Transient status UI renders into the fixed `#status-root` overlay and never participates in normal page flow.
- The supplied curved-arrow asset is cached in the service worker and used for active-workout undo.


## v1.5.19 Tracker deadline pacing

Tracker rendering uses `trackerPace()` as the single source for the time marker, overdue state and reminder due amount. Increment-sized goals use equal completion windows across the configured productive span. If the number of increments exceeds the number of available hours, due checks are grouped into six evenly spaced checkpoints across the productive window. Home refreshes only the clock-dependent Tracker visuals every 10 minutes; IndexedDB state is unchanged.

Manual programme working weights intentionally bypass `snapSelectable`; selectable grading remains for +/- controls, ramp calculations and automatic progression.

## v1.5.20 adaptive intelligence

`progression-intelligence.js` sits above the existing immediate progression/future-adjustment rules. It derives personal exposure-based progression rhythm, normalised recent performance, explainable exercise trend/confidence and persistent workout-wide fatigue evidence. The rule layer is deterministic and stores reasons so Android/PWA outputs and exported histories can be compared during tuning.

## v1.5.20 sync-ready local metadata

`sync-foundation.js` preserves the existing IndexedDB identity and adds shadow metadata inside saved application state. It assigns stable global UUIDs, tracks record revisions/pending state/deletion tombstones and keeps programme/workout-log sync state separate. `persistImmediately()`/normal persistence updates this metadata before saving local state.

This is intentionally not a cloud cache architecture: local training data remains complete and usable without login. The supplied Supabase table is dormant infrastructure in this release. A later client must exchange records by stable IDs, preserve referential relationships, use per-domain cursors, merge programme fields safely and union/deduplicate workout history without destructive whole-state replacement.


## Account sync enabled in current release

The client now exchanges three independent private domains: `programme`, `workout_log` and `tracker`. Each device keeps its complete local database; Supabase stores per-device domain snapshots composed of stable record `sync_id`, revision, tombstone and payload data. Incoming records are relationship-aware and merged into local storage. Completed workout history is synchronised; active sessions are intentionally excluded. Same-record competing offline edits are treated as conflicts rather than authorising whole-database replacement.
