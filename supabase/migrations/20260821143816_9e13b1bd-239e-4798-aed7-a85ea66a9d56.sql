
ALTER TABLE public.closer_scripts ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.closer_script_branches ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
