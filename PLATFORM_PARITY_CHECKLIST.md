## v2.1.2 additional acceptance requirement — PWA refresh and sync

The shared app must check for verified PWA updates and run account sync on normal reload/refresh without a button. Real Firefox Android/Windows tests and pending update recovery are unverified. The Android APK bundles its own shared frontend; Android upgrades require a new APK (source UI parity does not imply web deployment auto-updates the native package). Read `docs/AUTO_UPDATE_AND_SYNC.md`.

# Platform parity and release checklist

Release: **Gym Progress 2.0.2**. Authoritative requirements: `RELEASE_CONTRACT.md`.

## Current status

| Gate | Status |
|---|---|
| PWA final automated test/build receipt | Focused Node tests and source build passed; full suite pending due to unavailable test dependencies; see TEST_RESULTS.md |
| PWA real-device acceptance | Pending user testing |
| Existing production v2 schema | Already deployed by user; **no new SQL migration in 2.0.2** |
| Android package | Not built |
| Android functional and visual parity | Not tested; not parity-certified |

Record the source revision, build identifier, test command/date and device/browser or Android/WebView version beside each completed gate. Do not mark a platform passed merely because the other platform passed.

## Required release checks

- [ ] **Shared source:** both platform packages identify the same application version and reuse the same UI, domain modules, translations and fixtures; no independent behaviour/style branch exists.
- [ ] **Data and identity:** original account UUIDs own the correct programmes, logs, Tracker records and social relationships; guest/account separation and switching do not leak or overwrite data.
- [ ] **Migration:** current backup, exact snapshot freshness, expected schema, transaction/rollback, stale-client protection and final row/value checks pass. All unresolved records remain available and reported.
- [ ] **Authentication/configuration:** original production project, email-code login, session refresh/sign-out and code resend/error states work; no beta controls or secret credentials enter the app artifact.
- [ ] **Workout lifecycle:** strength, bodyweight, timed/cardio, mixed days, supersets, ramp-up, unload, skip-today, postponement, substitution, stretching and partial/full finish preserve recorded work.
- [ ] **Navigation/history:** Home, all main sections, log drilldown and system Back behave consistently; active drafts survive navigation; Undo/Redo confirmations, exact values and disabled states match.
- [ ] **Timers/sounds:** rest countdown/ready, cardio target/finish and timed endpoints behave correctly while browsing other app sections. Test each platform's foreground/background/locked-screen limits explicitly.
- [ ] **Measurements:** shared fixtures and real-data conversion checks cover decimals, null/zero, actual versus planned values, dumbbell conventions, skipped work, strength volume/e1RM and separate cardio measurements.
- [ ] **Core views:** Home structure and properly spaced `6 exercises · next` metadata, programme grip ordering, Tracker, Own Rhythm, Shared Rhythm, friends, explicit sharing, comparison, progress bars and source-linked Progress entries work on both platforms. Check pastel rhythm dots are unclipped, cards neutral and effort labels coloured.
- [ ] **Visual parity:** compare matching states at equivalent phone widths in light, dark and system themes. Check typography, card borders/tints, spacing, icons, controls, dialogs, navigation, loading/error/empty states, large text and keyboard insets.
- [ ] **Language/input:** EN and LV cover static/dynamic text, validation, sound/notification labels and accessibility labels. Catalogue names localise; custom names remain intact. Decimal input/display conventions match.
- [ ] **Recovery/update:** idle windows activate automatically when verified, active workouts/unsaved work block updates, and open tabs coordinate safely. Check offline launch, pending writes, backup/restore, account switching and deletion/recovery boundaries without clearing user data.
- [ ] **Finish:** summary content and sharing are identical; viewport animation is nonblocking and respects reduced motion.
- [ ] **Acceptance/evidence:** final receipts match the packaged build; real-device findings are recorded; the user accepts PWA before Android release work is represented as complete.

## Permitted OS-specific differences

Only operating-system necessities may differ. Record each one before certifying parity.

| Difference | Why the OS requires it | Shared behaviour preserved | Device evidence / acceptance |
|---|---|---|---|
| None approved yet | — | — | Pending Android implementation |

Potential adapter areas include permissions, installation, native notifications/share/export, safe areas, screen wakefulness and system Back. This list is not blanket approval for feature or visual divergence. Document any limitation, its user-visible consequence and the tested fallback.

### v2.0.2 visual acceptance

- [ ] Friends shows `+ Add friend` beside username within a constant-height header (narrow screens retain an accessible `+` control); no duplicated Add friend block lower down.
- [ ] Home uses exact `6 exercises · next` spacing and a compact header-to-rotation gap.
- [ ] Strength/cardio mixed rating has two separately coloured lines; neutral card surface.
- [ ] Workout metrics fit three across where practical; cardio remains accessible in one scrollable row.
- [ ] Tracker notifications work or fail silently when service-worker notifications are unavailable; login remains functional.

