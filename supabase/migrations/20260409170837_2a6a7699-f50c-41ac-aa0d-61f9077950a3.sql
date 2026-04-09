
-- Add dynamic template fields to document_templates
ALTER TABLE public.document_templates
  ADD COLUMN IF NOT EXISTS content_template text,
  ADD COLUMN IF NOT EXISTS placeholders_json jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;

-- Add rendered variables to generated_documents
ALTER TABLE public.generated_documents
  ADD COLUMN IF NOT EXISTS rendered_variables_json jsonb;
