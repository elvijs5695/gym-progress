# Gym Progress — wishlist

- **Analysis / coaching layer:** use the exercise library plus long-term training history to provide optional static insights and increasingly individualised recommendations without taking programme control away from the user.
- Individualise ramp-up recommendations from prior working weights, target reps, estimated strength and what muscle/movement patterns have already been trained in the current session.
- Bodyweight tracking with trends and optional relation to strength metrics.
- Sleep tracking and later correlation with training performance/recovery.
- Wear OS controller for set complete, weight/reps/RIR/failure, rest skip/adjust and haptic cues.
- iOS / Apple Watch port with shared domain/data-contract logic where practical.
- Optional richer exercise-library knowledge: movement pattern, primary muscles, equipment, technical demand and relationships between exercises.
- **Unified workout event log:** log every workout action as a first-class timeline event using one consistent schema (event type, start/end timestamp, relevant exercise/set/superset IDs and structured payload). This should cover sets, rests, ramp-up, unload/deload, skips, undo, manual adjustments, progression decisions and other state-changing actions, so a full session can be reconstructed and exported without phase-specific formats.

## Delivered from the wishlist
- **Central exercise-substitution catalogue (SQL), v1.6.5 / v1.7.5:** server-hosted, public read-only SQL relations and priorities with background client caching, offline fallback, legacy-key compatibility and separate user sync.