- [ ] Active workout header: 60px fixed height across all phases; day/timer beside Undo, Redo, Home and Exit on row one; stage (`1/x`) and current exercise on row two. Long translated exercise names are truncated without growing the header. Verify at 320px/375px and in EN/LV. Android must use the same hierarchy.

- [ ] Name limits: new day labels <=30, new custom exercise labels <=60; old/imported names are not shortened or destroyed. Both clients reject overlength edits with localized validation. Long day/exercise labels truncate visually only, including a full-name access mechanism.

### v2.0.3 PWA/Android acceptance points

- Active workout: taller self-contained header, left-stacked day and elapsed timer against four icon controls, one-line stage + exercise, no clipped controls.
- Active set card: uniformly thin border, no top accent for strength, timed/cardio or supersets.
- Log: date regular + day bold on line one; coloured strength/cardio grades left on line two; neutral headings above data.
- Cardio metrics evenly spaced one-row; localised short `Training load` label.
- Add friend in Friends list card header even at friend count zero, no top-bar action.

### v2.0.4 cross-platform acceptance (PWA now; Android parity pending)

- [ ] Log cards: effort is final element; mixed Strength retains volume, volume progress and four equally sized Cardio metrics
- [ ] Compact header matches standard section height, with two ellipsised text lines at 320/360/390 px and four visible 40 px actions
- [ ] Rest audio: one short warning at 30 seconds, one beep each at 3/2/1, and a longer start cue at zero (background suspension must not queue tones)
- [ ] Notice dialogs: green 2 px outline and contrasting grey background in light, dark and system dark settings
- [ ] Existing users who acknowledged 1.x receive cumulative 2.x What's New after account sync; acknowledgement persists and does not repeat on reload
- [ ] Android must reuse exactly the same components, cue rules, colours, labels, and release change history; no independent UI fork


### v2.1.0 parity and stabilisation acceptance

- [ ] On both PWA and future Android, Friends shows an explicit account-level comparison ON/OFF, initially OFF, and only displays others' comparable e1RM when **both users opt in**. OFF withdraws points server-side even when another device is stale.
- [ ] Client uses stable cloud workout UUIDs for comparison IDs, never device-local session numbers; no write is attempted merely on entering Friends.
- [ ] Exactly entered 0 kg is preserved through entry, save, restart and cloud sync. Training calculations use recorded data, not the plan.
- [ ] Tracker historical entries still load after archiving referenced items, including on a second device.
- [ ] Workout ramp/rest/set Undo/Redo can restore phase and input state without rewinding overall workout duration, and cannot touch older workouts. The 2.1.0 journal is only within one live app session.
- [ ] Four actual equal-width Cardio Log columns and consistent metric labels are inspected at real phone widths in both themes and languages; UI source rules alone are not evidence.
- [ ] Original two Auth accounts and training databases survive the full-backup/migrate/verify sequence. No new Supabase project, account duplication or secret committed to Pages.
- [ ] Android remains unbuilt; do not mark cross-platform parity complete until the same source and real Android tests pass.


### v2.1.1 LATEST superseding parity gate — Android + PWA

**Note:** Earlier version-specific checklist entries remain historical evidence, not current UI requirements. The current Friends and cardio order is defined in `RELEASE_CONTRACT.md` v2.1.1 and the latest feedback entry.

- [ ] Friends header has **no plus**; expanded Friends list ends with a **right-aligned `+ Add friend` action**, including empty state.
- [ ] Settings alone contains account-level **Compare exercises** consent; Friends comparison card says **enable in Settings** when OFF and offers a friend/exercise chooser when ON. Verify actual server withdrawal from another account/device.
- [ ] Cardio Log metrics 1–4 retain equal widths and show **Avg cardio HR as second, RPE as third**; EN/LV and light/dark at 320/360/390 px.
- [ ] Android APK packages exact same `dist/` app asset versions and does not embed independently maintained UI or workout rules; record a matching SHA256 release ID and identical user-visible states.
- [ ] In a **real Android phone**, lock screen during 60-second rest; check warning at 30 seconds, beeps at 3/2/1, long beep and lock-screen notification at zero. No duplicate foreground WebAudio; adjust/skip/cancel rest clears stale alerts.
- [ ] Timed strength and cardio reach target with a single native long sound and lock-screen notification. Cardio logging must still require user completion (no false automatic finish).
- [ ] Android shows permission status for notifications and exact alarms. Denial must not be misreported as readiness; test permission recovery, background/Doze, reboot, battery saver, DND and OS restrictions.
- [ ] Android process reclaimed/backgrounded: OS-native scheduled alarms still work. Force-stop is explicitly excluded as an OS constraint.
- [ ] Native `Tracker`/motivation reminders with the app closed: **NOT IMPLEMENTED**; do not falsely mark covered by the workout alarm implementation.
- [ ] Android APK successfully compiled, signed appropriately for the intended upgrade, installed, visual parity tested and acceptance evidence recorded. **PENDING**.
