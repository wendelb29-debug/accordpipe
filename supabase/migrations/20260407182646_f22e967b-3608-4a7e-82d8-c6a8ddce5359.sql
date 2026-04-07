ALTER TABLE public.pdf_contracts
ADD COLUMN IF NOT EXISTS pdf_assinado_url text,
ADD COLUMN IF NOT EXISTS pdf_assinado_path text;