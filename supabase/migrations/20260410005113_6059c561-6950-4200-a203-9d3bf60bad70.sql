ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS doc_primary_color text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS doc_secondary_color text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS doc_accent_color text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS doc_bg_color text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS doc_text_color text DEFAULT NULL;