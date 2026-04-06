ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS brand_logo_url text,
  ADD COLUMN IF NOT EXISTS brand_logo_path text,
  ADD COLUMN IF NOT EXISTS brand_primary_color text DEFAULT '#1E2952',
  ADD COLUMN IF NOT EXISTS brand_secondary_color text DEFAULT '#4F46E5',
  ADD COLUMN IF NOT EXISTS brand_accent_color text DEFAULT '#10B981',
  ADD COLUMN IF NOT EXISTS brand_bg_color text DEFAULT '#F3F4F6',
  ADD COLUMN IF NOT EXISTS brand_text_color text DEFAULT '#1F2937';