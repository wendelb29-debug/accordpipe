
-- Add new interaction columns to performance_feedbacks
ALTER TABLE public.performance_feedbacks
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS assumed_at timestamptz,
  ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS checkin_history jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS comment_history jsonb DEFAULT '[]'::jsonb;
