# Gym Progress PWA v1.5.10

Local-first Gym Progress PWA. Deploy over the existing site/origin and **do not clear browser/site data**. IndexedDB identity and recovery safeguards are unchanged.

## v1.5.10 highlights

- Short timelines frame the first log event through today.
- Latvian log layout adapts its columns to the language.
- Friend comparison uses curved blue/red series, preserves isolated friend points, and colours included occurrences by user.
- Deleted local workouts/logs also remove their derived online comparison points.
- Tracker rows now act as compact progress bars with an expected-progress marker; completed items become light green.
- Barbell weight selection uses 2.5 kg increments.
- Active-workout header, ramp-up cues and progression suggestions identify the relevant exercise more clearly.
- Existing Tracker notification controls, local-midnight rollover and rest-skip fix remain in place.

No IndexedDB schema identity change and no Supabase schema migration are required.
