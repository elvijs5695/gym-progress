-- Gym Progress v1.6.5 / PWA v1.7.5: reference catalogue and substitutions
-- Run ONCE in Supabase SQL editor after the original SUPABASE_EXERCISE_CATALOGUE_AND_COMPARISON.sql.
-- Additive, re-runnable, and non-destructive. Does not touch training_sync_records or private history.
-- FIXED migration: parent exercise rows inserted and verified before translations / aliases.
-- Use this entire file as a single query in Supabase SQL Editor; do not highlight and run individual lines.
-- If anything fails, the BEGIN/COMMIT transaction rolls back.
-- The original migration is preserved below, with reordered parent/child seeding and key-based child links.
BEGIN;
ALTER TABLE public.canonical_exercises ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'STRENGTH';
ALTER TABLE public.canonical_exercises ADD COLUMN IF NOT EXISTS legacy_exercise_key text;
ALTER TABLE public.canonical_exercises DROP CONSTRAINT IF EXISTS canonical_exercises_category_check;
ALTER TABLE public.canonical_exercises ADD CONSTRAINT canonical_exercises_category_check CHECK (category IN ('STRENGTH','CARDIO'));
CREATE UNIQUE INDEX IF NOT EXISTS canonical_exercises_legacy_key_unique_idx ON public.canonical_exercises (legacy_exercise_key) WHERE legacy_exercise_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS canonical_exercises_category_idx ON public.canonical_exercises (category) WHERE status = 'ACTIVE';
UPDATE public.canonical_exercises SET legacy_exercise_key='biceps_curl' WHERE key='barbell_biceps_curl' AND legacy_exercise_key IS DISTINCT FROM 'biceps_curl';
UPDATE public.canonical_exercises SET legacy_exercise_key='calf_raise' WHERE key='standing_calf_raise_machine' AND legacy_exercise_key IS DISTINCT FROM 'calf_raise';
UPDATE public.canonical_exercises SET legacy_exercise_key='cable_fly' WHERE key='cable_fly' AND legacy_exercise_key IS DISTINCT FROM 'cable_fly';
UPDATE public.canonical_exercises SET legacy_exercise_key='pec_deck' WHERE key='pec_deck' AND legacy_exercise_key IS DISTINCT FROM 'pec_deck';
UPDATE public.canonical_exercises SET legacy_exercise_key='barbell_bench_press' WHERE key='barbell_bench_press' AND legacy_exercise_key IS DISTINCT FROM 'barbell_bench_press';
UPDATE public.canonical_exercises SET legacy_exercise_key='dumbbell_bench_press' WHERE key='dumbbell_bench_press' AND legacy_exercise_key IS DISTINCT FROM 'dumbbell_bench_press';
UPDATE public.canonical_exercises SET legacy_exercise_key='incline_barbell_press' WHERE key='incline_barbell_bench_press' AND legacy_exercise_key IS DISTINCT FROM 'incline_barbell_press';
UPDATE public.canonical_exercises SET legacy_exercise_key='incline_dumbbell_press' WHERE key='incline_dumbbell_bench_press' AND legacy_exercise_key IS DISTINCT FROM 'incline_dumbbell_press';
UPDATE public.canonical_exercises SET legacy_exercise_key='chest_press_machine' WHERE key='machine_chest_press' AND legacy_exercise_key IS DISTINCT FROM 'chest_press_machine';
UPDATE public.canonical_exercises SET legacy_exercise_key='hip_thrust' WHERE key='barbell_hip_thrust' AND legacy_exercise_key IS DISTINCT FROM 'hip_thrust';
UPDATE public.canonical_exercises SET legacy_exercise_key='romanian_deadlift' WHERE key='barbell_romanian_deadlift' AND legacy_exercise_key IS DISTINCT FROM 'romanian_deadlift';
UPDATE public.canonical_exercises SET legacy_exercise_key='deadlift' WHERE key='conventional_deadlift' AND legacy_exercise_key IS DISTINCT FROM 'deadlift';
UPDATE public.canonical_exercises SET legacy_exercise_key='sumo_deadlift' WHERE key='sumo_deadlift' AND legacy_exercise_key IS DISTINCT FROM 'sumo_deadlift';
UPDATE public.canonical_exercises SET legacy_exercise_key='barbell_row' WHERE key='barbell_row' AND legacy_exercise_key IS DISTINCT FROM 'barbell_row';
UPDATE public.canonical_exercises SET legacy_exercise_key='seated_cable_row' WHERE key='seated_cable_row' AND legacy_exercise_key IS DISTINCT FROM 'seated_cable_row';
UPDATE public.canonical_exercises SET legacy_exercise_key='leg_extension' WHERE key='leg_extension' AND legacy_exercise_key IS DISTINCT FROM 'leg_extension';
UPDATE public.canonical_exercises SET legacy_exercise_key='leg_curl' WHERE key='leg_curl_machine' AND legacy_exercise_key IS DISTINCT FROM 'leg_curl';
UPDATE public.canonical_exercises SET legacy_exercise_key='leg_press' WHERE key='leg_press' AND legacy_exercise_key IS DISTINCT FROM 'leg_press';
UPDATE public.canonical_exercises SET legacy_exercise_key='split_squat' WHERE key='dumbbell_bulgarian_split_squat' AND legacy_exercise_key IS DISTINCT FROM 'split_squat';
UPDATE public.canonical_exercises SET legacy_exercise_key='lateral_raise' WHERE key='dumbbell_lateral_raise' AND legacy_exercise_key IS DISTINCT FROM 'lateral_raise';
UPDATE public.canonical_exercises SET legacy_exercise_key='overhead_press' WHERE key='barbell_overhead_press' AND legacy_exercise_key IS DISTINCT FROM 'overhead_press';
UPDATE public.canonical_exercises SET legacy_exercise_key='dumbbell_shoulder_press' WHERE key='dumbbell_shoulder_press' AND legacy_exercise_key IS DISTINCT FROM 'dumbbell_shoulder_press';
UPDATE public.canonical_exercises SET legacy_exercise_key='shoulder_press_machine' WHERE key='machine_shoulder_press' AND legacy_exercise_key IS DISTINCT FROM 'shoulder_press_machine';
UPDATE public.canonical_exercises SET legacy_exercise_key='back_squat' WHERE key='barbell_back_squat' AND legacy_exercise_key IS DISTINCT FROM 'back_squat';
UPDATE public.canonical_exercises SET legacy_exercise_key='front_squat' WHERE key='barbell_front_squat' AND legacy_exercise_key IS DISTINCT FROM 'front_squat';
UPDATE public.canonical_exercises SET legacy_exercise_key='hack_squat' WHERE key='hack_squat' AND legacy_exercise_key IS DISTINCT FROM 'hack_squat';
UPDATE public.canonical_exercises SET legacy_exercise_key='triceps_pushdown' WHERE key='cable_triceps_pushdown' AND legacy_exercise_key IS DISTINCT FROM 'triceps_pushdown';
UPDATE public.canonical_exercises SET legacy_exercise_key='lat_pulldown' WHERE key='lat_pulldown' AND legacy_exercise_key IS DISTINCT FROM 'lat_pulldown';
UPDATE public.canonical_exercises SET legacy_exercise_key='pull_up' WHERE key='pull_up' AND legacy_exercise_key IS DISTINCT FROM 'pull_up';
INSERT INTO public.exercise_families(id,key,status) VALUES ('7b6c6469-2ca5-54da-a7db-8ef9bff16ea6'::uuid,'CARDIO_RUN','ACTIVE') ON CONFLICT(id) DO UPDATE SET key=EXCLUDED.key, status='ACTIVE', updated_at=now();
INSERT INTO public.exercise_families(id,key,status) VALUES ('40bf436f-f13f-564c-b4d1-7aaeb1d1ad26'::uuid,'CARDIO_CYCLE','ACTIVE') ON CONFLICT(id) DO UPDATE SET key=EXCLUDED.key, status='ACTIVE', updated_at=now();
INSERT INTO public.exercise_families(id,key,status) VALUES ('12a59804-e6fb-58a8-9364-4b7a499941ad'::uuid,'CARDIO_ROW','ACTIVE') ON CONFLICT(id) DO UPDATE SET key=EXCLUDED.key, status='ACTIVE', updated_at=now();
INSERT INTO public.exercise_families(id,key,status) VALUES ('eef926a5-e9d8-5b99-b81c-398bd8528ed2'::uuid,'CARDIO_WALK','ACTIVE') ON CONFLICT(id) DO UPDATE SET key=EXCLUDED.key, status='ACTIVE', updated_at=now();
INSERT INTO public.exercise_families(id,key,status) VALUES ('31ee5d45-476a-5457-92b6-dac83064cbd7'::uuid,'CARDIO_MACHINE','ACTIVE') ON CONFLICT(id) DO UPDATE SET key=EXCLUDED.key, status='ACTIVE', updated_at=now();
INSERT INTO public.exercise_families(id,key,status) VALUES ('dc3df7d7-21a9-5af9-b5ab-5a30eb4c3915'::uuid,'CARDIO_SWIM','ACTIVE') ON CONFLICT(id) DO UPDATE SET key=EXCLUDED.key, status='ACTIVE', updated_at=now();
INSERT INTO public.exercise_families(id,key,status) VALUES ('cdae8f1b-223c-5532-ada3-676b1d45af12'::uuid,'CARDIO_OTHER','ACTIVE') ON CONFLICT(id) DO UPDATE SET key=EXCLUDED.key, status='ACTIVE', updated_at=now();

