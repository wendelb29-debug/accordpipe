ALTER TABLE public.pdf_contracts ADD COLUMN IF NOT EXISTS document_hash text;
ALTER TABLE public.pdf_contracts ADD COLUMN IF NOT EXISTS validation_code text;