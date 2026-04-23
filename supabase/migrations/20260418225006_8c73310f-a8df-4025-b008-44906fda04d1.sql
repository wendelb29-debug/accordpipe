-- ============================================================
-- Operator status (Disponível/Indisponível por usuário+tenant)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.operator_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'unavailable' CHECK (status IN ('available', 'unavailable', 'busy', 'away')),
  reason TEXT,
  last_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_operator_status_tenant ON public.operator_status(tenant_id);
CREATE INDEX IF NOT EXISTS idx_operator_status_user ON public.operator_status(user_id);

ALTER TABLE public.operator_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own operator status"
ON public.operator_status FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Tenant admins can view operator status of their tenant"
ON public.operator_status FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_company_id(auth.uid())
  AND (
    public.is_master(auth.uid())
    OR public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE TRIGGER trg_operator_status_updated_at
BEFORE UPDATE ON public.operator_status
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- Push subscriptions (dispositivos por usuário+tenant)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user_tenant ON public.push_subscriptions(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_active ON public.push_subscriptions(tenant_id) WHERE is_active = true;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own push subscriptions"
ON public.push_subscriptions FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_push_subs_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();