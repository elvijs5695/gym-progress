# Gym Progress 1.6.7 (Android) / 1.7.7 (PWA)

## Priority 1 — Reliable workout flow and matching UI
- PRE-EXERCISE choice appears before the first and each subsequent exercise. Later / Replace / Skip no longer occupy the active-set screen; a Change exercise action allows returning before a set is saved.
- REST and NEXT EXERCISE/NEXT SET are separate cards. Management choices apply to an upcoming exercise only, never to another set of the current exercise. Changing the upcoming exercise retains the rest countdown and timestamps.
- PWA Set Complete now advances immediately without waiting on Web Audio. Added automated transition tests for Set Complete → RIR → Save set, including exact weight persistence.
- PWA replacement picker uses non-overlapping, wrapping layout, and both clients require a valid working weight before confirming a weighted replacement. Transient errors clear automatically.

## Priority 2 — Cardio logging and presentation
- Cardio timer counts elapsed time on Android and PWA; green target-duration bar fills from 0% to 100% and then remains full while the activity can continue.
- Cardio training load (duration × session RPE) is the first cardio log metric, not a claim of fitness progress. Mixed sessions display distinct cardio load and strength volume.
- Optional distance, HR, power and RPE accept N/A/blank and persist as missing, never zero. RPE guidance sits below input.
- Cardio never displays meaningless max kg/max repetitions. Completed cardio activities can appear in sharing selections and Friends, using the additive Supabase social duration constraint.
- Exercise Progress remains separate by exercise and modality; no combined strength/cardio score.

## Priority 3 — Notifications and smaller fixes
- Android workout notification is explicitly removed on stop. Stale Tracker notifications dismiss on Tracker adjustment/reaching the scheduled pace, and reminders expire at day change.
- PWA replacement actions share a secondary colour and are centred/distributed evenly.

## Migration
- No Room schema change; Android stays at v19. No change to training_sync_records.
- **To publish cardio to Friends**, run `SUPABASE_SOCIAL_CARDIO_SHARE_1.6.7_1.7.7.sql` in Supabase SQL Editor after the existing social schema is installed. The 1.6.5 corrected exercise catalogue SQL is still required if not yet installed.
- Old records remain intact; no destructive local migration.

## Test limitations
- PWA source validation, Node VM state-transition tests and ZIP checks passed. Full live-browser manual testing was unavailable.
- Android source validator passed; **a full Gradle assembleDebug was not run** because the environment lacks the Android SDK/Gradle build setup. Android Studio device build and hands-on UI test are required.
