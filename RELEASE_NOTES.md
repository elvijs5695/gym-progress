# Gym Progress PWA 1.5.18

## Interface simplification

- Home workout cards now keep calendar/play controls beside a far-right expand control, with direct play visible on every workout.
- The next scheduled workout uses pastel green rather than red emphasis.
- Tracker uses a lighter #EEF7EE green treatment; tracker editing returns to the tracker list.
- Friends and comparison expansion cards now share a compact visual system; sign-out asks for confirmation.
- Settings navigation uses the same chevron system, with a minimalist workout-name pencil icon.
- Active workout status shows only time and `Exercise X of Y`; warm-up/stretching remain unnumbered.
- Ramp-up and working-set screens remove duplicated exercise/load information.
- Undo uses the supplied curved-arrow icon.
- Workout-complete/share hierarchy and summary abbreviations are simplified.
- Notices now float at the bottom over content with white background and black text instead of moving the page.

No IndexedDB identity, local data schema, or Supabase migration is required.

# Gym Progress PWA v1.5.13 — 2026-09-01

- Kept elapsed time and stage (`x/y`) fixed in the active-workout status line.
- Added overflow-only horizontal marquee for `Now / Next`; short status text stays static.
- Added startup image preload + decode for `finish-celebration.png`; the service worker continues to precache it.
- Standardised PWA expand/collapse chevrons on the Friends-panel SVG design, including workout cards, Friends comparison and Starter programme details.
- Preserved the 4.4 s finish celebration introduced in v1.5.12.

No IndexedDB or Supabase schema migration.

## 1.5.16 — visual correction pass

- Home Play and Calendar controls are circular outlined buttons with white icons and no fill.
- Tracker uses a fresher soft-green gradient with explicit dark-green control/icon contrast.
- Friends and Compare exercise progress headings are left-aligned with chevrons pinned right.
- Ramp-up working target aligns with the ramp weight/reps column.
- Single-exercise pulse labels are slightly larger.
- Progression dialogs add clearer spacing between “Next working weight” and the input.
- Notices remain bottom-overlays normally and move to the top while a bottom dialogue is open.

## 1.5.16
- Tracker progress fill stays neutral grey while a daily target is incomplete and changes to light green only when the target is completed.
- Refreshed green accents around `#88E788` with darker green controls for reliable contrast.

## 1.5.17 visual polish
- Tracker uses a near-white glass-like gradient with dark neutral text and controls.
- Tracker progress remains grey until completion; completed fill uses a restrained green.
- Upcoming workout accent card uses #313C36.
- Green accent text is toned down.
- Home Play control now uses an optically centred thick outline triangle inside the thinner circular button border.


## 1.5.18 tracker pacing and exact programme weights

- Tracker clock markers refresh every 10 minutes while Home remains open, with immediate refresh on app visibility changes.
- Tracker overdue/red state and reminders now use discrete due windows. Each configured increment gets an equal share of the active day; dense targets use two-hour checkpoints, and the final target is due at the configured end time.
- Manual programme working weights are stored exactly as entered rather than snapped to equipment grading increments.
- Rotation-day expansion icons were removed from Home; calendar/play actions remain right aligned.
