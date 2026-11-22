## 2.2.3 refinements (current; earlier sections remain historical)

- Use a unified design language: shared design tokens and focus-safe controls; a custom searchable picker only where a long exercise list warrants it. Preserve native semantics for small selection sets.
- A trend summary must never report plateau without adequate personal observations; use individualised progression-history assessment, label low-confidence data as calibrating and avoid diagnosing fitness or health.
- Do not interrupt an active workout for a PWA update or reload. Persist and sync signed-in records before activating a new version. Transient bootstrap/sync may defer an automatic update requested on refresh; an actual pending upload, workout or unsaved input vetoes a silent delayed update.
- Release notes should appear on Android independently of service worker capability and must not visibly outline their title. No separate rescue or deployment link in the UI.

---

# Current release contract amendment — Gym Progress 2.2.1

The Android workout must show exactly one ongoing silent status notification, not rest-finished notifications. Sounds must be native-only on Android, with 3 short countdown cues and one long completion cue plus one exercise-entry reminder each minute. PWA and Android share workout/UI logic; remove redundant Home icon from active header while retaining bottom navigation. Previous release text below is historical where contradictory. See `docs/RELEASE_2_2_1_HANDOVER.md`.

---

# Gym Progress 2.2.0 — current release guidance (supersedes historical sections below)

**Use `docs/RELEASE_2_2_0_HANDOVER.md` as the authoritative takeover guide**. It documents the user-approved guest/account ownership model, automatic sync, safe PWA update gate, Android-native reminders/audio, the current test evidence and remaining physical-device gates. Any conflicting 2.1.x paragraphs below are historical notes, **not** current policy. No GitHub connector or production backend changes were used in preparing this candidate.

---

## v2.1.4 release/refresh contract — mandatory

On a normal PWA load or browser refresh, check for a newer verified release automatically; apply it once the current local state is durable, sync and workspace transitions finish, no workout/form is active and open tabs confirm idle. Do not require a Settings button, erase browser storage, silently drop any unsynced changes or force-switch mid-workout. For an older cached 2.1.1 client incapable of running the new code, serve a one-time recovery page from the network without unregistering the worker or clearing IndexedDB. A signed-in refresh must start cloud reconciliation of programme, workout logs and Tracker automatically; retry on reconnect/foreground; preserve conflicts and missing-parent records for review. Android source continues to reuse the same frontend with native OS adapters, but a new APK is required to ship a new bundled release.

# Gym Progress release contract

Applies to the production v2 line, beginning with **2.0.0** (updated for **2.1.1**). This contract records the user's release requirements. A later explicit user decision may change them; implementation convenience does not.

## One app on both platforms

The PWA and the future Android release must match **functionality and visual UI**. Share the production application source, domain calculations, state transitions, components, design tokens, translations and test fixtures. Do not maintain independent PWA and Android behaviour or style branches.

The preferred Android implementation packages the same built application and uses small native adapters where the operating system requires them. An adapter may handle installation, permissions, notifications, sounds, screen wakefulness, system Back, file access or native sharing. It must not duplicate workout rules, alter recorded values or redesign screens. Record every unavoidable platform difference in the parity checklist, with its reason and acceptance evidence.

Use the same release version and identifiable source/build revision for a PWA/Android pair. A platform may ship later while it is being tested, but it must not be called equivalent or parity-certified before its checks pass. Android work follows the user's acceptance of this PWA release.

## Features and data that must survive

