# Gym Progress PWA v1.5.11 — 2026-09-01

## Active workout
- Current/Next labels are now phase-aware across Warm-up, Ramp-up, working sets, Result, Rest, Remove weights, Stretching and completion.
- During ramp-up, Next reports the actual working exercise/superset.
- After a last working set, Result and Rest report the actual next exercise/ramp-up/weight-removal/stretching action.
- Result-entry rest panels no longer have Skip; only −30 s / +30 s remain.
- Rest expiry or missing-rest state now settles/advances safely instead of leaving a blank phase.
- Resume/reload validates the persisted runtime and rebuilds a stale phase when necessary.
- Set progress labels are `x/y` in all languages; additional active-workout Latvian labels were localized.

## Tracker
- Completion fill is confined to the text/progress zone and stops before the minus button.
- More separation is provided before the ± controls.
- The vertical time marker uses only progress through each item’s configured active period, so identical periods align exactly.

## Friend comparison
- Combined histories shorter than 30 days default from the earliest comparison point through today.
- Existing curved blue/red series and isolated single-point markers are retained.

## Finish flow
- Finish & Save first shows the supplied celebration image with a brief entrance/fade animation.
- It then opens a detailed workout conclusion with session metrics/exercise summary and shareable cards below.

## Safety
- IndexedDB database/store/key identity is unchanged.
- No Supabase schema migration is required.
