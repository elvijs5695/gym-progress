# Gym Progress PWA v1.5.20

Deploy over the existing PWA on the same origin without clearing site data.

## Highlights
- `N/X • Next: Exercise` workout status and thin live progress bar.
- Cycle-best all-occurrence Progress values for max weight, volume and e1RM.
- Deterministic adaptive progression/fatigue interpretation with explainable reason codes and confidence.
- Sync-ready local metadata (stable IDs, revisions, tombstones and separate programme/history domains) without changing IndexedDB identity.
- Backup schema v5 and new deterministic integration validation.

## Important sync boundary
v1.5.20 remains fully local-first and does not upload private training programme/history. The included Supabase SQL and local metadata are foundations for the later bidirectional merge client; whole-database replacement is intentionally not implemented.
