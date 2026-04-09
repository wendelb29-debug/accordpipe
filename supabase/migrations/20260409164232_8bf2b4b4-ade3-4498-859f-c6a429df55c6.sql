
-- Add signature columns to generated_documents
ALTER TABLE public.generated_documents
  ADD COLUMN IF NOT EXISTS signed_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS sent_for_signature_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Document Signers
CREATE TABLE public.document_signers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.generated_documents(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  cpf TEXT,
  data_nascimento TEXT,
  papel TEXT NOT NULL DEFAULT 'cliente',
  obrigatorio BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  auth_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  validation_code TEXT,
  validation_code_expires_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  validated_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  reject_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  location_text TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  selfie_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.document_signers ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage signers for their tenant's documents
CREATE POLICY "Users can manage document_signers via document"
  ON public.document_signers FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.generated_documents gd
      WHERE gd.id = document_id
      AND gd.servidor_id = public.get_user_company_id(auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.generated_documents gd
      WHERE gd.id = document_id
      AND gd.servidor_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE TRIGGER update_document_signers_updated_at
  BEFORE UPDATE ON public.document_signers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Document Events (audit trail)
CREATE TABLE public.document_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.generated_documents(id) ON DELETE CASCADE,
  signer_id UUID REFERENCES public.document_signers(id) ON DELETE SET NULL,
  evento TEXT NOT NULL,
  descricao TEXT,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.document_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage document_events via document"
  ON public.document_events FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.generated_documents gd
      WHERE gd.id = document_id
      AND gd.servidor_id = public.get_user_company_id(auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.generated_documents gd
      WHERE gd.id = document_id
      AND gd.servidor_id = public.get_user_company_id(auth.uid())
    )
  );

-- RPC function for public access by signer token (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_document_signer_by_token(p_token text)
RETURNS TABLE(
  id uuid, document_id uuid, nome_completo text, email text, telefone text,
  cpf text, data_nascimento text, papel text, obrigatorio boolean, ordem integer,
  status text, signed_at timestamptz, rejected_at timestamptz, selfie_url text,
  location_text text, auth_token text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, document_id, nome_completo, email, telefone,
         cpf, data_nascimento, papel, obrigatorio, ordem,
         status, signed_at, rejected_at, selfie_url,
         location_text, auth_token
  FROM public.document_signers
  WHERE auth_token = p_token
  LIMIT 1;
$$;

-- RPC to get all signers for a document by token
CREATE OR REPLACE FUNCTION public.get_document_signers_by_token(p_token text)
RETURNS TABLE(
  id uuid, nome_completo text, papel text, ordem integer, status text,
  signed_at timestamptz, rejected_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.nome_completo, s.papel, s.ordem, s.status,
         s.signed_at, s.rejected_at
  FROM public.document_signers s
  WHERE s.document_id = (
    SELECT document_id FROM public.document_signers WHERE auth_token = p_token LIMIT 1
  )
  ORDER BY s.ordem;
$$;

-- RPC to get document info by signer token
CREATE OR REPLACE FUNCTION public.get_document_by_signer_token(p_token text)
RETURNS TABLE(
  id uuid, nome text, tipo text, status text, pdf_url text, created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gd.id, gd.nome, gd.tipo, gd.status, gd.pdf_url, gd.created_at
  FROM public.generated_documents gd
  WHERE gd.id = (
    SELECT document_id FROM public.document_signers WHERE auth_token = p_token LIMIT 1
  )
  LIMIT 1;
$$;
