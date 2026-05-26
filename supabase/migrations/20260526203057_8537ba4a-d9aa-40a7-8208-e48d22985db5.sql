
-- Tabela de certificados digitais A1 por tenant + global do master
CREATE TABLE public.tenant_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  is_global boolean NOT NULL DEFAULT false,
  name text NOT NULL,
  storage_path text NOT NULL,
  password_encrypted text NOT NULL,
  password_iv text NOT NULL,
  holder_name text,
  holder_document text,
  issuer text,
  serial_number text,
  valid_from timestamptz,
  valid_until timestamptz,
  environment text NOT NULL DEFAULT 'producao' CHECK (environment IN ('producao','homologacao')),
  is_active boolean NOT NULL DEFAULT true,
  is_icp_brasil boolean NOT NULL DEFAULT false,
  use_master_global boolean NOT NULL DEFAULT false,
  last_test_at timestamptz,
  last_test_status text,
  last_test_message text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_cert_scope CHECK (
    (is_global = true AND tenant_id IS NULL)
    OR (is_global = false AND tenant_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX uniq_active_cert_per_tenant
  ON public.tenant_certificates (tenant_id)
  WHERE is_active = true AND is_global = false;

CREATE UNIQUE INDEX uniq_active_global_cert
  ON public.tenant_certificates ((true))
  WHERE is_active = true AND is_global = true;

CREATE INDEX idx_tenant_certs_tenant ON public.tenant_certificates(tenant_id);
CREATE INDEX idx_tenant_certs_valid_until ON public.tenant_certificates(valid_until);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_certificates TO authenticated;
GRANT ALL ON public.tenant_certificates TO service_role;

ALTER TABLE public.tenant_certificates ENABLE ROW LEVEL SECURITY;

-- Master vê tudo
CREATE POLICY "Master full access certs"
  ON public.tenant_certificates FOR ALL
  TO authenticated
  USING (public.is_master(auth.uid()))
  WITH CHECK (public.is_master(auth.uid()));

-- CEO vê e edita só do próprio tenant (não pode mexer no global)
CREATE POLICY "CEO read own tenant cert"
  ON public.tenant_certificates FOR SELECT
  TO authenticated
  USING (
    is_global = false
    AND tenant_id = public.get_user_company_id(auth.uid())
    AND public.has_role(auth.uid(), 'ceo'::app_role)
  );

CREATE POLICY "CEO insert own tenant cert"
  ON public.tenant_certificates FOR INSERT
  TO authenticated
  WITH CHECK (
    is_global = false
    AND tenant_id = public.get_user_company_id(auth.uid())
    AND public.has_role(auth.uid(), 'ceo'::app_role)
  );

CREATE POLICY "CEO update own tenant cert"
  ON public.tenant_certificates FOR UPDATE
  TO authenticated
  USING (
    is_global = false
    AND tenant_id = public.get_user_company_id(auth.uid())
    AND public.has_role(auth.uid(), 'ceo'::app_role)
  )
  WITH CHECK (
    is_global = false
    AND tenant_id = public.get_user_company_id(auth.uid())
    AND public.has_role(auth.uid(), 'ceo'::app_role)
  );

CREATE POLICY "CEO delete own tenant cert"
  ON public.tenant_certificates FOR DELETE
  TO authenticated
  USING (
    is_global = false
    AND tenant_id = public.get_user_company_id(auth.uid())
    AND public.has_role(auth.uid(), 'ceo'::app_role)
  );

CREATE TRIGGER trg_tenant_certs_updated
  BEFORE UPDATE ON public.tenant_certificates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Bucket privado
INSERT INTO storage.buckets (id, name, public)
VALUES ('digital-certificates', 'digital-certificates', false)
ON CONFLICT (id) DO NOTHING;

-- Nenhuma policy pública: tudo passa pela edge function com service_role.
-- (intencionalmente sem CREATE POLICY em storage.objects para esse bucket)

-- Helper: resolver certificado efetivo de um tenant (próprio ou global)
CREATE OR REPLACE FUNCTION public.get_effective_certificate(_tenant_id uuid)
RETURNS TABLE(id uuid, storage_path text, password_encrypted text, password_iv text, is_global boolean, valid_until timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.storage_path, c.password_encrypted, c.password_iv, c.is_global, c.valid_until
  FROM public.tenant_certificates c
  WHERE c.is_active = true
    AND (
      (c.tenant_id = _tenant_id AND c.is_global = false AND c.use_master_global = false)
      OR (c.is_global = true AND EXISTS (
            SELECT 1 FROM public.tenant_certificates tc
            WHERE tc.tenant_id = _tenant_id AND tc.use_master_global = true AND tc.is_active = true
          ))
    )
  ORDER BY c.is_global ASC  -- prioriza certificado próprio (false=0) sobre global (true=1)
  LIMIT 1;
$$;
