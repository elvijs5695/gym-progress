# Release validation — 1.6.7 / 1.7.7

Passed:
- `node tools/validate.mjs`: full PWA source validator.
- `node tools/validate-workout-ui-177.mjs`: first/pre-exercise and REST/NEXT separation, same-exercise NEXT SET, Set Complete → RIR → Save set, exact working weight, Web Audio unavailable.
- `node tools/validate-rest-actions.mjs`: Later/Replace/Skip preserve rest state.
- `node tools/validate-cardio.mjs`: cardio calculation and start transition.
- `python3 tools/validate_source.py`: Android static project checks.
- ZIP integrity checks.

Not performed: Android `assembleDebug` (no Android SDK/Gradle), manual device/UI testing and live Supabase integration.

Required acceptance testing on real devices: begin first exercise; replace before exercise; replace/skip during rest without changing rest timer; set complete and save; cardio target count-up and progress bar; cardio N/A fields; cardio sharing after SQL; Android notification cleanup; PWA service-worker update from old version.
