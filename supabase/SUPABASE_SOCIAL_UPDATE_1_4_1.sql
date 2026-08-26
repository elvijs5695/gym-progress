-- Gym Progress social timeline update for PWA v1.4.1 / Android v1.3.1
-- Run this once in Supabase SQL Editor after the original social setup.
-- It is safe to re-run.

create or replace function public.social_timeline(p_since timestamptz default (now() - interval '30 days'))
returns table(id uuid,user_id uuid,display_name text,occurred_at timestamptz,effort text,progress_percent numeric,workout_name text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with one_dot_per_workout as (
    select distinct on (e.user_id, e.occurred_at)
      e.id,
      e.user_id,
      p.display_name,
      e.occurred_at,
      e.effort,
      e.progress_percent,
      e.workout_name
    from public.activity_events e
    join public.profiles p on p.id=e.user_id
    where e.occurred_at>=p_since
      and (e.user_id=auth.uid() or public.social_is_friend(auth.uid(),e.user_id))
    order by e.user_id, e.occurred_at,
      case when e.event_type='workout_summary' then 0 else 1 end,
      e.id
  )
  select id,user_id,display_name,occurred_at,effort,progress_percent,workout_name
  from one_dot_per_workout
  order by occurred_at asc,id asc;
$$;

grant execute on function public.social_timeline(timestamptz) to authenticated;
