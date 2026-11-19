-- Gym Progress 1.6.7 / 1.7.7
-- Add support for sharing a completed cardio activity as a duration record.
-- Additive, reversible constraint widening only; no existing rows are updated or deleted.
-- Apply after SUPABASE_SOCIAL_SETUP.sql and the exercise-catalogue migration.
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.activity_events') IS NULL THEN
    RAISE EXCEPTION 'public.activity_events is missing: apply the existing social setup first';
  END IF;
END $$;

ALTER TABLE public.activity_events
  DROP CONSTRAINT IF EXISTS activity_events_record_kind_check;
ALTER TABLE public.activity_events
  ADD CONSTRAINT activity_events_record_kind_check
    CHECK (record_kind IS NULL OR record_kind IN ('weight','reps','duration'));

ALTER TABLE public.activity_events
  DROP CONSTRAINT IF EXISTS activity_events_record_unit_check;
ALTER TABLE public.activity_events
  ADD CONSTRAINT activity_events_record_unit_check
    CHECK (record_unit IS NULL OR record_unit IN ('kg','reps','s'));

COMMIT;

-- Optional post-migration verification:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'public.activity_events'::regclass
--   AND conname IN ('activity_events_record_kind_check','activity_events_record_unit_check');
