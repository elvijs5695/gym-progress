-- Gym Progress v1.5.0 / Android v1.4.0 post-migration verification
-- READ ONLY. Run after SUPABASE_EXERCISE_CATALOGUE_AND_COMPARISON.sql.

select 'exercise_families' as object, count(*)::bigint as rows from public.exercise_families
union all select 'canonical_exercises', count(*) from public.canonical_exercises
union all select 'canonical_exercise_translations', count(*) from public.canonical_exercise_translations
union all select 'canonical_exercise_aliases', count(*) from public.canonical_exercise_aliases
union all select 'comparison_eligible_exercises', count(*) from public.canonical_exercises where comparison_eligible=true
union all select 'catalogue_candidates', count(*) from public.catalogue_candidates
union all select 'exercise_comparison_points', count(*) from public.exercise_comparison_points
order by object;

-- For the supplied catalogue release, expect at least:
-- exercise_families >= 27
-- canonical_exercises >= 191
-- canonical_exercise_translations >= 382 (EN + LV)
-- canonical_exercise_aliases >= 76
-- comparison_eligible_exercises >= 9

select c.key, en.name as name_en, lv.name as name_lv, c.equipment, c.comparison_metric
from public.canonical_exercises c
join public.canonical_exercise_translations en on en.exercise_id=c.id and en.language_code='en'
left join public.canonical_exercise_translations lv on lv.exercise_id=c.id and lv.language_code='lv'
where c.comparison_eligible=true
order by en.name;

select tablename, rowsecurity
from pg_tables
where schemaname='public'
  and tablename in ('exercise_families','canonical_exercises','canonical_exercise_translations','canonical_exercise_aliases','catalogue_candidates','exercise_comparison_points')
order by tablename;

select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname='public'
  and tablename in ('exercise_families','canonical_exercises','canonical_exercise_translations','canonical_exercise_aliases','catalogue_candidates','exercise_comparison_points')
order by tablename, policyname;

select
  to_regprocedure('public.social_common_comparable_exercises(uuid)') as common_exercises_rpc,
  to_regprocedure('public.social_exercise_comparison(uuid,uuid,timestamptz)') as comparison_rpc,
  to_regprocedure('public.social_replace_exercise_comparison_points(jsonb)') as replace_comparison_points_rpc;

-- Confirm the pre-existing social schema was not removed.
select
  to_regclass('public.profiles') as profiles,
  to_regclass('public.friendships') as friendships,
  to_regclass('public.activity_events') as activity_events,
  to_regclass('public.social_state') as social_state,
  to_regclass('public.social_notifications') as social_notifications;
