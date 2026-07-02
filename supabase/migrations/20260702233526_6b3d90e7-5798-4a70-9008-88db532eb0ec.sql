
ALTER TABLE public.generated_documents ADD COLUMN IF NOT EXISTS pdf_path text;

-- Backfill pdf_path from existing pdf_url by extracting the storage object path
-- Signed URL format: .../storage/v1/object/sign/<bucket>/<path>?token=...
-- Public URL format: .../storage/v1/object/public/<bucket>/<path>
UPDATE public.generated_documents
SET pdf_path = regexp_replace(
  split_part(pdf_url, '?', 1),
  '^.*/storage/v1/object/(?:sign|public)/contract-pdfs/',
  ''
)
WHERE pdf_path IS NULL
  AND pdf_url IS NOT NULL
  AND pdf_url LIKE '%/storage/v1/object/%contract-pdfs/%';
