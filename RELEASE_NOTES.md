# Gym Progress PWA v1.5.8

## Programme / supersets
- Superset + buttons are circular and overlap the card boundary instead of creating an oversized gap.
- Superset programme cards use the normal card background.
- Heavy compound/remove-weight exercises are no longer blocked from supersets; only Timed tracking remains unavailable for paired supersets.
- Fixed unequal-set pairs: a 3-set + 2-set superset correctly leaves only the third set of the longer exercise and does not offer the completed partner again.
- One combined ramp-up flow prepares both members of a superset.

## Exercise setup
- “Timed / mat” is simplified to “Timed”.
- Equipment selects a sensible default tracking mode, but Weight + reps + RIR, Bodyweight reps + RIR and Timed remain manually selectable.
- Change-link editing no longer immediately auto-relinks the unchanged name, so the field remains editable and the keyboard can open.

## Logs / tracker / notices
- Restored the missing Logs renderer.
- Transient informational notices use the same 3.0 second lifetime and begin fading immediately.
- Multi-increment Tracker goals use 0%, 25%, 50%, 75% and 100% productive-day checkpoints. Single-occurrence goals keep the morning/start + four-hour reminder cadence.

## Update brief
- Added a compact English/Latvian first-open “What’s new” dialog.
- The brief is cumulative from the current major exercise-identity release line (PWA v1.5.0) and will continue accumulating in later versions until explicitly stopped.

## Safety
- IndexedDB identity and v1.5.2+ recovery/data-loss protection are retained.
- No Supabase migration is required for v1.5.8.


## 1.5.8 implementation batch
- Friend comparison now renders both users on one shared chart with combined domains, horizontal grid labels, stable per-user colours and isolated single points.
- Existing exact catalogue links are backfilled conservatively so eligible dumbbell exercises can enable friend comparison.
- Exercise tracking modes now enforce logical equipment compatibility; timed weighted exercises retain working weight and bodyweight hides standard weight.
- Timed exercises can participate in supersets, including reps + timed and timed + timed pairs.
- Catalogue suggestions are deduplicated by canonical exercise ID; Machine Hip Thrust was already present, so no duplicate was added.
- Transient notices use a central 3.0 s lifetime.
- What’s New is version-delta based and supports older installed versions.
- Tracker daily totals roll over automatically at the user’s local midnight while prior-day entries remain in history/storage.


## PWA 1.5.8 — 2026-08-30

- Friend comparison now renders both users on one combined-domain chart, with horizontal grid/axis labels, stable user colours and support for single-point series.
- Comparable dumbbell exercises are enabled through canonical eligibility and identity reconciliation.
- Equipment-aware tracking guardrails prevent invalid combinations while retaining user choice among valid modes; Timed weighted exercises retain working weight.
- Mixed timed/rep and timed/timed supersets are supported; rest starts after both current components finish.
- Catalogue search suggestions are deduplicated by canonical ID. Machine Hip Thrust was already in the catalogue and was not duplicated.
- Transient informational notices use the central 3.0 second duration.
- What’s New derives the feature delta from the detected previous version, including old PWA installations such as 1.3.0.
- Tracker rolls to a fresh current-day total at local midnight while preserving prior dated tracker entries.
- No IndexedDB identity change and no Supabase schema migration are required.
