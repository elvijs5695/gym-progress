-- Gym Progress v1.5.0 / Android v1.4.0 pre-migration check
-- READ ONLY. Run this before SUPABASE_EXERCISE_CATALOGUE_AND_COMPARISON.sql.

select
  to_regclass('public.profiles') as profiles,
  to_regclass('public.friendships') as friendships,
  to_regclass('public.activity_events') as activity_events,
  to_regclass('public.social_state') as social_state,
  to_regclass('public.social_notifications') as social_notifications,
  to_regprocedure('public.social_is_friend(uuid,uuid)') as social_is_friend;

-- Expected: every value above is non-null.

select 'profiles' as object, count(*)::bigint as rows from public.profiles
union all select 'friendships', count(*) from public.friendships
union all select 'activity_events', count(*) from public.activity_events
union all select 'social_state', count(*) from public.social_state
union all select 'social_notifications', count(*) from public.social_notifications
order by object;

-- Inventory the current public tables so you have a before-state record.
select tablename, rowsecurity
from pg_tables
where schemaname='public'
order by tablename;