- Retain programme creation/editing, accessible grip reordering, rotation, custom/catalogue exercises, substitutions, postponement, supersets, ramp-up, unload/skip-today, stretching and detailed logs.
- Retain strength, bodyweight, timed and cardio workflows, exact manual loads, RIR/RPE explanations, progress bars, progression proposals and source-linked Progress entries.
- Retain Tracker, Own Rhythm, Shared Rhythm, friends, explicit sharing, comparison, sound controls, backups, restoration and exports. Publishing a workout remains a deliberate user action.
- Keep active workout navigation reversible. Home and section changes must preserve recorded work and entered drafts. Undo/Redo require concise confirmations and restore recorded values and accepted programme changes. Unavailable history controls stay visible and disabled.
- Preserve timer endpoints and cardio's explicit finish/pause behaviour. In-app navigation must not silence workout alarms or add browsing time to automatically completed timed sets. Native background execution differences require documented device tests.
- Do not remove or silently replace a feature, history row, original value, custom name, unknown extension or unresolved relationship during a release. Preserve unresolved source evidence and explain it in the conversion report.

## Shared measurements and presentation

Calculations come from shared production modules and fixtures. Use recorded values, never invented performed values derived from a plan. Preserve decimal precision, null versus zero, per-dumbbell conventions, missing measurements, skipped work and source ownership. Strength volume/e1RM must remain separate from cardio duration, distance, power, heart rate, RPE and training load. New calculation rules need a documented rationale and regression cases.

Use the same compact component system and light/dark/system themes on both platforms: consistent typography roles, spacing, borders, controls, warning messages and selected states. Match layouts at equivalent viewport sizes while respecting safe areas, keyboard insets and accessibility settings. Keep both languages complete, including dynamic dialogs, validation, accessibility labels and notifications. Display decimal values with a **dot** in both Latvian and English, per the user’s current preference; accept comma or dot when parsing input without rounding a manually chosen load. Localise catalogue-provided names by stable identity; preserve user-authored names and their stored values.

Keep copy concise and useful. Retain explanations of tracking logic and fitness terms; omit promotional or repeated self-explanatory text. The finish summary is immediately usable; decorative animation respects reduced motion.

## Production identity and migration

Production connects to the original intended Supabase project and uses email-code login. It must contain no beta project picker, password-only testing shortcut, beta endpoint override or alternate account mapping based on guessed names/emails.

Preserve each original user's Auth UUID and ownership relationships. Keep guest and authenticated local workspaces isolated; guard delayed work against account switches. Public client configuration may contain the intended publishable key. Database passwords, service-role/secret keys, Auth dumps, session tokens and private conversion data must never enter the public repository, app bundle or Pages artifact.

A database promotion must have a verified current backup, snapshot/schema/ownership preflight, write protection against stale clients, transactional failure behaviour, count/value verification and a documented rollback. Preserve Supabase Auth and platform-managed schemas. For future migrations, use an explicitly approved snapshot policy, current backup and verified rollback; do not silently drop source changes. Do not clear an entire database or browser storage as a troubleshooting shortcut. Package private migration data separately from publishable application files.

## Release evidence and acceptance

Every release includes source, a reproducible built PWA, concise what's-new notes, deployment/migration instructions, conversion findings, test receipts and the platform parity checklist. Identify the exact tested build and distinguish simulated, database, browser and real-device checks. A passing automated test is not proof of mobile layout, notification delivery, installation or live authentication.

**Current gate state (2.0.3):** PWA source build and focused Node tests are executed; full suite and live-device visual, notification and update checks remain pending as detailed in `docs/TEST_RESULTS.md`. Android has not been built and is not parity-certified. Update these statuses only from recorded evidence. Never describe a package as deployed, migrated or device-verified unless that outcome was observed.

## v2.0.4 log, countdown, and release announcement invariants

The latest user feedback in `docs/USER_FEEDBACK_HISTORY.md` supersedes previous header and Log effort placement requests. Keep workout Log effort after **all** metrics; retain the Strength Volume progress metric in mixed sessions; show four equally sized Cardio metrics. The active header is the standard fixed height with two ellipsised lines parallel to four controls. Rest audio is one short 30-second warning, short ticks at 3/2/1, and one long completion cue, not a double warning or buffered missed tones. Informational notice dialogs are visually distinct from editable forms.

