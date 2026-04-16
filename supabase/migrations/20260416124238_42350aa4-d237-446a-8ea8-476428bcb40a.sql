
-- Create subscription_extras table
CREATE TABLE public.subscription_extras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.tenant_subscriptions(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  value NUMERIC(12,2) NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'recorrente' CHECK (type IN ('recorrente', 'unico')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_selected BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_subscription_extras_tenant ON public.subscription_extras(tenant_id);
CREATE INDEX idx_subscription_extras_sub ON public.subscription_extras(subscription_id);

-- Timestamps trigger
CREATE TRIGGER update_subscription_extras_updated_at
  BEFORE UPDATE ON public.subscription_extras
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Add total columns to tenant_subscriptions
ALTER TABLE public.tenant_subscriptions
  ADD COLUMN IF NOT EXISTS valor_base_plano NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_extras_recorrentes NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_extras_unicos NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_mensal_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_inicial_total NUMERIC(12,2) NOT NULL DEFAULT 0;

-- RLS
ALTER TABLE public.subscription_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view extras of their tenant"
  ON public.subscription_extras FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_user_company_id(auth.uid())
    OR public.is_master(auth.uid())
    OR public.has_role(auth.uid(), 'ceo')
    OR public.has_role(auth.uid(), 'admin')
    OR public.user_is_reseller_of(tenant_id)
  );

CREATE POLICY "Admins can insert extras"
  ON public.subscription_extras FOR INSERT TO authenticated
  WITH CHECK (
    public.is_master(auth.uid())
    OR public.has_role(auth.uid(), 'ceo')
    OR public.has_role(auth.uid(), 'admin')
    OR public.user_is_reseller_of(tenant_id)
  );

CREATE POLICY "Admins can update extras"
  ON public.subscription_extras FOR UPDATE TO authenticated
  USING (
    public.is_master(auth.uid())
    OR public.has_role(auth.uid(), 'ceo')
    OR public.has_role(auth.uid(), 'admin')
    OR public.user_is_reseller_of(tenant_id)
  );

CREATE POLICY "Admins can delete extras"
  ON public.subscription_extras FOR DELETE TO authenticated
  USING (
    public.is_master(auth.uid())
    OR public.has_role(auth.uid(), 'ceo')
    OR public.has_role(auth.uid(), 'admin')
    OR public.user_is_reseller_of(tenant_id)
  );

-- Function to recalculate subscription totals
CREATE OR REPLACE FUNCTION public.recalc_subscription_totals(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rec_total NUMERIC(12,2);
  _uni_total NUMERIC(12,2);
  _base NUMERIC(12,2);
  _extra_user_cost NUMERIC(12,2);
BEGIN
  SELECT COALESCE(SUM(value), 0) INTO _rec_total
    FROM public.subscription_extras
    WHERE tenant_id = _tenant_id AND is_active = true AND is_selected = true AND type = 'recorrente';

  SELECT COALESCE(SUM(value), 0) INTO _uni_total
    FROM public.subscription_extras
    WHERE tenant_id = _tenant_id AND is_active = true AND is_selected = true AND type = 'unico';

  SELECT
    COALESCE(
      CASE WHEN ts.billing_cycle = 'yearly' THEN bp.yearly_price ELSE bp.monthly_price END,
      CASE WHEN ts.billing_cycle = 'yearly' THEN (ts.yearly_price_snapshot)::numeric ELSE (ts.monthly_price_snapshot)::numeric END,
      0
    ),
    COALESCE(ts.extra_paid_users * ts.price_per_extra_user_snapshot, 0)
  INTO _base, _extra_user_cost
  FROM public.tenant_subscriptions ts
  LEFT JOIN public.billing_plans bp ON bp.id = ts.plan_id
  WHERE ts.tenant_id = _tenant_id
  LIMIT 1;

  UPDATE public.tenant_subscriptions
  SET
    valor_base_plano = COALESCE(_base, 0),
    total_extras_recorrentes = _rec_total,
    total_extras_unicos = _uni_total,
    valor_mensal_total = COALESCE(_base, 0) + _extra_user_cost + _rec_total,
    valor_inicial_total = COALESCE(_base, 0) + _extra_user_cost + _rec_total + _uni_total
  WHERE tenant_id = _tenant_id;
END;
$$;
