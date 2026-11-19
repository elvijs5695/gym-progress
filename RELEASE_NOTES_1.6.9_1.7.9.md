# Gym Progress — maintenance release 1.6.9 (Android) / 1.7.9 (PWA)

Baseline: the user-supplied Android 1.6.8 / PWA 1.7.8 release. This is a maintenance release, **not** the separate experimental overhaul.

## Implemented changes

| # | Change | Android | PWA |
|---|---|---|---|
| 1 | N/A button becomes visibly selected without checkmark; disabled value shows `-` | Updated | Updated |
| 2 | RPE explanation full dialogue width; remove artificial cardio progress warning | Full width explanation | Full width; warning removed |
| 3 | Freeze cardio display at Finish, before data entry is saved | Updated | Updated |
| 4 | Cardio replacements restricted to cardio candidates (and strength to strength) | Updated | Updated |
| 5 | Logs explicitly show effort and use cardio RPE-based styling for cardio-only days; mixed days remain neutral | Reviewed / clearer labels | Updated / weighted cardio RPE |
| 6 | Strength metrics appear first, cardio summary afterwards in mixed Logs | Updated | Updated |
| 7 | Multiple PWA celebration photographs | N/A | 12 locally bundled photographs plus original fallback |
| 8 | Progress cardio metric selector maintains horizontal scroll position | N/A | Updated |
| 9 | Back warns before a saved set (including weight, reps and RIR) is undone | Updated | Updated |
| 10 | Rest button reads Skip rest | N/A | Updated |
| 11 | Fill Latvian translation gaps in affected active workout, cardio, Progress and Logs screens | Updated central AppText | Updated i18n and dynamic comparisons |
| 12 | No 1/1 indicator or Skip set button for cardio activity in PWA | Already uses activity-only native view | Updated |
| 13 | Field-specific validation errors | Updated | Updated |
| 14 | Cardio detail stats span available card width | Aligned metric cards | Responsive full-width grid |
| 15 | **RPE 1–10 dropdown selection**, rather than manual typing | Updated | Updated |

Cardio RPE remains an optional numeric value (integer 1–10) in the **existing field**. Historical and synced data structures are unchanged. N/A remains `null` in saved records; `-` is presentation only.

## Compatibility and data safety

- No Room schema version, SQLite migration, IndexedDB layout, sync identity or Supabase SQL change.
- VersionCode 16009 and versionName 1.6.9 for Android; 1.7.9 for PWA and its service-worker cache.
- Keep app data on Android upgrade and do **not** uninstall/clear storage before updating.
- On PWA, update the entire folder, including `sw.js` and `celebrations/` so offline caching succeeds. Do not clear browser site data.
- Take the app's **Full backup** before deploying for recovery; test restoration in a separate profile if possible.

## Verification performed

- PWA: `npm run check` (all JavaScript syntax, manifest/cache assets, existing reference/rules regressions and v1.7.8 and v1.7.9 regressions).
- PWA: purpose-built v1.7.9 VM tests for N/A input and RPE selection, frozen elapsed clock, explicit HR error, nullable storage, Progress scroll preservation, cardio detail implementation, 12 image assets and offline pre-cache.
- Android: central Latvian AppText compiled and tested with `kotlinc`; selected modified Kotlin files parsed without syntax diagnostics. Source-level checks for category selection, RPE menu, clock and Back warning.
- **Not verified:** real Gradle Android compile, emulator/device runtime, or interactive PWA browser UI. This environment has no Android SDK/Gradle wrapper; Chromium navigation to local origin/file was blocked by environment policy.

## Developer acceptance checks

Follow `REGRESSION_CHECKLIST_1.6.9_1.7.9.md`, particularly finishing/cancelling cardio, Android `:app:assembleDebug`, offline photo rotation, mixed-strength/cardio Logs and EN/LV dynamic strings. Always test with a **copy** of real training data before rolling out.
