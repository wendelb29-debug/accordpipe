
-- ===========================================
-- 1. BILLING PLANS TABLE
-- ===========================================
CREATE TABLE public.billing_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  base_user_limit INTEGER NOT NULL DEFAULT 3,
  extra_free_users_default INTEGER NOT NULL DEFAULT 0,
  price_per_extra_user NUMERIC(10,2) NOT NULL DEFAULT 0,
  monthly_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  yearly_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read active plans
CREATE POLICY "Authenticated users can view active plans"
  ON public.billing_plans FOR SELECT TO authenticated
  USING (true);

-- Only CEO/master can manage plans
CREATE POLICY "CEO/master can insert plans"
  ON public.billing_plans FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('ceo','master'))
    OR public.is_master(auth.uid())
  );

CREATE POLICY "CEO/master can update plans"
  ON public.billing_plans FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('ceo','master'))
    OR public.is_master(auth.uid())
  );

CREATE POLICY "CEO/master can delete plans"
  ON public.billing_plans FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('ceo','master'))
    OR public.is_master(auth.uid())
  );

-- Trigger for updated_at
CREATE TRIGGER update_billing_plans_updated_at
  BEFORE UPDATE ON public.billing_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ===========================================
-- 2. TENANT SUBSCRIPTIONS TABLE
-- ===========================================
CREATE TABLE public.tenant_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.billing_plans(id) ON DELETE SET NULL,
  plan_name_snapshot TEXT NOT NULL DEFAULT 'Starter',
  base_user_limit_snapshot INTEGER NOT NULL DEFAULT 3,
  extra_free_users INTEGER NOT NULL DEFAULT 0,
  extra_paid_users INTEGER NOT NULL DEFAULT 0,
  effective_user_limit INTEGER NOT NULL GENERATED ALWAYS AS (base_user_limit_snapshot + extra_free_users + extra_paid_users) STORED,
  price_per_extra_user_snapshot NUMERIC(10,2) NOT NULL DEFAULT 0,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  billing_status TEXT NOT NULL DEFAULT 'active',
  has_custom_override BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;

-- CEO/master can see all subscriptions
CREATE POLICY "CEO/master can view all subscriptions"
  ON public.tenant_subscriptions FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('ceo','master'))
    OR public.is_master(auth.uid())
    OR tenant_id = public.get_user_company_id(auth.uid())
  );

CREATE POLICY "CEO/master can insert subscriptions"
  ON public.tenant_subscriptions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('ceo','master'))
    OR public.is_master(auth.uid())
  );

CREATE POLICY "CEO/master can update subscriptions"
  ON public.tenant_subscriptions FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('ceo','master'))
    OR public.is_master(auth.uid())
  );

CREATE POLICY "CEO/master can delete subscriptions"
  ON public.tenant_subscriptions FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('ceo','master'))
    OR public.is_master(auth.uid())
  );

CREATE TRIGGER update_tenant_subscriptions_updated_at
  BEFORE UPDATE ON public.tenant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ===========================================
-- 3. HELPER FUNCTION: get tenant user limit
-- ===========================================
CREATE OR REPLACE FUNCTION public.get_tenant_user_limit(_tenant_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT effective_user_limit FROM public.tenant_subscriptions WHERE tenant_id = _tenant_id LIMIT 1),
    3
  );
$$;

-- ===========================================
-- 4. HELPER FUNCTION: count active tenant users
-- ===========================================
CREATE OR REPLACE FUNCTION public.count_active_tenant_users(_tenant_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*)::integer, 0)
  FROM public.profiles
  WHERE company_id = _tenant_id
    AND is_active = true
    AND status = 'ativo';
$$;

-- ===========================================
-- 5. SEED DEFAULT PLANS
-- ===========================================
INSERT INTO public.billing_plans (name, slug, description, base_user_limit, extra_free_users_default, price_per_extra_user, monthly_price, yearly_price, is_custom, sort_order)
VALUES
  ('Starter', 'starter', 'Plano inicial para pequenos times', 3, 2, 29.90, 197.00, 1970.00, false, 1),
  ('Growth', 'growth', 'Plano para times em crescimento', 10, 2, 24.90, 497.00, 4970.00, false, 2),
  ('Scale', 'scale', 'Plano para operações robustas', 25, 2, 19.90, 997.00, 9970.00, false, 3),
  ('Enterprise', 'enterprise', 'Plano personalizado sob medida', 50, 5, 14.90, 0, 0, true, 4);
