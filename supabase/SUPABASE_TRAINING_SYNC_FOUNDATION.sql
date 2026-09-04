begin;

-- Gym Progress training-data sync foundation.
-- Safe to deploy before any client enables cloud training sync.
-- This does NOT expose programme/history to Friends; every row is private to auth.uid().

create sequence if not exists public.training_sync_revision_seq;

create table if not exists public.training_sync_records (
  owner_id uuid not null references auth.users(id) on delete cascade,
  domain text not null check (domain in ('programme','workout_log','tracker')),
  entity_type text not null,
  sync_id uuid not null,
  revision bigint not null default 1,
  deleted_at timestamptz,
  payload jsonb,
  updated_at timestamptz not null default now(),
  server_revision bigint not null default nextval('public.training_sync_revision_seq'),
  primary key (owner_id, sync_id)
);

create index if not exists training_sync_records_owner_domain_cursor_idx
  on public.training_sync_records(owner_id, domain, server_revision);
create index if not exists training_sync_records_owner_domain_type_idx
  on public.training_sync_records(owner_id, domain, entity_type);

create or replace function public.touch_training_sync_record()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  new.server_revision := nextval('public.training_sync_revision_seq');
  return new;
end;
$$;

drop trigger if exists training_sync_records_touch on public.training_sync_records;
create trigger training_sync_records_touch
before insert or update on public.training_sync_records
for each row execute function public.touch_training_sync_record();

alter table public.training_sync_records enable row level security;

drop policy if exists "training sync select own" on public.training_sync_records;
create policy "training sync select own"
on public.training_sync_records for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "training sync insert own" on public.training_sync_records;
create policy "training sync insert own"
on public.training_sync_records for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "training sync update own" on public.training_sync_records;
create policy "training sync update own"
on public.training_sync_records for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "training sync delete own" on public.training_sync_records;
create policy "training sync delete own"
on public.training_sync_records for delete
to authenticated
using (owner_id = auth.uid());

-- Optional programme recovery snapshots. A future sync client may write one before
-- applying a substantial incoming programme merge. They remain private to the owner.
create table if not exists public.training_programme_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  source_device_id text,
  reason text,
  snapshot jsonb not null
);
create index if not exists training_programme_snapshots_owner_created_idx
  on public.training_programme_snapshots(owner_id, created_at desc);
alter table public.training_programme_snapshots enable row level security;

drop policy if exists "training snapshots select own" on public.training_programme_snapshots;
create policy "training snapshots select own"
on public.training_programme_snapshots for select to authenticated
using (owner_id = auth.uid());
drop policy if exists "training snapshots insert own" on public.training_programme_snapshots;
create policy "training snapshots insert own"
on public.training_programme_snapshots for insert to authenticated
with check (owner_id = auth.uid());
drop policy if exists "training snapshots delete own" on public.training_programme_snapshots;
create policy "training snapshots delete own"
on public.training_programme_snapshots for delete to authenticated
using (owner_id = auth.uid());

comment on table public.training_sync_records is
  'Private local-first Gym Progress programme/workout-log/tracker exchange records. Clients must merge by sync_id/revision; never treat this table as permission to replace a whole local database.';

-- Explicit API privileges. RLS remains the ownership boundary.
grant usage, select on sequence public.training_sync_revision_seq to authenticated;
grant select, insert, update, delete on table public.training_sync_records to authenticated;
grant select, insert, delete on table public.training_programme_snapshots to authenticated;
revoke all on table public.training_sync_records from anon;
revoke all on table public.training_programme_snapshots from anon;

commit;
