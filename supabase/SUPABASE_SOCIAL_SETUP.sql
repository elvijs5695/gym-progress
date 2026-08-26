-- Gym Progress social backend for Supabase
-- Run this whole file in Supabase Dashboard -> SQL Editor -> New query.
-- It is safe to re-run the grants/policies/functions after the first successful setup,
-- but the table CREATE statements are intentionally guarded with IF NOT EXISTS.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)
);

create unique index if not exists friendships_unique_pair
  on public.friendships (
    least(requester_id::text, addressee_id::text),
    greatest(requester_id::text, addressee_id::text)
  );
create index if not exists friendships_requester_idx on public.friendships(requester_id, status);
create index if not exists friendships_addressee_idx on public.friendships(addressee_id, status);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  client_event_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('workout_summary','exercise_record')),
  occurred_at timestamptz not null,
  comment text check (comment is null or char_length(comment) <= 500),

  workout_name text,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  effort text check (effort is null or effort in ('comfortable','challenging','hard','very-hard','failure','aborted','unknown')),
  progress_percent numeric,
  exercise_names text[],

  exercise_name text,
  record_kind text check (record_kind is null or record_kind in ('weight','reps')),
  record_value numeric,
  previous_value numeric,
  record_unit text check (record_unit is null or record_unit in ('kg','reps')),
  increase_percent numeric,

  created_at timestamptz not null default now(),
  unique(user_id, client_event_id),
  check (
    (event_type = 'workout_summary' and workout_name is not null)
    or
    (event_type = 'exercise_record' and exercise_name is not null and record_kind is not null and record_value is not null)
  )
);
create index if not exists activity_events_feed_idx on public.activity_events(occurred_at desc, id desc);
create index if not exists activity_events_user_idx on public.activity_events(user_id, occurred_at desc);
create index if not exists activity_events_timeline_idx on public.activity_events(event_type, occurred_at desc);

create table if not exists public.social_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  last_seen_at timestamptz not null default '1970-01-01 00:00:00+00',
  updated_at timestamptz not null default now()
);

create table if not exists public.social_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  friendship_id uuid references public.friendships(id) on delete cascade,
  notification_type text not null check (notification_type in ('friend_request','friend_accepted')),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique(user_id, notification_type, friendship_id)
);
create index if not exists social_notifications_user_unread_idx
  on public.social_notifications(user_id, read_at, created_at desc);

-- Create an application profile automatically after the first successful OTP login.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  insert into public.profiles(id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Gym user')
  )
  on conflict (id) do nothing;
  insert into public.social_state(user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_gym_progress on auth.users;
create trigger on_auth_user_created_gym_progress
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Backfill profiles for users created before this script was installed.
insert into public.profiles(id, display_name)
select u.id, coalesce(nullif(trim(u.raw_user_meta_data->>'display_name'), ''), nullif(split_part(coalesce(u.email, ''), '@', 1), ''), 'Gym user')
from auth.users u
on conflict (id) do nothing;
insert into public.social_state(user_id)
select id from public.profiles
on conflict (user_id) do nothing;

-- Generate durable social notifications from friendship changes. The clients poll these
-- while open (and Android also performs periodic background checks), so friend requests
-- and acceptances remain separate from workout activity and do not require cloud workout data.
create or replace function public.handle_friendship_social_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    insert into public.social_notifications(user_id, actor_id, friendship_id, notification_type)
    values(new.addressee_id, new.requester_id, new.id, 'friend_request')
    on conflict(user_id, notification_type, friendship_id) do nothing;
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'accepted' then
    insert into public.social_notifications(user_id, actor_id, friendship_id, notification_type)
    values(new.requester_id, new.addressee_id, new.id, 'friend_accepted')
    on conflict(user_id, notification_type, friendship_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists friendship_social_notification on public.friendships;
create trigger friendship_social_notification
  after insert or update of status on public.friendships
  for each row execute function public.handle_friendship_social_notification();

-- Backfill notification rows for currently pending requests when this schema is applied
-- to an already-used project. Accepted friendships are intentionally not backfilled,
-- because an old acceptance should not suddenly appear as a new notification.
insert into public.social_notifications(user_id, actor_id, friendship_id, notification_type, created_at)
select f.addressee_id, f.requester_id, f.id, 'friend_request', f.created_at
from public.friendships f
where f.status = 'pending'
on conflict(user_id, notification_type, friendship_id) do nothing;

create or replace function public.social_is_friend(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
    and (a = auth.uid() or b = auth.uid())
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = a and f.addressee_id = b) or (f.requester_id = b and f.addressee_id = a))
    );
$$;

