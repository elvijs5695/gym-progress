# Gym Progress PWA v1.5.12 — 2026-09-01

## Active workout header
- Replaced the fading Current/Next cycle with a persistent elapsed-time + stage + Now + Next line.
- Focus-stage numbering groups both members of a superset into one stage.
- Warm-up and stretching are unnumbered.
- Ramp-up, working set, result/rest and deload retain the same focus-stage index until the workout actually advances.

## Finish flow
- Celebration image duration doubled from 2.2 s to 4.4 s.
- Weighted exercise rows in the conclusion identify both total exercise volume and maximum weight reached.
- Timed/bodyweight exercise rows use appropriate duration/max-rep summaries.

## Shareable cards
- Toggling a card no longer sends the summary back to the top when the comment input is inserted/removed; the dialog and page scroll positions are restored after the card rerender.

## Safety
- IndexedDB database/store/key identity is unchanged.
- No Supabase schema migration is required.
