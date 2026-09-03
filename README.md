# Gym Progress PWA v1.5.18

Update from v1.5.12 in place on the same origin. Do not clear site data.

## v1.5.18 highlights
- Near-white glass Tracker with dark neutral typography.
- Grey progress until completion, then restrained green.
- #313C36 upcoming workout card and toned-down green status accents.
- Thick outline Play icon with optical centring.

- Tracker pace/deadline visuals refresh while the app stays open; overdue status is based on discrete completion windows rather than a continuous percentage.
- Programme working weights preserve exact manually entered values instead of snapping to equipment increments.
- Home rotation cards no longer show expansion chevrons; calendar/play remain at the far right.

## v1.5.16 highlights

- Active-workout elapsed time and focus-stage counter stay fixed.
- Only the `Now / Next` segment scrolls horizontally, and only when it overflows.
- Finish celebration image is preloaded and decoded during startup; it remains in the service-worker app-shell cache.
- Expand/collapse chevrons use the same SVG convention as the Friends panel across PWA expandable controls.
- Existing v1.5.12 finish-celebration duration remains 4.4 s.

No IndexedDB identity change and no Supabase migration are required.
