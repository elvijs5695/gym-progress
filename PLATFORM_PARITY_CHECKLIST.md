# Platform parity and release checklist

Release: **Gym Progress 2.0.1**. Authoritative requirements: `RELEASE_CONTRACT.md`.

## Current status

| Gate | Status |
|---|---|
| PWA final automated test/build receipt | Focused Node tests and source build passed; full suite pending due to unavailable test dependencies; see TEST_RESULTS.md |
| PWA real-device acceptance | Pending user testing |
| Existing production v2 schema | Already deployed by user; **no new SQL migration in 2.0.1** |
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