-- Phase 1: all cardio exercise parent rows, upserted by stable exercise key.
INSERT INTO public.canonical_exercises(id,key,family_id,equipment,dumbbell_load,exercise_type,load_semantics,comparison_eligible,comparison_metric,status,category,legacy_exercise_key) VALUES ('f4ed03c8-f99e-5ea5-97fe-d335963384bc'::uuid,'running','7b6c6469-2ca5-54da-a7db-8ef9bff16ea6'::uuid,'CARDIO','SINGLE','MODERATE_COMPOUND','NO_LOAD',false,NULL,'ACTIVE','CARDIO','running') ON CONFLICT(key) DO UPDATE SET key=EXCLUDED.key,family_id=EXCLUDED.family_id,equipment='CARDIO',category='CARDIO',status='ACTIVE',legacy_exercise_key=EXCLUDED.legacy_exercise_key,updated_at=now();
INSERT INTO public.canonical_exercises(id,key,family_id,equipment,dumbbell_load,exercise_type,load_semantics,comparison_eligible,comparison_metric,status,category,legacy_exercise_key) VALUES ('034dd92b-8842-596d-b457-9ec8b07ce4b1'::uuid,'outdoor_running','7b6c6469-2ca5-54da-a7db-8ef9bff16ea6'::uuid,'CARDIO','SINGLE','MODERATE_COMPOUND','NO_LOAD',false,NULL,'ACTIVE','CARDIO',NULL) ON CONFLICT(key) DO UPDATE SET key=EXCLUDED.key,family_id=EXCLUDED.family_id,equipment='CARDIO',category='CARDIO',status='ACTIVE',legacy_exercise_key=EXCLUDED.legacy_exercise_key,updated_at=now();
INSERT INTO public.canonical_exercises(id,key,family_id,equipment,dumbbell_load,exercise_type,load_semantics,comparison_eligible,comparison_metric,status,category,legacy_exercise_key) VALUES ('56b62c8d-67a8-53f6-8d94-0d8db4c9003c'::uuid,'cycling','40bf436f-f13f-564c-b4d1-7aaeb1d1ad26'::uuid,'CARDIO','SINGLE','MODERATE_COMPOUND','NO_LOAD',false,NULL,'ACTIVE','CARDIO','cycling') ON CONFLICT(key) DO UPDATE SET key=EXCLUDED.key,family_id=EXCLUDED.family_id,equipment='CARDIO',category='CARDIO',status='ACTIVE',legacy_exercise_key=EXCLUDED.legacy_exercise_key,updated_at=now();
INSERT INTO public.canonical_exercises(id,key,family_id,equipment,dumbbell_load,exercise_type,load_semantics,comparison_eligible,comparison_metric,status,category,legacy_exercise_key) VALUES ('72d32fc6-55f9-548a-a560-3d603233a5c1'::uuid,'outdoor_cycling','40bf436f-f13f-564c-b4d1-7aaeb1d1ad26'::uuid,'CARDIO','SINGLE','MODERATE_COMPOUND','NO_LOAD',false,NULL,'ACTIVE','CARDIO',NULL) ON CONFLICT(key) DO UPDATE SET key=EXCLUDED.key,family_id=EXCLUDED.family_id,equipment='CARDIO',category='CARDIO',status='ACTIVE',legacy_exercise_key=EXCLUDED.legacy_exercise_key,updated_at=now();
INSERT INTO public.canonical_exercises(id,key,family_id,equipment,dumbbell_load,exercise_type,load_semantics,comparison_eligible,comparison_metric,status,category,legacy_exercise_key) VALUES ('fc3f9236-94df-571b-84a3-8b4723bf2c2b'::uuid,'rowing_cardio','12a59804-e6fb-58a8-9364-4b7a499941ad'::uuid,'CARDIO','SINGLE','MODERATE_COMPOUND','NO_LOAD',false,NULL,'ACTIVE','CARDIO','rowing_cardio') ON CONFLICT(key) DO UPDATE SET key=EXCLUDED.key,family_id=EXCLUDED.family_id,equipment='CARDIO',category='CARDIO',status='ACTIVE',legacy_exercise_key=EXCLUDED.legacy_exercise_key,updated_at=now();
INSERT INTO public.canonical_exercises(id,key,family_id,equipment,dumbbell_load,exercise_type,load_semantics,comparison_eligible,comparison_metric,status,category,legacy_exercise_key) VALUES ('19ddca72-f87c-533d-97ed-b9f10855cd68'::uuid,'elliptical_cardio','31ee5d45-476a-5457-92b6-dac83064cbd7'::uuid,'CARDIO','SINGLE','MODERATE_COMPOUND','NO_LOAD',false,NULL,'ACTIVE','CARDIO','elliptical_cardio') ON CONFLICT(key) DO UPDATE SET key=EXCLUDED.key,family_id=EXCLUDED.family_id,equipment='CARDIO',category='CARDIO',status='ACTIVE',legacy_exercise_key=EXCLUDED.legacy_exercise_key,updated_at=now();
INSERT INTO public.canonical_exercises(id,key,family_id,equipment,dumbbell_load,exercise_type,load_semantics,comparison_eligible,comparison_metric,status,category,legacy_exercise_key) VALUES ('e819002c-76bb-579b-965c-20581d23149e'::uuid,'walking','eef926a5-e9d8-5b99-b81c-398bd8528ed2'::uuid,'CARDIO','SINGLE','MODERATE_COMPOUND','NO_LOAD',false,NULL,'ACTIVE','CARDIO','walking') ON CONFLICT(key) DO UPDATE SET key=EXCLUDED.key,family_id=EXCLUDED.family_id,equipment='CARDIO',category='CARDIO',status='ACTIVE',legacy_exercise_key=EXCLUDED.legacy_exercise_key,updated_at=now();
INSERT INTO public.canonical_exercises(id,key,family_id,equipment,dumbbell_load,exercise_type,load_semantics,comparison_eligible,comparison_metric,status,category,legacy_exercise_key) VALUES ('ef8aa547-00f1-5e01-a9cb-81e6808c6e26'::uuid,'outdoor_walking','eef926a5-e9d8-5b99-b81c-398bd8528ed2'::uuid,'CARDIO','SINGLE','MODERATE_COMPOUND','NO_LOAD',false,NULL,'ACTIVE','CARDIO',NULL) ON CONFLICT(key) DO UPDATE SET key=EXCLUDED.key,family_id=EXCLUDED.family_id,equipment='CARDIO',category='CARDIO',status='ACTIVE',legacy_exercise_key=EXCLUDED.legacy_exercise_key,updated_at=now();
INSERT INTO public.canonical_exercises(id,key,family_id,equipment,dumbbell_load,exercise_type,load_semantics,comparison_eligible,comparison_metric,status,category,legacy_exercise_key) VALUES ('a6d224c3-3184-53e4-a0f7-1b98ca6f156d'::uuid,'stair_climber','31ee5d45-476a-5457-92b6-dac83064cbd7'::uuid,'CARDIO','SINGLE','MODERATE_COMPOUND','NO_LOAD',false,NULL,'ACTIVE','CARDIO',NULL) ON CONFLICT(key) DO UPDATE SET key=EXCLUDED.key,family_id=EXCLUDED.family_id,equipment='CARDIO',category='CARDIO',status='ACTIVE',legacy_exercise_key=EXCLUDED.legacy_exercise_key,updated_at=now();
INSERT INTO public.canonical_exercises(id,key,family_id,equipment,dumbbell_load,exercise_type,load_semantics,comparison_eligible,comparison_metric,status,category,legacy_exercise_key) VALUES ('db54ffec-3ecb-563b-9a71-0d72f9746c7d'::uuid,'swimming','dc3df7d7-21a9-5af9-b5ab-5a30eb4c3915'::uuid,'CARDIO','SINGLE','MODERATE_COMPOUND','NO_LOAD',false,NULL,'ACTIVE','CARDIO',NULL) ON CONFLICT(key) DO UPDATE SET key=EXCLUDED.key,family_id=EXCLUDED.family_id,equipment='CARDIO',category='CARDIO',status='ACTIVE',legacy_exercise_key=EXCLUDED.legacy_exercise_key,updated_at=now();
INSERT INTO public.canonical_exercises(id,key,family_id,equipment,dumbbell_load,exercise_type,load_semantics,comparison_eligible,comparison_metric,status,category,legacy_exercise_key) VALUES ('96fbbd83-12bf-5529-af13-8677da513ba9'::uuid,'ski_erg','12a59804-e6fb-58a8-9364-4b7a499941ad'::uuid,'CARDIO','SINGLE','MODERATE_COMPOUND','NO_LOAD',false,NULL,'ACTIVE','CARDIO',NULL) ON CONFLICT(key) DO UPDATE SET key=EXCLUDED.key,family_id=EXCLUDED.family_id,equipment='CARDIO',category='CARDIO',status='ACTIVE',legacy_exercise_key=EXCLUDED.legacy_exercise_key,updated_at=now();
INSERT INTO public.canonical_exercises(id,key,family_id,equipment,dumbbell_load,exercise_type,load_semantics,comparison_eligible,comparison_metric,status,category,legacy_exercise_key) VALUES ('60a2f0e8-37f5-5086-bb9c-885f52000775'::uuid,'jump_rope','cdae8f1b-223c-5532-ada3-676b1d45af12'::uuid,'CARDIO','SINGLE','MODERATE_COMPOUND','NO_LOAD',false,NULL,'ACTIVE','CARDIO',NULL) ON CONFLICT(key) DO UPDATE SET key=EXCLUDED.key,family_id=EXCLUDED.family_id,equipment='CARDIO',category='CARDIO',status='ACTIVE',legacy_exercise_key=EXCLUDED.legacy_exercise_key,updated_at=now();
INSERT INTO public.canonical_exercises(id,key,family_id,equipment,dumbbell_load,exercise_type,load_semantics,comparison_eligible,comparison_metric,status,category,legacy_exercise_key) VALUES ('621d5eb7-3a53-5e65-92fb-761830dd3af6'::uuid,'air_bike','40bf436f-f13f-564c-b4d1-7aaeb1d1ad26'::uuid,'CARDIO','SINGLE','MODERATE_COMPOUND','NO_LOAD',false,NULL,'ACTIVE','CARDIO',NULL) ON CONFLICT(key) DO UPDATE SET key=EXCLUDED.key,family_id=EXCLUDED.family_id,equipment='CARDIO',category='CARDIO',status='ACTIVE',legacy_exercise_key=EXCLUDED.legacy_exercise_key,updated_at=now();
INSERT INTO public.canonical_exercises(id,key,family_id,equipment,dumbbell_load,exercise_type,load_semantics,comparison_eligible,comparison_metric,status,category,legacy_exercise_key) VALUES ('466d0c48-51b3-597a-b059-0e1a9367d623'::uuid,'hiking','eef926a5-e9d8-5b99-b81c-398bd8528ed2'::uuid,'CARDIO','SINGLE','MODERATE_COMPOUND','NO_LOAD',false,NULL,'ACTIVE','CARDIO',NULL) ON CONFLICT(key) DO UPDATE SET key=EXCLUDED.key,family_id=EXCLUDED.family_id,equipment='CARDIO',category='CARDIO',status='ACTIVE',legacy_exercise_key=EXCLUDED.legacy_exercise_key,updated_at=now();