create or replace function public.social_set_display_name(p_name text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare n text := trim(coalesce(p_name,''));
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if char_length(n) < 1 or char_length(n) > 60 then raise exception 'Display name must be 1-60 characters'; end if;
  update public.profiles set display_name = n, updated_at = now() where id = auth.uid();
  return n;
end;
$$;

create or replace function public.social_find_user_by_email(p_email text)
returns table(user_id uuid, display_name text, relationship text)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare target uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select u.id into target from auth.users u where lower(u.email) = lower(trim(p_email)) limit 1;
  if target is null or target = auth.uid() then return; end if;
  return query
  select p.id, p.display_name,
    case
      when exists(select 1 from public.friendships f where f.status='accepted' and ((f.requester_id=auth.uid() and f.addressee_id=target) or (f.requester_id=target and f.addressee_id=auth.uid()))) then 'friends'
      when exists(select 1 from public.friendships f where f.status='pending' and f.requester_id=auth.uid() and f.addressee_id=target) then 'outgoing_pending'
      when exists(select 1 from public.friendships f where f.status='pending' and f.requester_id=target and f.addressee_id=auth.uid()) then 'incoming_pending'
      else 'none'
    end
  from public.profiles p where p.id = target;
end;
$$;

create or replace function public.social_send_friend_request(p_email text)
returns text
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare target uuid; existing public.friendships;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select u.id into target from auth.users u where lower(u.email) = lower(trim(p_email)) limit 1;
  if target is null then raise exception 'No Gym Progress account found for that email'; end if;
  if target = auth.uid() then raise exception 'You cannot add yourself'; end if;

  select * into existing from public.friendships f
  where (f.requester_id=auth.uid() and f.addressee_id=target)
     or (f.requester_id=target and f.addressee_id=auth.uid())
  limit 1;

  if existing.id is not null then
    if existing.status='accepted' then return 'friends'; end if;
    if existing.requester_id=target and existing.addressee_id=auth.uid() then
      update public.friendships set status='accepted', responded_at=now() where id=existing.id;
      return 'accepted';
    end if;
    return 'pending';
  end if;

  insert into public.friendships(requester_id,addressee_id,status)
  values(auth.uid(),target,'pending');
  return 'pending';
end;
$$;

create or replace function public.social_accept_friend_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  update public.friendships
  set status='accepted', responded_at=now()
  where id=p_request_id and addressee_id=auth.uid() and status='pending';
  if not found then raise exception 'Friend request not found'; end if;
end;
$$;

create or replace function public.social_reject_friend_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  delete from public.friendships where id=p_request_id and addressee_id=auth.uid() and status='pending';
end;
$$;

create or replace function public.social_remove_friend(p_friend_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  delete from public.friendships
  where status='accepted'
    and ((requester_id=auth.uid() and addressee_id=p_friend_id) or (requester_id=p_friend_id and addressee_id=auth.uid()));
end;
$$;

create or replace function public.social_list_friends()
returns table(user_id uuid, display_name text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id, p.display_name
  from public.friendships f
  join public.profiles p on p.id = case when f.requester_id=auth.uid() then f.addressee_id else f.requester_id end
  where f.status='accepted' and (f.requester_id=auth.uid() or f.addressee_id=auth.uid())
  order by lower(p.display_name), p.id;
$$;

create or replace function public.social_list_incoming_requests()
returns table(request_id uuid, user_id uuid, display_name text, created_at timestamptz)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select f.id, p.id, p.display_name, f.created_at
  from public.friendships f join public.profiles p on p.id=f.requester_id
  where f.status='pending' and f.addressee_id=auth.uid()
  order by f.created_at desc;
$$;

create or replace function public.social_list_notifications(p_limit integer default 20)
returns table(id uuid, notification_type text, actor_id uuid, display_name text, created_at timestamptz)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select n.id, n.notification_type, n.actor_id, p.display_name, n.created_at
  from public.social_notifications n
  join public.profiles p on p.id = n.actor_id
  where n.user_id = auth.uid() and n.read_at is null
  order by n.created_at desc, n.id desc
  limit greatest(1, least(coalesce(p_limit,20),50));
$$;

create or replace function public.social_feed(
  p_before_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 20
)
returns table(
  id uuid, user_id uuid, display_name text, event_type text, occurred_at timestamptz,
  comment text, workout_name text, duration_seconds integer, effort text, progress_percent numeric,
  exercise_names text[], exercise_name text, record_kind text, record_value numeric,
  previous_value numeric, record_unit text, increase_percent numeric
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select e.id,e.user_id,p.display_name,e.event_type,e.occurred_at,e.comment,e.workout_name,e.duration_seconds,
         e.effort,e.progress_percent,e.exercise_names,e.exercise_name,e.record_kind,e.record_value,
         e.previous_value,e.record_unit,e.increase_percent
  from public.activity_events e join public.profiles p on p.id=e.user_id
  where (e.user_id=auth.uid() or public.social_is_friend(auth.uid(),e.user_id))
    and (p_before_at is null or (e.occurred_at,e.id) < (p_before_at,p_before_id))
  order by e.occurred_at desc,e.id desc
  limit greatest(1,least(coalesce(p_limit,20),50));
$$;

create or replace function public.social_timeline(p_since timestamptz default (now() - interval '30 days'))
returns table(id uuid,user_id uuid,display_name text,occurred_at timestamptz,effort text,progress_percent numeric,workout_name text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select e.id,e.user_id,p.display_name,e.occurred_at,e.effort,e.progress_percent,e.workout_name
  from public.activity_events e join public.profiles p on p.id=e.user_id
  where e.event_type='workout_summary'
    and e.occurred_at>=p_since
    and (e.user_id=auth.uid() or public.social_is_friend(auth.uid(),e.user_id))
  order by e.occurred_at asc,e.id asc;
$$;

create or replace function public.social_mark_seen()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then return; end if;
  insert into public.social_state(user_id,last_seen_at,updated_at)
  values(auth.uid(),now(),now())
  on conflict(user_id) do update set last_seen_at=excluded.last_seen_at, updated_at=excluded.updated_at;

  update public.social_notifications
  set read_at = now()
  where user_id = auth.uid() and read_at is null;
end;
$$;

create or replace function public.social_has_unseen()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists(
    select 1 from public.activity_events e
    where e.user_id<>auth.uid()
      and public.social_is_friend(auth.uid(),e.user_id)
      and e.created_at > coalesce((select s.last_seen_at from public.social_state s where s.user_id=auth.uid()),'1970-01-01'::timestamptz)
  ) or exists(
    select 1 from public.social_notifications n
    where n.user_id = auth.uid() and n.read_at is null
  ) or exists(
    -- Compatibility fallback for pending rows that pre-date the notification trigger.
    select 1 from public.friendships f where f.status='pending' and f.addressee_id=auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.activity_events enable row level security;
alter table public.social_state enable row level security;
alter table public.social_notifications enable row level security;

drop policy if exists profiles_select_visible on public.profiles;
create policy profiles_select_visible on public.profiles for select to authenticated using (
  id=auth.uid() or public.social_is_friend(auth.uid(),id)
  or exists(select 1 from public.friendships f where (f.requester_id=auth.uid() and f.addressee_id=id) or (f.requester_id=id and f.addressee_id=auth.uid()))
);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());

drop policy if exists friendships_select_participant on public.friendships;
create policy friendships_select_participant on public.friendships for select to authenticated using(requester_id=auth.uid() or addressee_id=auth.uid());

drop policy if exists activity_select_self_or_friend on public.activity_events;
create policy activity_select_self_or_friend on public.activity_events for select to authenticated using(user_id=auth.uid() or public.social_is_friend(auth.uid(),user_id));
drop policy if exists activity_insert_own on public.activity_events;
create policy activity_insert_own on public.activity_events for insert to authenticated with check(user_id=auth.uid());
drop policy if exists activity_update_own on public.activity_events;
create policy activity_update_own on public.activity_events for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists activity_delete_own on public.activity_events;
create policy activity_delete_own on public.activity_events for delete to authenticated using(user_id=auth.uid());

drop policy if exists social_state_own on public.social_state;
create policy social_state_own on public.social_state for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

drop policy if exists social_notifications_own on public.social_notifications;
create policy social_notifications_own on public.social_notifications for select to authenticated using(user_id=auth.uid());

-- Keep the public API deliberately narrow. Anonymous users cannot read social data.
revoke all on public.profiles, public.friendships, public.activity_events, public.social_state, public.social_notifications from anon;
revoke insert,update,delete on public.friendships from authenticated;
grant select on public.friendships to authenticated;
grant select,update on public.profiles to authenticated;
grant select,insert,update,delete on public.activity_events to authenticated;
grant select,insert,update on public.social_state to authenticated;
revoke all on public.social_notifications from authenticated;

revoke execute on function public.social_is_friend(uuid,uuid) from public, anon;
revoke execute on function public.social_find_user_by_email(text) from public, anon;
revoke execute on function public.social_send_friend_request(text) from public, anon;
revoke execute on function public.social_accept_friend_request(uuid) from public, anon;
revoke execute on function public.social_reject_friend_request(uuid) from public, anon;
revoke execute on function public.social_remove_friend(uuid) from public, anon;
revoke execute on function public.social_list_friends() from public, anon;
revoke execute on function public.social_list_incoming_requests() from public, anon;
revoke execute on function public.social_list_notifications(integer) from public, anon;
revoke execute on function public.social_feed(timestamptz,uuid,integer) from public, anon;
revoke execute on function public.social_timeline(timestamptz) from public, anon;
revoke execute on function public.social_mark_seen() from public, anon;
revoke execute on function public.social_has_unseen() from public, anon;
revoke execute on function public.social_set_display_name(text) from public, anon;

grant execute on function public.social_is_friend(uuid,uuid) to authenticated;
grant execute on function public.social_find_user_by_email(text) to authenticated;
grant execute on function public.social_send_friend_request(text) to authenticated;
grant execute on function public.social_accept_friend_request(uuid) to authenticated;
grant execute on function public.social_reject_friend_request(uuid) to authenticated;
grant execute on function public.social_remove_friend(uuid) to authenticated;
grant execute on function public.social_list_friends() to authenticated;
grant execute on function public.social_list_incoming_requests() to authenticated;
grant execute on function public.social_list_notifications(integer) to authenticated;
grant execute on function public.social_feed(timestamptz,uuid,integer) to authenticated;
grant execute on function public.social_timeline(timestamptz) to authenticated;
grant execute on function public.social_mark_seen() to authenticated;
grant execute on function public.social_has_unseen() to authenticated;
grant execute on function public.social_set_display_name(text) to authenticated;
