ALTER TABLE public.tenant_events 
ADD COLUMN IF NOT EXISTS thumbnail_url text,
ADD COLUMN IF NOT EXISTS highlight_on_home boolean NOT NULL DEFAULT false;