-- Fail clearly rather than allowing orphaned translations if an exercise insert was skipped.
DO $catalogue_check$
DECLARE
    missing_keys text;
BEGIN
    SELECT string_agg(wanted.key, ', ' ORDER BY wanted.key)
    INTO missing_keys
    FROM unnest(ARRAY['running','outdoor_running','cycling','outdoor_cycling','rowing_cardio','elliptical_cardio','walking','outdoor_walking','stair_climber','swimming','ski_erg','jump_rope','air_bike','hiking']::text[]) AS wanted(key)
    LEFT JOIN public.canonical_exercises AS e ON e.key = wanted.key
    WHERE e.id IS NULL OR e.category <> 'CARDIO';
    IF missing_keys IS NOT NULL THEN
        RAISE EXCEPTION 'Cardio catalogue is incomplete before translations. Missing or incorrectly categorised: %', missing_keys;
    END IF;
END
$catalogue_check$;

-- Phase 2: translations and aliases, resolved from the actual parent ID by exercise key.
INSERT INTO public.canonical_exercise_translations(exercise_id,language_code,name) SELECT e.id,'en','Running / Treadmill' FROM public.canonical_exercises AS e WHERE e.key='running' ON CONFLICT(exercise_id,language_code) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO public.canonical_exercise_translations(exercise_id,language_code,name) SELECT e.id,'lv','Skriešana / skrejceliņš' FROM public.canonical_exercises AS e WHERE e.key='running' ON CONFLICT(exercise_id,language_code) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO public.canonical_exercise_aliases(exercise_id,language_code,alias) SELECT e.id,'en','Run' FROM public.canonical_exercises AS e WHERE e.key='running' ON CONFLICT(exercise_id,language_code,alias) DO NOTHING;
INSERT INTO public.canonical_exercise_aliases(exercise_id,language_code,alias) SELECT e.id,'en','Treadmill' FROM public.canonical_exercises AS e WHERE e.key='running' ON CONFLICT(exercise_id,language_code,alias) DO NOTHING;
INSERT INTO public.canonical_exercise_translations(exercise_id,language_code,name) SELECT e.id,'en','Outdoor Running' FROM public.canonical_exercises AS e WHERE e.key='outdoor_running' ON CONFLICT(exercise_id,language_code) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO public.canonical_exercise_translations(exercise_id,language_code,name) SELECT e.id,'lv','Skriešana ārā' FROM public.canonical_exercises AS e WHERE e.key='outdoor_running' ON CONFLICT(exercise_id,language_code) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO public.canonical_exercise_aliases(exercise_id,language_code,alias) SELECT e.id,'en','Jogging' FROM public.canonical_exercises AS e WHERE e.key='outdoor_running' ON CONFLICT(exercise_id,language_code,alias) DO NOTHING;
INSERT INTO public.canonical_exercise_translations(exercise_id,language_code,name) SELECT e.id,'en','Cycling / Stationary Bike' FROM public.canonical_exercises AS e WHERE e.key='cycling' ON CONFLICT(exercise_id,language_code) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO public.canonical_exercise_translations(exercise_id,language_code,name) SELECT e.id,'lv','Riteņbraukšana / veloergometrs' FROM public.canonical_exercises AS e WHERE e.key='cycling' ON CONFLICT(exercise_id,language_code) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO public.canonical_exercise_aliases(exercise_id,language_code,alias) SELECT e.id,'en','Cycle' FROM public.canonical_exercises AS e WHERE e.key='cycling' ON CONFLICT(exercise_id,language_code,alias) DO NOTHING;
INSERT INTO public.canonical_exercise_aliases(exercise_id,language_code,alias) SELECT e.id,'en','Spin Bike' FROM public.canonical_exercises AS e WHERE e.key='cycling' ON CONFLICT(exercise_id,language_code,alias) DO NOTHING;
INSERT INTO public.canonical_exercise_translations(exercise_id,language_code,name) SELECT e.id,'en','Outdoor Cycling' FROM public.canonical_exercises AS e WHERE e.key='outdoor_cycling' ON CONFLICT(exercise_id,language_code) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO public.canonical_exercise_translations(exercise_id,language_code,name) SELECT e.id,'lv','Riteņbraukšana ārā' FROM public.canonical_exercises AS e WHERE e.key='outdoor_cycling' ON CONFLICT(exercise_id,language_code) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO public.canonical_exercise_aliases(exercise_id,language_code,alias) SELECT e.id,'en','Road Cycling' FROM public.canonical_exercises AS e WHERE e.key='outdoor_cycling' ON CONFLICT(exercise_id,language_code,alias) DO NOTHING;
INSERT INTO public.canonical_exercise_translations(exercise_id,language_code,name) SELECT e.id,'en','Rowing Ergometer' FROM public.canonical_exercises AS e WHERE e.key='rowing_cardio' ON CONFLICT(exercise_id,language_code) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO public.canonical_exercise_translations(exercise_id,language_code,name) SELECT e.id,'lv','Airēšanas ergometrs' FROM public.canonical_exercises AS e WHERE e.key='rowing_cardio' ON CONFLICT(exercise_id,language_code) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO public.canonical_exercise_aliases(exercise_id,language_code,alias) SELECT e.id,'en','Indoor Rowing' FROM public.canonical_exercises AS e WHERE e.key='rowing_cardio' ON CONFLICT(exercise_id,language_code,alias) DO NOTHING;
INSERT INTO public.canonical_exercise_translations(exercise_id,language_code,name) SELECT e.id,'en','Elliptical Trainer' FROM public.canonical_exercises AS e WHERE e.key='elliptical_cardio' ON CONFLICT(exercise_id,language_code) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO public.canonical_exercise_translations(exercise_id,language_code,name) SELECT e.id,'lv','Eliptiskais trenažieris' FROM public.canonical_exercises AS e WHERE e.key='elliptical_cardio' ON CONFLICT(exercise_id,language_code) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO public.canonical_exercise_translations(exercise_id,language_code,name) SELECT e.id,'en','Walking / Incline Treadmill' FROM public.canonical_exercises AS e WHERE e.key='walking' ON CONFLICT(exercise_id,language_code) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO public.canonical_exercise_translations(exercise_id,language_code,name) SELECT e.id,'lv','Iešana / slīps skrejceliņš' FROM public.canonical_exercises AS e WHERE e.key='walking' ON CONFLICT(exercise_id,language_code) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO public.canonical_exercise_aliases(exercise_id,language_code,alias) SELECT e.id,'en','Walking' FROM public.canonical_exercises AS e WHERE e.key='walking' ON CONFLICT(exercise_id,language_code,alias) DO NOTHING;
INSERT INTO public.canonical_exercise_translations(exercise_id,language_code,name) SELECT e.id,'en','Outdoor Walking' FROM public.canonical_exercises AS e WHERE e.key='outdoor_walking' ON CONFLICT(exercise_id,language_code) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO public.canonical_exercise_translations(exercise_id,language_code,name) SELECT e.id,'lv','Iešana ārā' FROM public.canonical_exercises AS e WHERE e.key='outdoor_walking' ON CONFLICT(exercise_id,language_code) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO public.canonical_exercise_aliases(exercise_id,language_code,alias) SELECT e.id,'en','Walking Outdoors' FROM public.canonical_exercises AS e WHERE e.key='outdoor_walking' ON CONFLICT(exercise_id,language_code,alias) DO NOTHING;
INSERT INTO public.canonical_exercise_translations(exercise_id,language_code,name) SELECT e.id,'en','Stair Climber' FROM public.canonical_exercises AS e WHERE e.key='stair_climber' ON CONFLICT(exercise_id,language_code) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO public.canonical_exercise_translations(exercise_id,language_code,name) SELECT e.id,'lv','Kāpņu trenažieris' FROM public.canonical_exercises AS e WHERE e.key='stair_climber' ON CONFLICT(exercise_id,language_code) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO public.canonical_exercise_aliases(exercise_id,language_code,alias) SELECT e.id,'en','Stairmaster' FROM public.canonical_exercises AS e WHERE e.key='stair_climber' ON CONFLICT(exercise_id,language_code,alias) DO NOTHING;
INSERT INTO public.canonical_exercise_translations(exercise_id,language_code,name) SELECT e.id,'en','Swimming' FROM public.canonical_exercises AS e WHERE e.key='swimming' ON CONFLICT(exercise_id,language_code) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO public.canonical_exercise_translations(exercise_id,language_code,name) SELECT e.id,'lv','Peldēšana' FROM public.canonical_exercises AS e WHERE e.key='swimming' ON CONFLICT(exercise_id,language_code) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO public.canonical_exercise_aliases(exercise_id,language_code,alias) SELECT e.id,'en','Pool Swimming' FROM public.canonical_exercises AS e WHERE e.key='swimming' ON CONFLICT(exercise_id,language_code,alias) DO NOTHING;
INSERT INTO public.canonical_exercise_translations(exercise_id,language_code,name) SELECT e.id,'en','SkiErg' FROM public.canonical_exercises AS e WHERE e.key='ski_erg' ON CONFLICT(exercise_id,language_code) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO public.canonical_exercise_translations(exercise_id,language_code,name) SELECT e.id,'lv','Slēpošanas ergometrs' FROM public.canonical_exercises AS e WHERE e.key='ski_erg' ON CONFLICT(exercise_id,language_code) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO public.canonical_exercise_aliases(exercise_id,language_code,alias) SELECT e.id,'en','Ski Ergometer' FROM public.canonical_exercises AS e WHERE e.key='ski_erg' ON CONFLICT(exercise_id,language_code,alias) DO NOTHING;
INSERT INTO public.canonical_exercise_translations(exercise_id,language_code,name) SELECT e.id,'en','Jump Rope' FROM public.canonical_exercises AS e WHERE e.key='jump_rope' ON CONFLICT(exercise_id,language_code) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO public.canonical_exercise_translations(exercise_id,language_code,name) SELECT e.id,'lv','Lēkšana ar lecamauklu' FROM public.canonical_exercises AS e WHERE e.key='jump_rope' ON CONFLICT(exercise_id,language_code) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO public.canonical_exercise_aliases(exercise_id,language_code,alias) SELECT e.id,'en','Skipping Rope' FROM public.canonical_exercises AS e WHERE e.key='jump_rope' ON CONFLICT(exercise_id,language_code,alias) DO NOTHING;
INSERT INTO public.canonical_exercise_translations(exercise_id,language_code,name) SELECT e.id,'en','Air Bike' FROM public.canonical_exercises AS e WHERE e.key='air_bike' ON CONFLICT(exercise_id,language_code) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO public.canonical_exercise_translations(exercise_id,language_code,name) SELECT e.id,'lv','Gaisa velotrenažieris' FROM public.canonical_exercises AS e WHERE e.key='air_bike' ON CONFLICT(exercise_id,language_code) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO public.canonical_exercise_aliases(exercise_id,language_code,alias) SELECT e.id,'en','Assault Bike' FROM public.canonical_exercises AS e WHERE e.key='air_bike' ON CONFLICT(exercise_id,language_code,alias) DO NOTHING;
INSERT INTO public.canonical_exercise_translations(exercise_id,language_code,name) SELECT e.id,'en','Hiking' FROM public.canonical_exercises AS e WHERE e.key='hiking' ON CONFLICT(exercise_id,language_code) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO public.canonical_exercise_translations(exercise_id,language_code,name) SELECT e.id,'lv','Pārgājiens' FROM public.canonical_exercises AS e WHERE e.key='hiking' ON CONFLICT(exercise_id,language_code) DO UPDATE SET name=EXCLUDED.name;

