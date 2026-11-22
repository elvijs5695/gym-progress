# Current handover entry — Gym Progress 2.2.1

Newest user requirement: Skipping an exercise must offer optional rest, never jump straight to the next exercise. Rest duration is planned duration or 60 s if unset; skipping an upcoming exercise during an ongoing rest preserves the original clock. Both clients share this state transition. Source tests passed; browser and physical Android QA pending.

Read `docs/RELEASE_2_2_1_HANDOVER.md`, `docs/RELEASE_2_2_1_ACCEPTANCE.md`, then `docs/ANDROID_LOCK_SCREEN_ALERTS.md`. Do not reintroduce redundant Home icons, individual rest-finished notifications, competing JS/Android audio owners or JS-only exercise reminders. Keep exactly one silent ongoing workout status notification, 3 short + 1 long audible countdown, and per-exercise minute reminders. Shared UI and workout model are authoritative. Phone build/lock test is still outstanding; never claim otherwise. Historical specifications follow.

---

# Gym Progress 2.2.0 — current release guidance (supersedes historical sections below)

**Use `docs/RELEASE_2_2_0_HANDOVER.md` as the authoritative takeover guide**. It documents the user-approved guest/account ownership model, automatic sync, safe PWA update gate, Android-native reminders/audio, the current test evidence and remaining physical-device gates. Any conflicting 2.1.x paragraphs below are historical notes, **not** current policy. No GitHub connector or production backend changes were used in preparing this candidate.

---

# 2.1.4 current authoritative build and update rules

- Do not infer that user uploaded source from a single HTTP 404. The 2.1.3 PWA ZIP included `deployment-status.json`; the website may serve a partial, stale or differently scoped deployment. Diagnose the served `sw.js`, `release.json`, Pages configuration and site URL.
- Current updater requires a complete, mutually matching generated `sw.js` + `release.json`. `deployment-status.json` is supplementary: if 404, allow worker verification; if present but inconsistent, fail closed. The worker itself verifies every released asset's SHA-256 before install.
- A verified worker may self-activate only when all open in-scope app clients explicitly confirm idle; silence/non-response is not consent. No clearing of browser storage, IndexedDB, caches, service-worker registrations or workout data.
- Normal browser refresh checks for updates and synchronises a signed-in account. No dedicated rescue link in app UI; optional Settings check remains.
- Android Studio **does not require local Node.js**: packaged `dist/` is the source of truth for the APK, with all manifest assets verified by Gradle. Maintainers modifying frontend source must run `npm run build` before Android assembly; CI regenerates assets before packaging. Include `dist/` in any Android-source ZIP.
- Keep AGP 9.3.0 / Gradle 9.9.2 / JDK 25 for Android Studio 2026.1.3. Native build and locked-screen alerts still require real-device checks.

---

## Current v2.1.3 release rule (22 November 2026)

PWA refresh **automatically** checks for a verified new service worker and **automatically** starts full account data synchronisation; there is no required manual Sync/Apply step. Activation is allowed only after local saves/in-flight sync have completed and all open app windows confirm idle. Preserve unsynchronised records; never wipe storage to fix a version mismatch or missing parent. See `docs/AUTO_UPDATE_AND_SYNC.md` for one-time recovery of old Firefox versions and acceptance tests. Keep exercise comparison low in Settings, after core workout controls. These rules supersede 2.1.1 manual update behaviour.

# Working on Gym Progress

## Read before changing the app

Read `RELEASE_CONTRACT.md`, `docs/USER_FEEDBACK_HISTORY.md`, `docs/WISHLIST.md`, `docs/PLATFORM_PARITY_CHECKLIST.md` and the relevant architecture/calculation/security documentation. The release contract records user requirements; explicit later user instructions govern scope. Do not introduce extra approval steps for work already authorised.

## Shared implementation

- Treat `pwa/` as the common application implementation. The Android host **must** reuse its behaviour and visual UI, with isolated OS adapters where necessary. Do not create separate copies of calculations, screen markup, style tokens or translations for Android.
- Change domain behaviour in the owning module, then exercise the shared cases in `shared-contracts/` and relevant workflow tests. Keep exact manual values, cardio/strength distinctions and stable exercise/account identities.
- Use the shared components, typography roles and design tokens. Audit light/dark, EN/LV, narrow screens, disabled/selected/error states and reduced motion for changed UI. Preserve user-authored text.
- Keep Home/section navigation, timers, draft capture and Undo/Redo safe across asynchronous work and account changes. Do not fix a presentation problem by discarding state or weakening ownership checks.