The cumulative update announcement MUST actually be invoked after account bootstrap/sync using the v1.x last-acknowledged-version key. Do not mark a release read merely because a service worker activated or a page refreshed; acknowledgement is explicit. No production database changes are authorised for these UI fixes.


## v2.1.0 — accepted privacy, correctness and migration contract

1. **Account-level comparison sharing is opt-in and immediately revocable.** The default after upgrade is OFF, including existing accounts. Each participating friend must independently opt in. Per-exercise qualification still applies. Consent is enforced in the **database**, not only in the browser; stale clients cannot bypass revocation or silently republish on page entry. Stable cloud record identities replace device-local IDs. Explicit training/account erasure also removes any restricted historic comparison archive.
2. Preserve manually entered **zero weight** separately from a missing value. Never use truthiness (`||`) to choose planned weights over explicitly entered zero. Keep strength and cardio source measurements separate and accurate.
3. Preserve historical Tracker entries by **archiving** referenced definitions. Undo/Redo for supported ramp/rest/workout-stage transitions may change only the current workout and must never move the original workout-start clock; current 2.1.0 step journal is bounded and in memory, so refresh durability remains pending.
4. This upgrade must run on the original Supabase **v2** database, not reimport v1. It requires a current full backup (including private schemas), preflight, atomic SQL execution and postflight, preserving Auth, workouts, custom programmes, historical aliases and old import data. No manual table deletion or blind pg_restore to live Supabase.
5. PWA and later Android must reuse the accepted visual and functional contract. Android parity remains unverified and should not be represented as a completed release. Missing PG, browser or mobile tests must be disclosed.


## v2.1.1 — latest explicit decisions (SUPERSEDES older Friends/cardio placement)

1. **Add friend:** show `+ Add friend` only as the last, right-aligned action inside expanded Friends list; not in the top bar or list-card header. The empty list must offer it.
2. **Comparison consent:** an account-level allow/deny toggle belongs only in **Settings → Compare exercises**. In Friends, keep an expandable comparison card; OFF state explains Settings permission, ON state offers friend/exercise selection. The server-enforced two-user opt-in from v2.1.0 remains mandatory; no client-only override.
3. **Cardio Log:** Avg cardio HR is the **second** metric, RPE the **third** of four equal-width columns. Keep strength/cardio calculation semantics and effort placement.
4. **Functional and visual parity:** Android and PWA MUST use the same source for complete application UI, CSS, labels, values, timers, translations, domain/workout logic and release notes. The OS-specific Android native host may add permissions, Android notifications and alarm sound delivery required for native behaviour; it must not redraw or fork the app. Every divergence must be documented and device tested.
5. **Locked-screen Android alarms:** rest warnings, 3/2/1/0 cues and timed/cardio target notifications **must function with screen locked**. A JavaScript-only timer, foreground WebView or a promise to implement later does not meet this contract. Android-native scheduling, audio playback and visible OS notifications are required. Explicit notification and exact-alarm access are user-granted permissions; app must make incomplete access visible and must not silently treat denial as success.
6. **Release gate:** source implementation is not certification. No reliable locked-screen/Android claim until actual Android compilation and physical-device lock/background/permission tests pass, with corresponding receipts in the parity checklist. Continue retaining all feedback logs, wishlists, schema/runbook and verification limitations for agent handover.

## Mandatory GitHub Pages publication integrity

A website may only publish a **compiled release** from `dist/`, never raw `pwa/` development files. Source service worker is `pwa/sw.template.js`; the production `dist/sw.js` must embed the exact same manifest as `dist/release.json`, whose `version/id` must equal `dist/VERSION.txt`, with every asset hash and byte count verified by `npm run verify:deploy`. Publishing a raw service worker with `__RELEASE_MANIFEST__` is a release-blocking defect. Branch-root and source-build GitHub Actions publishing routes must not be mixed. Preserve existing local workouts, indexed databases and authentication; publication repair has no SQL migration.
