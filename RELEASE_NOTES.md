# Gym Progress — hotfix 1.6.10 (Android) / 1.7.10 (PWA)

**Baseline:** Android 1.6.9 / PWA 1.7.9. This hotfix is separate from the experimental application v2 redesign.

## Corrected

1. **PWA launch failure when using Latvian:** `i18n.js` accessed the regular-expression variable `m` before its `let` declaration, triggering `Cannot access 'm' before initialization`. The declaration is now at the start of the translation function, before any dynamic patterns. A real app-entry-module first-paint regression now runs for saved Latvian, saved English and fresh English installs. `t()` also exercises previously failing dynamic Latvian strings.
2. **Logs card colours:** Completed session cards use a readable, subtle effort-coloured background and border, on Android and PWA. No replacement of existing recorded effort or data.
3. **Timeline circles:** They use the same effort classification and colour as their corresponding session card. Strength-only sessions use strength difficulty; cardio-only sessions derive the colour from the recorded, duration-weighted cardio RPE. Mixed sessions are **strength-first**, falling back to cardio only when strength effort cannot be classified. Aborted sessions use the aborted colour, and sessions with no effort data remain neutral.
4. **Compact Effort label:** The category remains visible without repeating the numeric cardio RPE. Examples: `Hard`; `Strength: Challenging · Cardio: Hard`; `Strength: Comfortable · Cardio: effort not recorded`. Detailed cardio metrics, exercise history, Progress and training load retain the recorded numeric RPE. This is a display-only change.
5. **PWA cache identifiers:** Updated the entry module and stylesheet cache-busting version and the service-worker cache name to `1.7.10`, so a deployed hotfix is not silently served from the old release cache.

## Data preservation and deployment

- No database or SQL changes, no sync format changes and no migration are introduced by this hotfix.
- **PWA:** Deploy the **entire** `GymProgress-PWA-v1.7.10` folder, keeping all existing exercise assets, `sw.js`, and `celebrations/`. Relaunch/reload the installed app after deployment to activate the new service worker. **Do not clear site storage or IndexedDB.**
- **Android:** Source release versionName `1.6.10` / versionCode `16010`. Compile in Android Studio and install *over* 1.6.9 without uninstalling it. **Do not clear app data.**
- Take a Full backup before rollout; verify logs and sync after the update on a test profile first.

## Verification performed

**PWA:** `npm run check` passes all static and prior-release regressions; three app-initialisation tests execute the actual `app.js` module and verify first paint. New direct tests exercise Logs HTML, card colours, timeline Canvas fill colours, mixed/cardio-only classification and EN/LV effort labels. The saved Latvian regression would reproduce the original `m` error on the unpatched translation function.

**Android:** `python tools/validate_source.py` passes (55 Kotlin source files and release invariants); isolated `CardioEffort.kt` compiles via `kotlinc` and passes cardio-only, mixed, missing-RPE and aborted-session tests. The Compose Logs source was also reviewed for its card colour and border usage.

**Limitations:** No complete Gradle/Android APK build or Android emulator test was available. Interactive Chromium navigation to a local PWA origin was blocked by the execution environment, so a live-device/browser acceptance pass is still required. Tests do not prove every scenario on users' real databases.

See `REGRESSION_CHECKLIST_1.6.10_1.7.10.md` for user acceptance tests.