## Data and production boundaries

Never put private training/Auth dumps, converted personal SQL, passwords, service-role keys or tokens in this repository or `dist/`. Client publishable configuration belongs in the documented production configuration path. Do not reintroduce beta project controls or authentication bypasses.

Use disposable local test databases for development. A production migration must satisfy the release contract's backup, freshness, identity, transaction, verification and rollback requirements. Preserve Auth/platform schemas and unresolved records. Never use a schema reset, local-storage wipe or force overwrite to hide a migration/sync conflict.

## Verification and delivery

Use the Node version required by `package.json` (currently Node 24+). Run focused tests while implementing; use `npm run check` for the final application gate. Run the applicable private conversion/database checks when changing migration behaviour, keeping private fixtures outside the repository. Build the web artifact with the provided build script; publish its output, not unbuilt source files or private migration folders.

Update release notes, conversion findings and the parity checklist with actual evidence. State what changed, why, which build was tested and what remains pending. Do not claim live Supabase, browser, phone or Android verification from static inspection or synthetic DOM tests. Android source exists but APK compilation and locked-screen/visual parity remain unverified until actual Android device tests pass.

**Latest accepted v2.0.4 interface rules:** Read the final section of `docs/USER_FEEDBACK_HISTORY.md` before touching Log cards, active workout headers, rest/audio cues, notice dialogs, or What’s New. In particular, notice that the user's v2.0.4 instructions supersede v2.0.3's taller header and effort placement above metrics. Preserve the explicit v1.x→v2.x announcement workflow and tests.


**v2.1.0 stabilisation:** Before changing comparison, workout history, Tracker, or SQL, read the latest `docs/USER_FEEDBACK_HISTORY.md`, `docs/TEST_RESULTS.md`, `WHATS_NEW.md`, and `migration/START_HERE.md`. Comparison consent defaults OFF and is enforced on the server; neither old clients nor UI code may publish around it. No historical-row deletion/alias merging without provenance and restore tests. Android source must reuse this exact UI and business rules. Do not claim complete SQL/live/Android verification from static tests.


**v2.1.1 latest handover:** Start with `docs/HANDOVER_START_HERE.md`. Older Friends card-header plus and prior cardio RPE-first instructions are superseded; see the most recent feedback and release-contract sections. Android native OS alarm source lives in `android/app/src/main/java/com/gymprogress/client/`, with deadline planning in `pwa/native-workout-alerts.js`. Its job is to deliver locked-screen alarms/notifications, never to fork workout or visual logic. Do not claim reliability or APK readiness without compiling and real-device locked-screen tests. Keep the distinction between OS-native workout timers and currently *non-native* Tracker/motivation reminders. Maintain tests, source manifest, feedback and wishlist at each release.

## Android toolchain governance (22 November 2026)

Use the stable compatible pin matrix in `docs/ANDROID_TOOLCHAIN_POLICY.md`: AGP 9.3.0, Gradle 9.9.2, WebKit 1.18.0, compile SDK 37, target SDK 36 pending Android 17 tests, Java 17 bytecode and a supported Gradle runtime such as JDK 25. Do not downgrade the user's Gradle runtime as the primary solution or update one dependency in isolation. The wrapper bootstrap files are absent; do not invent or claim they are present. Native Android locked-screen alerts and exact PWA/Android parity remain mandatory unverified release gates.

**Deployment-integrity incident:** Never copy raw `pwa/` to GitHub Pages. `pwa/sw.template.js` is development source, and only the generated `dist/sw.js` includes the release manifest. `npm run build` verifies generated assets and manifest; verify after publishing that `/sw.js` is compiled and `/release.json` matches `/VERSION.txt`. An unexpanded `__RELEASE_MANIFEST__` causes worker evaluation failure. See `docs/GITHUB_PAGES_DEPLOYMENT_RECOVERY.md`. Preserve local IndexedDB, auth identity and sync outbox: no cache reset or database migration for this issue.

## 2.1.3 app UI constraint
Do not add any visible link/button to a standalone update-rescue or deployment verification page. Checks and safe activation happen on normal refresh. Repair diagnostics may exist as a separate URL for developer support only; provide access via handover documentation, not the normal app UI.
