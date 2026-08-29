# PWA v1.5.6 validation

Validated in this environment:

- `node --check` for every JS/MJS source through `tools/validate.mjs`;
- 10/10 shared performance-rule cases;
- release validator: 55 PWA files;
- version/service-worker markers = 1.5.6;
- IndexedDB migration/recovery guards retained;
- catalogue = 191 exercises / 27 families / 9 friend-comparable entries;
- reviewed production identity mappings = 32 UserExercise / 42 programme occurrences;
- supplied catalogue-link icon included in the service-worker shell;
- paired superset programme/workout source checks;
- ramp smoke checks include 20 kg => no ramp and heavier barbell work beginning with the empty bar where appropriate.

Browser/device interaction still requires user testing after deployment.

- window.gp export integrity: every exported shorthand handler must resolve to a declared/imported identifier.
