# Gym Progress PWA v1.5.10 — 2026-09-01

## Timeline and logs
- When workout history spans less than one month, the default timeline frames the first recorded event through today.
- Timeline state resets to that event-driven default when returning to Logs.
- Latvian log rows use language-specific grid widths and compact labels.

## Friend comparison
- Your comparison series/occurrences are blue and the friend series/occurrences are red.
- Comparison lines are smoothly curved.
- Returned single-point friend series are retained even if the selected friend id needs fallback matching; overlapping points remain outlined.
- Deleting a workout or erasing logs rebuilds and replaces online comparison points, removing deleted derived e1RM history.
- The e1RM explanation remains visually secondary.

## Tracker
- Tracker rows have a neutral completion fill with a proportional expected-progress marker for the current time.
- Completed tracker rows turn light green while existing text-status colours remain.
- Tracker remains daily and resets to a fresh local-date total at midnight without deleting prior dated entries.

## Active workout
- Barbell selectable increments are 2.5 kg.
- Next-after-rest information identifies ramp-up and the relevant exercise.
- Dumbbell exercise circles omit the cramped “each” wording.
- The active header shows current exercise number/name and periodically fades to what is next.
- All progression/future-adjustment prompts identify the exercise, including bodyweight/superset follow-ups.
- The earlier rest-skip state-path fix remains in place.

## Safety
- IndexedDB identity is unchanged and no Supabase schema migration is required.
