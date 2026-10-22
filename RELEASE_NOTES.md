# Gym Progress PWA v1.7.3 — 2026-10-22

## Major improvements

- Exact manually entered workout weights are preserved in logs and progression; manual 28.75 kg no longer becomes 30 kg.
- Progress e1RM uses the heaviest valid completed set and falls back to reps-only Epley when historical RIR is missing. Friends comparison keeps the stricter <=10-effective-rep rule.
- The current exercise can be postponed after the next exercise or to the end when equipment is occupied.
- Ramp-up loads now approach working weight using useful percentage stages and 2.5 kg barbell increments.
- After a >=21-day training gap, the app can offer conservative session-only loading at 95%, 90%, or 85%, depending on the length of the gap. Programme weights are unchanged.
- Celebration photos can rotate from `celebrations/01.jpg` through `celebrations/12.jpg`; just upload JPEGs into those numbered slots. The legacy image remains a fallback.

## Reliability/UI

- Share/PUBLISH is disabled until at least one card is selected.
- Update announcements are sorted by importance, with major mechanisms before minor fixes.
- Exercise progress matching prefers stable programme occurrence identity/position rather than name alone.

## Data compatibility

No IndexedDB or Supabase schema migration is required. Existing historical values already rounded by an older release are not automatically guessed/re-written.
