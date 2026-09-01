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
