-- Separação por finalidade do certificado A1
ALTER TABLE public.tenant_certificates
  ADD COLUMN IF NOT EXISTS uso_nfe boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS uso_assinatura_contratos boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ambiente_nfe text DEFAULT 'homologacao' CHECK (ambiente_nfe IN ('homologacao','producao')),
  ADD COLUMN IF NOT EXISTS ambiente_assinatura text DEFAULT 'producao' CHECK (ambiente_assinatura IN ('producao'));

-- Logs de uso operacional (NF-e e assinatura)
CREATE TABLE IF NOT EXISTS public.certificate_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid REFERENCES public.tenant_certificates(id) ON DELETE SET NULL,
  tenant_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('nfe','contract_signature','test','validate','upload','delete','toggle_global')),
  target_type text,
  target_id text,
  success boolean NOT NULL DEFAULT true,
  message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cert_logs_tenant ON public.certificate_usage_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cert_logs_cert ON public.certificate_usage_logs(certificate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cert_logs_purpose ON public.certificate_usage_logs(purpose);

GRANT SELECT, INSERT ON public.certificate_usage_logs TO authenticated;
GRANT ALL ON public.certificate_usage_logs TO service_role;

ALTER TABLE public.certificate_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master read all cert logs"
  ON public.certificate_usage_logs FOR SELECT TO authenticated
  USING (public.is_master(auth.uid()));

CREATE POLICY "CEO read own tenant cert logs"
  ON public.certificate_usage_logs FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_user_company_id(auth.uid())
    AND public.has_role(auth.uid(), 'ceo'::app_role)
  );

CREATE POLICY "Authenticated insert cert logs"
  ON public.certificate_usage_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- Substitui get_effective_certificate para aceitar purpose
DROP FUNCTION IF EXISTS public.get_effective_certificate(uuid);

CREATE OR REPLACE FUNCTION public.get_effective_certificate(_tenant_id uuid, _purpose text DEFAULT 'contract_signature')
RETURNS TABLE(
  id uuid,
  storage_path text,
  password_encrypted text,
  password_iv text,
  is_global boolean,
  valid_until timestamptz,
  holder_document text,
  ambiente text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id, c.storage_path, c.password_encrypted, c.password_iv, c.is_global, c.valid_until,
    c.holder_document,
    CASE WHEN _purpose = 'nfe' THEN c.ambiente_nfe ELSE c.ambiente_assinatura END AS ambiente
  FROM public.tenant_certificates c
  WHERE c.is_active = true
    AND c.valid_until > now()
    AND (
      (_purpose = 'nfe' AND c.uso_nfe = true)
      OR (_purpose = 'contract_signature' AND c.uso_assinatura_contratos = true)
    )
    AND (
      (c.tenant_id = _tenant_id AND c.is_global = false AND c.use_master_global = false)
      OR (c.is_global = true AND EXISTS (
            SELECT 1 FROM public.tenant_certificates tc
            WHERE tc.tenant_id = _tenant_id AND tc.use_master_global = true AND tc.is_active = true
          ))
    )
  ORDER BY c.is_global ASC
  LIMIT 1;
$$;

-- Permissões operacionais (default por role)
INSERT INTO public.role_default_permissions (role, permission_key, data_scope)
VALUES
  ('ceo'::app_role, 'can_issue_invoice', 'all'),
  ('ceo'::app_role, 'can_sign_contract', 'all'),
  ('admin'::app_role, 'can_sign_contract', 'all')
ON CONFLICT DO NOTHING;