-- Verify both language rows were inserted for each cardio exercise.
DO $translation_check$
DECLARE missing_keys text;
BEGIN
    SELECT string_agg(e.key, ', ' ORDER BY e.key)
    INTO missing_keys
    FROM public.canonical_exercises e
    WHERE e.key = ANY(ARRAY['running','outdoor_running','cycling','outdoor_cycling','rowing_cardio','elliptical_cardio','walking','outdoor_walking','stair_climber','swimming','ski_erg','jump_rope','air_bike','hiking']::text[])
      AND (NOT EXISTS (
              SELECT 1 FROM public.canonical_exercise_translations t
              WHERE t.exercise_id=e.id AND t.language_code='en'
           ) OR NOT EXISTS (
              SELECT 1 FROM public.canonical_exercise_translations t
              WHERE t.exercise_id=e.id AND t.language_code='lv'
           ));
    IF missing_keys IS NOT NULL THEN
        RAISE EXCEPTION 'Cardio translations incomplete: %', missing_keys;
    END IF;
END
$translation_check$;

CREATE TABLE IF NOT EXISTS public.canonical_exercise_substitutions (
  source_exercise_id uuid NOT NULL REFERENCES public.canonical_exercises(id) ON DELETE CASCADE,
  alternative_exercise_id uuid NOT NULL REFERENCES public.canonical_exercises(id) ON DELETE CASCADE,
  relationship text NOT NULL CHECK (relationship IN ('EQUIVALENT','CLOSE')),
  priority integer NOT NULL DEFAULT 100 CHECK (priority BETWEEN 0 AND 10000),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','DEPRECATED')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_exercise_id,alternative_exercise_id),
  CHECK (source_exercise_id <> alternative_exercise_id)
);
CREATE INDEX IF NOT EXISTS canonical_substitutions_target_idx ON public.canonical_exercise_substitutions(alternative_exercise_id);
ALTER TABLE public.canonical_exercise_substitutions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS canonical_exercise_substitutions_public_read ON public.canonical_exercise_substitutions;
CREATE POLICY canonical_exercise_substitutions_public_read ON public.canonical_exercise_substitutions FOR SELECT TO anon,authenticated USING (status = 'ACTIVE');
REVOKE ALL ON public.canonical_exercise_substitutions FROM anon, authenticated;
GRANT SELECT ON public.canonical_exercise_substitutions TO anon, authenticated;
-- Seed explicit vetted relationships using canonical keys. Old legacy aliases have been resolved to those keys.
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'CLOSE',50 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='cycling' WHERE s.key='air_bike' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'CLOSE',50 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='barbell_front_squat' WHERE s.key='barbell_back_squat' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'CLOSE',50 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='hack_squat' WHERE s.key='barbell_back_squat' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'CLOSE',50 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='leg_press' WHERE s.key='barbell_back_squat' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'EQUIVALENT',10 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='dumbbell_bench_press' WHERE s.key='barbell_bench_press' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'EQUIVALENT',10 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='machine_chest_press' WHERE s.key='barbell_bench_press' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'CLOSE',50 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='barbell_back_squat' WHERE s.key='barbell_front_squat' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'CLOSE',50 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='hack_squat' WHERE s.key='barbell_front_squat' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'CLOSE',50 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='leg_press' WHERE s.key='barbell_front_squat' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'EQUIVALENT',10 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='dumbbell_shoulder_press' WHERE s.key='barbell_overhead_press' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'EQUIVALENT',10 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='machine_shoulder_press' WHERE s.key='barbell_overhead_press' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'CLOSE',50 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='conventional_deadlift' WHERE s.key='barbell_romanian_deadlift' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'CLOSE',50 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='sumo_deadlift' WHERE s.key='barbell_romanian_deadlift' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'CLOSE',50 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='seated_cable_row' WHERE s.key='barbell_row' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'EQUIVALENT',10 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='pec_deck' WHERE s.key='cable_fly' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'CLOSE',50 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='barbell_romanian_deadlift' WHERE s.key='conventional_deadlift' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'CLOSE',50 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='sumo_deadlift' WHERE s.key='conventional_deadlift' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'CLOSE',50 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='air_bike' WHERE s.key='cycling' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'CLOSE',55 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='outdoor_cycling' WHERE s.key='cycling' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'EQUIVALENT',10 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='barbell_bench_press' WHERE s.key='dumbbell_bench_press' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'EQUIVALENT',10 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='machine_chest_press' WHERE s.key='dumbbell_bench_press' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'EQUIVALENT',10 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='barbell_overhead_press' WHERE s.key='dumbbell_shoulder_press' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'EQUIVALENT',10 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='machine_shoulder_press' WHERE s.key='dumbbell_shoulder_press' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'CLOSE',50 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='barbell_back_squat' WHERE s.key='hack_squat' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'CLOSE',50 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='barbell_front_squat' WHERE s.key='hack_squat' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'CLOSE',50 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='leg_press' WHERE s.key='hack_squat' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'CLOSE',55 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='walking' WHERE s.key='hiking' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'EQUIVALENT',10 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='incline_dumbbell_bench_press' WHERE s.key='incline_barbell_bench_press' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'EQUIVALENT',10 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='incline_barbell_bench_press' WHERE s.key='incline_dumbbell_bench_press' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'EQUIVALENT',10 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='pull_up' WHERE s.key='lat_pulldown' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'CLOSE',50 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='barbell_back_squat' WHERE s.key='leg_press' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'CLOSE',50 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='barbell_front_squat' WHERE s.key='leg_press' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'CLOSE',50 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='hack_squat' WHERE s.key='leg_press' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'EQUIVALENT',10 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='barbell_bench_press' WHERE s.key='machine_chest_press' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'EQUIVALENT',10 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='dumbbell_bench_press' WHERE s.key='machine_chest_press' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'EQUIVALENT',10 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='barbell_overhead_press' WHERE s.key='machine_shoulder_press' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'EQUIVALENT',10 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='dumbbell_shoulder_press' WHERE s.key='machine_shoulder_press' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'CLOSE',55 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='cycling' WHERE s.key='outdoor_cycling' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'CLOSE',55 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='running' WHERE s.key='outdoor_running' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'CLOSE',55 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='walking' WHERE s.key='outdoor_walking' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'EQUIVALENT',10 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='cable_fly' WHERE s.key='pec_deck' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'EQUIVALENT',10 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='lat_pulldown' WHERE s.key='pull_up' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'CLOSE',50 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='ski_erg' WHERE s.key='rowing_cardio' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'CLOSE',55 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='outdoor_running' WHERE s.key='running' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'CLOSE',50 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='barbell_row' WHERE s.key='seated_cable_row' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'CLOSE',50 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='rowing_cardio' WHERE s.key='ski_erg' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'CLOSE',50 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='barbell_romanian_deadlift' WHERE s.key='sumo_deadlift' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'CLOSE',50 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='conventional_deadlift' WHERE s.key='sumo_deadlift' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'CLOSE',55 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='hiking' WHERE s.key='walking' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
INSERT INTO public.canonical_exercise_substitutions(source_exercise_id,alternative_exercise_id,relationship,priority) SELECT s.id,t.id,'CLOSE',55 FROM public.canonical_exercises s JOIN public.canonical_exercises t ON t.key='outdoor_walking' WHERE s.key='walking' ON CONFLICT(source_exercise_id,alternative_exercise_id) DO UPDATE SET relationship=EXCLUDED.relationship,priority=EXCLUDED.priority,status='ACTIVE',updated_at=now();
-- Detect missing explicit links before the RPC becomes available.
DO $relation_check$
DECLARE missing_pairs text;
BEGIN
    WITH expected(source_key,target_key) AS (
      VALUES
      ('air_bike','cycling'),
      ('barbell_back_squat','barbell_front_squat'),
      ('barbell_back_squat','hack_squat'),
      ('barbell_back_squat','leg_press'),
      ('barbell_bench_press','dumbbell_bench_press'),
      ('barbell_bench_press','machine_chest_press'),
      ('barbell_front_squat','barbell_back_squat'),
      ('barbell_front_squat','hack_squat'),
      ('barbell_front_squat','leg_press'),
      ('barbell_overhead_press','dumbbell_shoulder_press'),
      ('barbell_overhead_press','machine_shoulder_press'),
      ('barbell_romanian_deadlift','conventional_deadlift'),
      ('barbell_romanian_deadlift','sumo_deadlift'),
      ('barbell_row','seated_cable_row'),
      ('cable_fly','pec_deck'),
      ('conventional_deadlift','barbell_romanian_deadlift'),
      ('conventional_deadlift','sumo_deadlift'),
      ('cycling','air_bike'),
      ('cycling','outdoor_cycling'),
      ('dumbbell_bench_press','barbell_bench_press'),
      ('dumbbell_bench_press','machine_chest_press'),
      ('dumbbell_shoulder_press','barbell_overhead_press'),
      ('dumbbell_shoulder_press','machine_shoulder_press'),
      ('hack_squat','barbell_back_squat'),
      ('hack_squat','barbell_front_squat'),
      ('hack_squat','leg_press'),
      ('hiking','walking'),
      ('incline_barbell_bench_press','incline_dumbbell_bench_press'),
      ('incline_dumbbell_bench_press','incline_barbell_bench_press'),
      ('lat_pulldown','pull_up'),
      ('leg_press','barbell_back_squat'),
      ('leg_press','barbell_front_squat'),
      ('leg_press','hack_squat'),
      ('machine_chest_press','barbell_bench_press'),
      ('machine_chest_press','dumbbell_bench_press'),
      ('machine_shoulder_press','barbell_overhead_press'),
      ('machine_shoulder_press','dumbbell_shoulder_press'),
      ('outdoor_cycling','cycling'),
      ('outdoor_running','running'),
      ('outdoor_walking','walking'),
      ('pec_deck','cable_fly'),
      ('pull_up','lat_pulldown'),
      ('rowing_cardio','ski_erg'),
      ('running','outdoor_running'),
      ('seated_cable_row','barbell_row'),
      ('ski_erg','rowing_cardio'),
      ('sumo_deadlift','barbell_romanian_deadlift'),
      ('sumo_deadlift','conventional_deadlift'),
      ('walking','hiking'),
      ('walking','outdoor_walking')
    )
    SELECT string_agg(expected.source_key || ' -> ' || expected.target_key, '; ' ORDER BY expected.source_key, expected.target_key)
    INTO missing_pairs
    FROM expected
    LEFT JOIN public.canonical_exercises src ON src.key=expected.source_key
    LEFT JOIN public.canonical_exercises dst ON dst.key=expected.target_key
    LEFT JOIN public.canonical_exercise_substitutions r
      ON r.source_exercise_id=src.id AND r.alternative_exercise_id=dst.id AND r.status='ACTIVE'
    WHERE r.source_exercise_id IS NULL;
    IF missing_pairs IS NOT NULL THEN
        RAISE EXCEPTION 'Substitutions incomplete: %', missing_pairs;
    END IF;
