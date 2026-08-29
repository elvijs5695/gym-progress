# Gym Progress PWA v1.5.5

## Exercise editor
- Compare with friends now uses the same right-side switch treatment as other toggles.
- Non-eligible comparison is strongly disabled and explains that only comparable barbell/dumbbell catalogue exercises qualify.
- Tracking choices are constrained by equipment and shown after Equipment and Exercise type.
- Exercise type and Tracking each have their own full-width row; Equipment and Ramp-up share a row.
- New exercises hide Remove weights for dumbbells, cables, machines and bodyweight; Edit keeps the control available.
- Catalogue search remains name/alias-first. Catalogue linking can be changed or removed before saving.
- Uses the supplied chain-link glyph: green linked, grey local.

## Supersets
- Superset no longer belongs to Add/Edit Exercise.
- + between adjacent programme cards joins a pair; - inside the combined card separates it.
- A pair is rendered as one distinctive SUPERSET card and reorders as one block.
- During training both exercises are active at the same time with red/blue pulse circles, individual load controls and one SUPERSET COMPLETE action.
- Result entry captures both exercises together. The one rest interval starts after the pair is completed and records the same elapsed rest against both set records.
- Next information is pair-aware before/after the superset and lists both upcoming prescriptions.
- Paired skip and paired undo are supported.

## Ramp-up and notices
- Ramp prompt actions are Remove / Skip / Start.
- 20 kg barbell working load gets no ramp-up; heavier work may start with the empty 20 kg bar.
- Information notices use longer gradual fades.

## Safety
- Keeps the v1.5.2+ IndexedDB startup/recovery protections.
- No Supabase migration is required for v1.5.5.
