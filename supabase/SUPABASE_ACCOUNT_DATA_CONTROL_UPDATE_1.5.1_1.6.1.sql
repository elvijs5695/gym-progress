begin;

-- Gym Progress Android 1.5.1 / PWA 1.6.1
-- REQUIRED Supabase update.
-- Adds authenticated destructive-data RPCs used by Settings / Account.
-- Run after the existing social schema and training-sync foundation/update.

do $$
begin
  if to_regclass('public.training_sync_records') is null then
    raise exception 'training_sync_records does not exist. Apply the previous training-sync foundation/update before this migration.';
  end if;
  if to_regclass('public.profiles') is null then
    raise exception 'profiles does not exist. Apply the Gym Progress social schema before this migration.';
  end if;
end $$;

create or replace function public.gym_erase_my_training_cloud(p_scope text default 'all')
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_scope text := lower(trim(coalesce(p_scope, 'all')));
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if v_scope not in ('workout_log', 'all') then raise exception 'Unsupported erase scope'; end if;

  if v_scope = 'workout_log' then
    delete from public.training_sync_records
      where owner_id = v_uid and domain = 'workout_log';

    if to_regclass('public.activity_events') is not null then
      delete from public.activity_events where user_id = v_uid;
    end if;
    if to_regclass('public.exercise_comparison_points') is not null then
      delete from public.exercise_comparison_points where user_id = v_uid;
    end if;
  else
    delete from public.training_sync_records where owner_id = v_uid;
    if to_regclass('public.training_programme_snapshots') is not null then
      delete from public.training_programme_snapshots where owner_id = v_uid;
    end if;
    if to_regclass('public.activity_events') is not null then
      delete from public.activity_events where user_id = v_uid;
    end if;
    if to_regclass('public.exercise_comparison_points') is not null then
      delete from public.exercise_comparison_points where user_id = v_uid;
    end if;
    if to_regclass('public.catalogue_candidates') is not null then
      delete from public.catalogue_candidates where user_id = v_uid;
    end if;
  end if;

  return true;
end;
$$;

create or replace function public.gym_delete_my_account()
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  -- Rows using ON DELETE SET NULL must be removed explicitly so account deletion
  -- means "all information created by this account", not anonymised leftovers.
  if to_regclass('public.catalogue_candidates') is not null then
    delete from public.catalogue_candidates where user_id = v_uid;
  end if;

  -- Known private/social/training tables either reference auth.users directly or
  -- reference public.profiles, which itself cascades from auth.users.
  delete from auth.users where id = v_uid;
  if not found then raise exception 'Account not found'; end if;
  return true;
end;
$$;

revoke all on function public.gym_erase_my_training_cloud(text) from public, anon;
revoke all on function public.gym_delete_my_account() from public, anon;
grant execute on function public.gym_erase_my_training_cloud(text) to authenticated;
grant execute on function public.gym_delete_my_account() to authenticated;

comment on function public.gym_erase_my_training_cloud(text) is
  'Gym Progress self-service deletion of the authenticated user training cloud data. Scope workout_log removes history/derived social progress; scope all removes programme/history/tracker sync and derived training rows while retaining the account/social relationships.';
comment on function public.gym_delete_my_account() is
  'Gym Progress self-service hard account deletion. Deletes auth.users row; cascading FKs remove profile, friendships, notifications, social activity, comparison points and training sync. Explicitly removes rows that would otherwise use ON DELETE SET NULL.';

commit;

-- Verification: both rows should show SECURITY DEFINER functions owned by the SQL migration owner.
select n.nspname as schema_name, p.proname, p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public' and p.proname in ('gym_erase_my_training_cloud','gym_delete_my_account')
order by p.proname;
