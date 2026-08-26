-- Gym Progress social update: shared-activity notifications
-- Safe to run after SUPABASE_SOCIAL_SETUP.sql or the previous social updates.

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
