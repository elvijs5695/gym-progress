# Gym Progress release contract

Applies to the production v2 line, beginning with **2.0.0** (updated for **2.0.3**). This contract records the user's release requirements. A later explicit user decision may change them; implementation convenience does not.

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
