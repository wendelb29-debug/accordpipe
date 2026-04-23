-- Tabela dedicada para credenciais WhatsApp por tenant + provider
CREATE TABLE IF NOT EXISTS public.tenant_whatsapp_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider_type text NOT NULL CHECK (provider_type IN ('zapi', 'uazapi')),
  server_url text,
  instance_token text,
  instance_name text,
  instance_id text,
  is_active boolean NOT NULL DEFAULT false,
  last_tested_at timestamptz,
  last_test_status text,
  last_test_message text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider_type)
);

CREATE INDEX IF NOT EXISTS idx_twi_tenant ON public.tenant_whatsapp_integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_twi_tenant_provider ON public.tenant_whatsapp_integrations(tenant_id, provider_type);
CREATE INDEX IF NOT EXISTS idx_twi_active ON public.tenant_whatsapp_integrations(tenant_id, is_active) WHERE is_active = true;

-- Garantir apenas 1 integração ativa por tenant
CREATE UNIQUE INDEX IF NOT EXISTS uniq_twi_one_active_per_tenant
  ON public.tenant_whatsapp_integrations(tenant_id)
  WHERE is_active = true;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_twi_updated_at ON public.tenant_whatsapp_integrations;
CREATE TRIGGER trg_twi_updated_at
  BEFORE UPDATE ON public.tenant_whatsapp_integrations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.tenant_whatsapp_integrations ENABLE ROW LEVEL SECURITY;

-- SELECT: usuários do tenant + masters globais
CREATE POLICY "twi_select_same_tenant"
  ON public.tenant_whatsapp_integrations
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_user_company_id(auth.uid())
    OR public.is_master(auth.uid())
  );

-- INSERT: apenas no próprio tenant + permissão configuração
CREATE POLICY "twi_insert_same_tenant"
  ON public.tenant_whatsapp_integrations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_company_id(auth.uid())
    OR public.is_master(auth.uid())
  );

-- UPDATE: apenas no próprio tenant
CREATE POLICY "twi_update_same_tenant"
  ON public.tenant_whatsapp_integrations
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_user_company_id(auth.uid())
    OR public.is_master(auth.uid())
  )
  WITH CHECK (
    tenant_id = public.get_user_company_id(auth.uid())
    OR public.is_master(auth.uid())
  );

-- DELETE: apenas no próprio tenant
CREATE POLICY "twi_delete_same_tenant"
  ON public.tenant_whatsapp_integrations
  FOR DELETE
  TO authenticated
  USING (
    tenant_id = public.get_user_company_id(auth.uid())
    OR public.is_master(auth.uid())
  );