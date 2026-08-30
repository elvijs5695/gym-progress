# Gym Progress PWA v1.5.9

Local-first Gym Progress PWA. Deploy over the existing site/origin and **do not clear browser/site data**. IndexedDB identity and recovery safeguards are unchanged.

## v1.5.9 highlights

- Tracker settings now include Delete beside Edit and a visible master Tracker notifications switch.
- Tracker rows are denser and use regular-weight text; +/- controls are intentionally quiet so completion state carries the visual emphasis.
- Tracker remains daily and rolls to a fresh local-date total at midnight while prior dated entries remain stored.
- Progress and friend-comparison charts use readable rounded grid intervals; weight/e1RM axes favour gym-friendly steps such as 2.5, 5, 10 and 20 kg depending on range.
- Friend comparison explicitly renders isolated one-point series and shows per-user point counts; exact overlaps remain distinguishable.
- The e1RM explanation in friend comparison is smaller.
- Rest Skip now works while a set/superset result-entry screen still owns an active rest; the stuck 0:00 rest panel is removed immediately.
- PWA 1.5.8 mixed timed supersets, exercise guardrails, comparison eligibility fixes and data-loss protections remain in place.

No IndexedDB schema identity change and no Supabase schema migration are required.
