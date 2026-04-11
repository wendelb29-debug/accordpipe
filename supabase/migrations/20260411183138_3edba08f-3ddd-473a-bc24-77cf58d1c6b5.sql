ALTER TABLE public.generated_documents
ADD COLUMN generated_with_missing_fields boolean NOT NULL DEFAULT false;