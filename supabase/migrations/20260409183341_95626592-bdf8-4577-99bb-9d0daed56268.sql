ALTER TABLE public.generated_documents
  ADD COLUMN IF NOT EXISTS validation_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS document_hash text;