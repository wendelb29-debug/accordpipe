
-- Wave A: Service settings + classifications + holidays
-- Reuses tenant_departments (departments), whatsapp_labels (tags), user_departments (agent<->dept)

-- 1) service_settings (singleton per tenant)
CREATE TABLE IF NOT EXISTS public.service_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  -- distribution
  delivery_mode text NOT NULL DEFAULT 'accept_or_reject', -- 'auto_accept' | 'accept_or_reject'
  distribution_type text NOT NULL DEFAULT 'round_robin',  -- 'round_robin' | 'equal' | 'availability'
  tickets_per_cycle integer NOT NULL DEFAULT 5,
  max_receptive_per_agent integer NOT NULL DEFAULT 20,
  max_active_per_agent integer NOT NULL DEFAULT 20,
  -- chat features (toggles)
  show_agent_name boolean NOT NULL DEFAULT true,
  allow_audio boolean NOT NULL DEFAULT true,
  allow_emoji boolean NOT NULL DEFAULT true,
  allow_stickers boolean NOT NULL DEFAULT true,
  allow_files boolean NOT NULL DEFAULT true,
  allow_export_pdf boolean NOT NULL DEFAULT true,
  -- transfers
  keep_history_on_transfer boolean NOT NULL DEFAULT true,
  require_transfer_note boolean NOT NULL DEFAULT false,
  move_to_wait_on_transfer boolean NOT NULL DEFAULT false,
  block_transfer_to_offline boolean NOT NULL DEFAULT true,
  -- auto messages
  msg_greeting text,
  msg_transfer text,
  msg_wait text,
  msg_closing text,
  -- weekly business hours: [{day:0-6, enabled, start, end, message}]
  business_hours jsonb NOT NULL DEFAULT '[]'::jsonb,
  off_hours_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_settings TO authenticated;
GRANT ALL ON public.service_settings TO service_role;
ALTER TABLE public.service_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant members read service_settings" ON public.service_settings
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_company_id(auth.uid()) OR public.is_master(auth.uid()));

CREATE POLICY "admins write service_settings" ON public.service_settings
  FOR ALL TO authenticated
  USING (
    tenant_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role) OR public.is_master(auth.uid()))
  )
  WITH CHECK (
    tenant_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role) OR public.is_master(auth.uid()))
  );

CREATE TRIGGER trg_service_settings_updated_at
  BEFORE UPDATE ON public.service_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2) service_classifications (per tenant, linked to departments)
CREATE TABLE IF NOT EXISTS public.service_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  department_ids uuid[] NOT NULL DEFAULT '{}',
  distribution_rule jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_classifications TO authenticated;
GRANT ALL ON public.service_classifications TO service_role;
ALTER TABLE public.service_classifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant members read classifications" ON public.service_classifications
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_company_id(auth.uid()) OR public.is_master(auth.uid()));

CREATE POLICY "admins write classifications" ON public.service_classifications
  FOR ALL TO authenticated
  USING (
    tenant_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role) OR public.is_master(auth.uid()))
  )
  WITH CHECK (
    tenant_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role) OR public.is_master(auth.uid()))
  );

CREATE TRIGGER trg_service_classifications_updated_at
  BEFORE UPDATE ON public.service_classifications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3) Extend whatsapp_labels (tags) with department scoping + distribution rule
ALTER TABLE public.whatsapp_labels
  ADD COLUMN IF NOT EXISTS department_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS distribution_rule jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 4) service_holidays
CREATE TABLE IF NOT EXISTS public.service_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  date date NOT NULL,
  department_id uuid REFERENCES public.tenant_departments(id) ON DELETE SET NULL,
  coverage text NOT NULL DEFAULT 'all_day', -- 'all_day' | 'partial'
  recurring boolean NOT NULL DEFAULT false,
  auto_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_holidays TO authenticated;
GRANT ALL ON public.service_holidays TO service_role;
ALTER TABLE public.service_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant members read holidays" ON public.service_holidays
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_company_id(auth.uid()) OR public.is_master(auth.uid()));

CREATE POLICY "admins write holidays" ON public.service_holidays
  FOR ALL TO authenticated
  USING (
    tenant_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role) OR public.is_master(auth.uid()))
  )
  WITH CHECK (
    tenant_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role) OR public.is_master(auth.uid()))
  );

CREATE TRIGGER trg_service_holidays_updated_at
  BEFORE UPDATE ON public.service_holidays
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_service_classifications_tenant ON public.service_classifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_holidays_tenant ON public.service_holidays(tenant_id, date);
