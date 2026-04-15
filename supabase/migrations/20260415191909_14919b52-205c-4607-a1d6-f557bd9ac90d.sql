-- Add status and tracking columns to crm_lead_activities
ALTER TABLE public.crm_lead_activities
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'planned',
ADD COLUMN IF NOT EXISTS completed_at timestamptz,
ADD COLUMN IF NOT EXISTS completed_by_user_id uuid,
ADD COLUMN IF NOT EXISTS completed_by_name text,
ADD COLUMN IF NOT EXISTS completion_note text,
ADD COLUMN IF NOT EXISTS no_show_at timestamptz,
ADD COLUMN IF NOT EXISTS no_show_by_user_id uuid,
ADD COLUMN IF NOT EXISTS no_show_by_name text,
ADD COLUMN IF NOT EXISTS no_show_note text;

-- Migrate existing metadata-based statuses to the new column
UPDATE public.crm_lead_activities
SET status = CASE
  WHEN (metadata->>'activity_status') = 'concluida' THEN 'completed'
  WHEN (metadata->>'status') = 'concluida' THEN 'completed'
  WHEN (metadata->>'activity_status') = 'no_show' THEN 'no_show'
  WHEN (metadata->>'status') = 'no_show' THEN 'no_show'
  ELSE 'planned'
END
WHERE status = 'planned';

-- Also migrate completion data from metadata
UPDATE public.crm_lead_activities
SET 
  completed_at = CASE WHEN metadata->>'completed_at' IS NOT NULL THEN (metadata->>'completed_at')::timestamptz ELSE NULL END,
  completion_note = metadata->>'completion_comment'
WHERE status = 'completed' AND completed_at IS NULL;

-- Index for fast filtering by status
CREATE INDEX IF NOT EXISTS idx_crm_lead_activities_status ON public.crm_lead_activities(status);

-- Composite index for global activities page
CREATE INDEX IF NOT EXISTS idx_crm_lead_activities_servidor_status ON public.crm_lead_activities(servidor_id, status);