END
$relation_check$;
-- One public read-only response: both clients receive the same canonical identities and relations.
CREATE OR REPLACE FUNCTION public.gym_exercise_reference_snapshot()
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $ref$
  SELECT jsonb_build_object(
    'schemaVersion', 2,
    'exercises', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id',e.id::text, 'key',e.key,
        'familyId',e.family_id::text, 'familyKey',f.key,
        'nameEn',COALESCE((SELECT t.name FROM public.canonical_exercise_translations t WHERE t.exercise_id=e.id AND t.language_code='en' LIMIT 1),e.key),
        'nameLv',COALESCE((SELECT t.name FROM public.canonical_exercise_translations t WHERE t.exercise_id=e.id AND t.language_code='lv' LIMIT 1),''),
        'equipment',e.equipment, 'dumbbellLoad',e.dumbbell_load, 'exerciseType',e.exercise_type,
        'loadSemantics',e.load_semantics, 'friendE1rmEligible',e.comparison_eligible,
        'comparisonMetric',e.comparison_metric,
        'aliasesEn',COALESCE((SELECT jsonb_agg(a.alias ORDER BY a.alias) FROM public.canonical_exercise_aliases a WHERE a.exercise_id=e.id AND a.language_code='en'),'[]'::jsonb),
        'legacyExerciseKey',e.legacy_exercise_key,
        'category',e.category, 'status',e.status, 'supersededBy',e.superseded_by::text
      ) ORDER BY e.key)
      FROM public.canonical_exercises e
      LEFT JOIN public.exercise_families f ON f.id=e.family_id
    ),'[]'::jsonb),
    'relations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'sourceKey',src.key, 'sourceLegacyKey',src.legacy_exercise_key,
        'targetKey',dst.key, 'targetLegacyKey',dst.legacy_exercise_key,
        'relationship',r.relationship, 'priority',r.priority
      ) ORDER BY src.key,dst.key)
      FROM public.canonical_exercise_substitutions r
      JOIN public.canonical_exercises src ON src.id=r.source_exercise_id
      JOIN public.canonical_exercises dst ON dst.id=r.alternative_exercise_id
      WHERE r.status='ACTIVE' AND src.status='ACTIVE' AND dst.status='ACTIVE'
    ),'[]'::jsonb)
  );
$ref$;
REVOKE ALL ON FUNCTION public.gym_exercise_reference_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gym_exercise_reference_snapshot() TO anon, authenticated;
-- Existing catalogues are already read-only for anon/authenticated; keep those grants.
GRANT SELECT ON public.canonical_exercises,public.exercise_families,public.canonical_exercise_translations,public.canonical_exercise_aliases TO anon, authenticated;
COMMIT;
-- Verify with: SELECT jsonb_array_length(gym_exercise_reference_snapshot()->'exercises') AS exercises,
--                     jsonb_array_length(gym_exercise_reference_snapshot()->'relations') AS relationships;
