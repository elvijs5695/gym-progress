# Gym Progress PWA v1.5.9 — 2026-08-30

## Tracker
- Added Delete beside Edit in Tracker settings.
- Added an easy-to-find master Tracker notifications switch; browser permission state is shown when notifications are blocked.
- Tracker home rows are more compact and use regular-weight text.
- +/- controls are smaller and lower-emphasis; completion remains the strongest state cue.
- Local-midnight daily rollover is retained and preserves prior dated tracker entries.

## Charts / friend comparison
- Normal Progress and friend-comparison charts use rounded, readable grid intervals instead of arbitrary decimals.
- Weight/e1RM axes favour gym-friendly steps such as 2.5, 5, 10 and 20 kg according to scale.
- One-point friend series are explicitly rendered as enlarged dots with an outline.
- Per-user point counts are shown in the comparison legend.
- If two users have the same timestamp and e1RM, the friend point receives an additional outline so it cannot disappear underneath the other point.
- The friend-comparison e1RM explanation uses smaller text.

## Rest control
- Fixed a PWA state-path where Skip during ENTRY/SUPERSET_ENTRY only moved the rest end time to now, leaving a non-advancing 0:00 panel.
- Skip now finalizes and clears that rest immediately; normal REST-phase Skip continues to advance to the next action.

## Preserved behaviour / safety
- PWA 1.5.8 mixed timed supersets, tracking/equipment guardrails, dumbbell comparison eligibility, catalogue deduplication, 3-second notices and cumulative What’s New logic are retained.
- IndexedDB identity remains `gym-progress-pwa` / `kv` / `app-state`.
- No Supabase schema migration is required.
