# Executed production verification — 2.0.0

Reviewed **21 November 2026 (Europe/Riga)**. Packaged application build: **`2.0.0-88a2d0d54909`**.

## Results

| Suite | Executed result |
|---|---:|
| Application/domain/workflow/auth/sync/storage, including real converted fixtures | **187/187 passed** |
| Clean public source without private fixtures | **178 passed; 3 private-fixture groups skipped; 0 failed** |
| UI foundations and component contracts | **16/16 passed** |
| PostgreSQL with original snapshot reconciliation | **51/51 passed** |
| Standard synthetic SQL suite | **40/40 passed — included in the 51 above** |
| Separate production cutover, ownership, rejection and rollback checks | **41/41 passed** |
| Production presentation action tests | **10/10 passed — included in the application suite** |
| Independent DOM matrix | **32 states + 8 dialogs; 0 app errors** |
| Complete release build and isolated public-source rebuild | **Same `2.0.0-88a2d0d54909`** |

The final gate was `npm run check`: client tests, UI checks, synthetic SQL and build. It was repeated in a clean source tree with no private conversion directory, to verify that the delivered public source stands alone. Private fixture tests ran against the actual converted snapshot; public CI skips those three clearly labelled groups and needs no private data or Supabase credentials.

## What was exercised

Application scenarios include full strength/cardio/mixed/superset sessions, exact decimal loads, mandatory RIR and optional RPE, field-specific invalid values, N/A versus zero, elapsed-time freezing, repeated taps, progression acceptance, unloading for both superset members, timed weighted work, Undo/Redo of recorded and programme values, navigation/drafts, optional notes, partial/discard finish and nonblocking summary. Background-section simulations verify one-shot rest/cardio sounds, exact timed endpoints and deferred prompts without replacing another form.

Tracker tests exercise rapid changes, direct entry, targets and daily rollover. Sharing SQL covers friendship acceptance/removal, feed visibility, comparison ownership and effort categories. Presentation actions check actual DOM labels, headings, retained navigation, custom names, EN/LV catalogue names, input validation, deletion cancellation and metric-specific source focus/return.

The authentication tests include resend coalescing/cooldown, invalid/incomplete codes, rate limits, token refresh races, account switching, delayed response bodies and explicit dialog cancellation. A cancelled send/verify cannot reopen login, replace another form, store late credentials or reset the cooldown. Successful verification still enters the exact account workspace and opens the sync review. All network responses in these client simulations were intercepted.

Storage/sync tests cover queued writes, stale-tab revisions, workspace changes during async operations, idempotent retries, paginated snapshots, conflict preservation, source precision, explicit erasure epochs and failed-local-cleanup recovery. The real converted fixtures round-trip through import, normalization, persistence, Progress and scoped erasure while retaining original records and unresolved evidence.

## SQL and data evidence

The real app snapshot reconciles **2,511 original rows / 21,059 original column values / 1,543 training records / 25,048 payload leaves**, with **0 mismatches**. All three original profiles and all 347 catalogue links remain. Four original orphan records and 38 Tracker aliases are preserved and reported.

SQL ran in isolated PostgreSQL through PGlite with actual training data and synthetic Auth accounts. The 41 production checks include exact preflight, altered-source/schema/function/dependency rejection, rollback after an injected import failure, successful promotion, original Auth fingerprints, public EN/LV catalogue refresh, current-client fencing, account bootstrap, cross-account rejection, explicit erasure and immediate rollback. They also verify refusal to repeat the migration or roll back over new data.

## Reproducible asset evidence

The final offline application asset manifest contains **60 assets / 1,480,030 uncompressed bytes**, compared with **4,344,067 bytes** in the supplied PWA 1.7.10 cache manifest: **65.9% less**. Most of the reduction comes from removing photo celebration assets. This compares listed cacheable application assets, excludes ZIP compression and release documentation, and is **not a measured startup, battery or frame-rate improvement**.

Persistence tests establish zero changed primary collection-row writes for a no-change save and one for a one-row edit. Full-state cloning and metadata writes still exist. No mobile timing claim is made.

## Limits and pending acceptance

Chromium could not start because this environment blocked its process socket. HappyDOM verifies structure/actions, not pixel rendering; its documented native-select parser workaround is confined to the harness. No mobile screenshots, visual certification or screen-reader test is claimed.

Live Supabase migration, real code-email delivery, Windows PowerShell execution, genuine multi-connection HTTP stress, phone installation/update/offline behaviour, background/locked-screen notifications, wake lock and mobile keyboards were not exercised here. `RELEASE_REVIEW.md` identifies the focused user checks. Android has not been built or parity-certified.

## Receipts

The source package contains `reports/release-check.log`, `public-source-check.log`, `release-summary.json`, `database-test.json`, `original-data-sql-tests.json` and `production-migration-tests.json`. Logs use synthetic labels/aggregate counts; private source records are distributed only in the separate private package.
