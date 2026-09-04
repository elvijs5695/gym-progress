begin;

-- Gym Progress Android 1.5.0 / PWA 1.6.0
-- REQUIRED update for installations that already ran the earlier training-sync foundation.
-- Adds Tracker as a private synchronisation domain.

-- Prerequisite: public.training_sync_records must already exist.
do $$
begin
  if to_regclass('public.training_sync_records') is null then
    raise exception 'training_sync_records does not exist. Run SUPABASE_TRAINING_SYNC_FOUNDATION.sql first, then run this update.';
  end if;
end $$;

alter table public.training_sync_records
  drop constraint if exists training_sync_records_domain_check;

alter table public.training_sync_records
  add constraint training_sync_records_domain_check
  check (domain in ('programme','workout_log','tracker'));

comment on table public.training_sync_records is
  'Private local-first Gym Progress programme/workout-log/tracker exchange records. Clients merge by sync_id/revision; whole local databases are never replaced as normal sync.';

-- Keep API privileges explicit. Row-level security remains the ownership boundary.
grant usage, select on sequence public.training_sync_revision_seq to authenticated;
grant select, insert, update, delete on table public.training_sync_records to authenticated;
revoke all on table public.training_sync_records from anon;

commit;

-- Verification: should return programme, workout_log and tracker as allowed domains.
select pg_get_constraintdef(oid) as domain_constraint
from pg_constraint
where conrelid = 'public.training_sync_records'::regclass
  and conname = 'training_sync_records_domain_check';
