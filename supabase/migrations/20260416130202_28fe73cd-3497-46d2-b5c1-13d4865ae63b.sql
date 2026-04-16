
-- 1. master_tenant_clients: cada tenant como cliente B2B do master
CREATE TABLE public.master_tenant_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  master_client_id TEXT GENERATED ALWAYS AS ('MTC-' || SUBSTRING(id::text, 1, 8)) STORED,
  tenant_type TEXT NOT NULL DEFAULT 'standard' CHECK (tenant_type IN ('standard', 'reseller')),
  razao_social TEXT,
  nome_fantasia TEXT,
  cnpj TEXT,
  email TEXT,
  telefone TEXT,
  responsavel TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  activation_date TIMESTAMPTZ DEFAULT now(),
  plan_name TEXT,
  plan_id UUID REFERENCES public.billing_plans(id),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
  contracted_value NUMERIC(12,2) DEFAULT 0,
  contracted_users INTEGER DEFAULT 3,
  active_users_count INTEGER DEFAULT 0,
  max_users INTEGER DEFAULT 3,
  next_due_date DATE,
  grace_days INTEGER DEFAULT 7,
  grace_until DATE,
  blocked_at TIMESTAMPTZ,
  subscription_status TEXT NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'trial', 'past_due', 'suspended', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mtc_tenant_id ON public.master_tenant_clients(tenant_id);
CREATE INDEX idx_mtc_status ON public.master_tenant_clients(subscription_status);
CREATE INDEX idx_mtc_next_due ON public.master_tenant_clients(next_due_date);
CREATE INDEX idx_mtc_tenant_type ON public.master_tenant_clients(tenant_type);

-- 2. master_billing_history: histórico financeiro por tenant
CREATE TABLE public.master_billing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  master_client_id UUID REFERENCES public.master_tenant_clients(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled', 'refunded')),
  payment_method TEXT,
  asaas_payment_id TEXT,
  invoice_url TEXT,
  bank_slip_url TEXT,
  pix_payload TEXT,
  pix_qrcode_url TEXT,
  grace_until DATE,
  blocking_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mbh_tenant_id ON public.master_billing_history(tenant_id);
CREATE INDEX idx_mbh_status ON public.master_billing_history(status);
CREATE INDEX idx_mbh_due_date ON public.master_billing_history(due_date);

-- 3. Add missing fields to tenant_subscriptions
ALTER TABLE public.tenant_subscriptions
  ADD COLUMN IF NOT EXISTS next_due_date DATE,
  ADD COLUMN IF NOT EXISTS grace_days INTEGER DEFAULT 7,
  ADD COLUMN IF NOT EXISTS grace_until DATE,
  ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 4. Enable RLS
ALTER TABLE public.master_tenant_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_billing_history ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for master_tenant_clients
-- Master tenant users (CEO/master/admin of the platform_master) can see all
CREATE POLICY "Master users can view all tenant clients"
  ON public.master_tenant_clients FOR SELECT
  USING (
    public.has_role(auth.uid(), 'ceo') OR
    public.has_role(auth.uid(), 'master') OR
    public.is_master(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.companies c ON c.id = p.company_id
      WHERE p.user_id = auth.uid() AND c.tenant_type = 'platform_master'
    )
  );

CREATE POLICY "Master users can manage tenant clients"
  ON public.master_tenant_clients FOR ALL
  USING (
    public.has_role(auth.uid(), 'ceo') OR
    public.has_role(auth.uid(), 'master') OR
    public.is_master(auth.uid())
  );

-- Resellers can see their child tenants
CREATE POLICY "Resellers can view their child tenant clients"
  ON public.master_tenant_clients FOR SELECT
  USING (
    public.user_is_reseller_of(tenant_id)
  );

-- 6. RLS policies for master_billing_history
CREATE POLICY "Master users can view all billing history"
  ON public.master_billing_history FOR SELECT
  USING (
    public.has_role(auth.uid(), 'ceo') OR
    public.has_role(auth.uid(), 'master') OR
    public.is_master(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.companies c ON c.id = p.company_id
      WHERE p.user_id = auth.uid() AND c.tenant_type = 'platform_master'
    )
  );

CREATE POLICY "Master users can manage billing history"
  ON public.master_billing_history FOR ALL
  USING (
    public.has_role(auth.uid(), 'ceo') OR
    public.has_role(auth.uid(), 'master') OR
    public.is_master(auth.uid())
  );

-- Tenant users can view their own billing
CREATE POLICY "Tenant users can view own billing"
  ON public.master_billing_history FOR SELECT
  USING (
    tenant_id = public.get_user_company_id(auth.uid())
  );

-- 7. Trigger: auto-create master_tenant_clients on new tenant
CREATE OR REPLACE FUNCTION public.auto_create_master_tenant_client()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create if this is not the platform_master itself
  IF NEW.tenant_type != 'platform_master' AND NEW.servidor_id IS NOT NULL THEN
    INSERT INTO public.master_tenant_clients (
      tenant_id, tenant_type, razao_social, nome_fantasia, cnpj,
      email, telefone, responsavel, status,
      billing_cycle, contracted_users, max_users,
      subscription_status
    ) VALUES (
      NEW.id,
      CASE WHEN NEW.is_reseller THEN 'reseller' ELSE 'standard' END,
      NEW.razao_social, NEW.nome_fantasia, NEW.cnpj,
      NEW.email, NEW.telefone, NEW.responsavel,
      CASE WHEN NEW.is_trial THEN 'trial' ELSE 'active' END,
      'monthly', 3, 3,
      CASE WHEN NEW.is_trial THEN 'trial' ELSE 'active' END
    )
    ON CONFLICT (tenant_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_master_tenant_client
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_master_tenant_client();

-- 8. Function to sync active user count
CREATE OR REPLACE FUNCTION public.sync_master_client_user_count(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.master_tenant_clients
  SET active_users_count = (
    SELECT COUNT(*)::integer FROM public.profiles
    WHERE company_id = _tenant_id AND is_active = true AND status = 'ativo'
  ),
  updated_at = now()
  WHERE tenant_id = _tenant_id;
END;
$$;

-- 9. Updated_at triggers
CREATE TRIGGER update_master_tenant_clients_updated_at
  BEFORE UPDATE ON public.master_tenant_clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_master_billing_history_updated_at
  BEFORE UPDATE ON public.master_billing_history
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
