-- Gym Progress Android 1.6.1 / PWA 1.7.1
-- Per-account cloud cleanup + clean reseed preparation.
--
-- RUN ONLY AFTER installing the new Tracker-state clients and verifying that ONE
-- authoritative device contains the complete Programme, workout history, Tracker
-- definitions and today's Tracker amounts.
-- Close all other Gym Progress clients before deleting cloud rows.
--
-- IMPORTANT: replace YOUR-USER-UUID before running any destructive statement.

-- 0) Find the account UUID if needed.
select id, email, created_at
from auth.users
order by created_at;

-- 1) Inspect the current cloud working set.
select domain, entity_type, count(*) as records
from public.training_sync_records
where owner_id = 'YOUR-USER-UUID'::uuid
group by domain, entity_type
order by domain, entity_type;

-- 2) Create a safety backup. This intentionally FAILS if the backup table already
-- exists, preventing an accidental overwrite. Rename the table if you deliberately
-- need another backup.
create schema if not exists private;
create table private.training_sync_records_backup_tracker_state_20260905 as
select *
from public.training_sync_records
where owner_id = 'YOUR-USER-UUID'::uuid;

-- Verify the backup BEFORE continuing.
select domain, entity_type, count(*) as records
from private.training_sync_records_backup_tracker_state_20260905
group by domain, entity_type
order by domain, entity_type;

-- 3) Destructive step: clear ONLY this account's training sync exchange rows.
-- This does not delete auth/profile/Friends data or local device data.
delete from public.training_sync_records
where owner_id = 'YOUR-USER-UUID'::uuid;

-- Expected result: 0.
select count(*) as remaining_rows
from public.training_sync_records
where owner_id = 'YOUR-USER-UUID'::uuid;

-- 4) STOP HERE. Open ONE authoritative Android 1.6.1 or PWA 1.7.1 client and sync.
-- The empty cloud will be repopulated from canonical local state. Sync again without
-- changes; the row count must remain unchanged.
--
-- After reseed, Tracker should contain only tracker_item + tracker_state:
select domain, entity_type, count(*) as records
from public.training_sync_records
where owner_id = 'YOUR-USER-UUID'::uuid
group by domain, entity_type
order by domain, entity_type;

-- Optional post-reseed check: this should return zero rows.
select *
from public.training_sync_records
where owner_id = 'YOUR-USER-UUID'::uuid
  and entity_type = 'tracker_entry';

-- EMERGENCY RESTORE ONLY
-- If the clean reseed is not acceptable, close all clients, clear this account again,
-- then restore the backup. The normal table trigger will assign fresh server_revision
-- / updated_at values; user payload/revision/tombstone content is restored.
--
-- delete from public.training_sync_records
-- where owner_id = 'YOUR-USER-UUID'::uuid;
--
-- insert into public.training_sync_records
--   (owner_id, domain, entity_type, sync_id, revision, deleted_at, payload)
-- select owner_id, domain, entity_type, sync_id, revision, deleted_at, payload
-- from private.training_sync_records_backup_tracker_state_20260905
-- where owner_id = 'YOUR-USER-UUID'::uuid
-- on conflict (owner_id, sync_id) do update set
--   domain = excluded.domain,
--   entity_type = excluded.entity_type,
--   revision = excluded.revision,
--   deleted_at = excluded.deleted_at,
--   payload = excluded.payload;
