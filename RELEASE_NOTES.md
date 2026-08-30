# Gym Progress PWA v1.5.7

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
- Transient informational notices use the same ~4.4 second lifetime and begin fading immediately.
- Multi-increment Tracker goals use 0%, 25%, 50%, 75% and 100% productive-day checkpoints. Single-occurrence goals keep the morning/start + four-hour reminder cadence.

## Update brief
- Added a compact English/Latvian first-open “What’s new” dialog.
- The brief is cumulative from the current major exercise-identity release line (PWA v1.5.0) and will continue accumulating in later versions until explicitly stopped.

## Safety
- IndexedDB identity and v1.5.2+ recovery/data-loss protection are retained.
- No Supabase migration is required for v1.5.7.
