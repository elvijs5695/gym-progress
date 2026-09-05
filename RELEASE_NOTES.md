# Gym Progress PWA v1.6.3 — 2026-09-05

## Sync hotfix
- Fixes PostgreSQL/Supabase `ON CONFLICT DO UPDATE command cannot affect row a second time` during training-data sync.
- Upload batches are now canonicalised by the exact cloud conflict key `sync_id` before each upsert.
- If corrupted/legacy local metadata contains duplicate sync IDs, the highest revision wins; newer state wins ties, and deletion wins a final tie to prevent resurrection.
- Existing record-level convergence, schedule sync, Tracker live updates and deletion safeguards remain unchanged.

## Friends/Home header hotfix
- `+ Add friend` now sits on its own right-aligned row below the Friends title/account row, so it cannot be compressed or hidden behind the username.
- The action aligns with the right edge of the section cards.
- `Gym Progress` on Home is kept on one line; the account chip truncates before it can force the title to wrap.

## Database
No new SQL or IndexedDB migration is required.
