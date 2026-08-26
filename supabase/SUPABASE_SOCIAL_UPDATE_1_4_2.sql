-- Gym Progress social update for PWA v1.4.2 / Android v1.3.2
-- Safe to run repeatedly after SUPABASE_SOCIAL_SETUP.sql.

-- One visual timeline dot per shared workout batch. A workout may be represented
-- by its summary card, by one or more record cards, or by both.
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

-- Durable shared-activity notifications. Multiple cards from the same workout
-- use the same occurred_at and therefore generate only one notification per friend.
alter table public.social_notifications
  add column if not exists activity_occurred_at timestamptz;

alter table public.social_notifications
  drop constraint if exists social_notifications_notification_type_check;
alter table public.social_notifications
  add constraint social_notifications_notification_type_check
  check (notification_type in ('friend_request','friend_accepted','activity_shared'));

create unique index if not exists social_notifications_activity_batch_unique
  on public.social_notifications(user_id, actor_id, activity_occurred_at)
  where notification_type='activity_shared';

create or replace function public.handle_activity_shared_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.social_notifications(user_id, actor_id, notification_type, activity_occurred_at)
  select
    case when f.requester_id = new.user_id then f.addressee_id else f.requester_id end,
    new.user_id,
    'activity_shared',
    new.occurred_at
  from public.friendships f
  where f.status='accepted'
    and (f.requester_id=new.user_id or f.addressee_id=new.user_id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists activity_shared_social_notification on public.activity_events;
create trigger activity_shared_social_notification
  after insert on public.activity_events
  for each row execute function public.handle_activity_shared_notification();

-- Friendship removal also removes unread shared-activity notifications between
-- the two former friends. Shared activity itself is not deleted.
create or replace function public.social_remove_friend(p_friend_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  delete from public.social_notifications
  where notification_type='activity_shared'
    and ((user_id=auth.uid() and actor_id=p_friend_id) or (user_id=p_friend_id and actor_id=auth.uid()));

  delete from public.friendships
  where status='accepted'
    and ((requester_id=auth.uid() and addressee_id=p_friend_id) or (requester_id=p_friend_id and addressee_id=auth.uid()));
end;
$$;

revoke execute on function public.social_remove_friend(uuid) from public, anon;
grant execute on function public.social_remove_friend(uuid) to authenticated;
