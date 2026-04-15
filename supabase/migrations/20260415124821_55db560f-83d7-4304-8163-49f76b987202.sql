
-- Create tenant_subscription_history table
CREATE TABLE public.tenant_subscription_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.tenant_subscriptions(id) ON DELETE SET NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  old_plan_name TEXT,
  new_plan_name TEXT,
  old_base_limit INTEGER,
  new_base_limit INTEGER,
  old_extra_free_users INTEGER,
  new_extra_free_users INTEGER,
  old_extra_paid_users INTEGER,
  new_extra_paid_users INTEGER,
  old_effective_user_limit INTEGER,
  new_effective_user_limit INTEGER,
  change_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_subscription_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view subscription history"
ON public.tenant_subscription_history FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'ceo') OR
  public.has_role(auth.uid(), 'master') OR
  public.is_master(auth.uid())
);

CREATE POLICY "Platform admins can insert subscription history"
ON public.tenant_subscription_history FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'ceo') OR
  public.has_role(auth.uid(), 'master') OR
  public.is_master(auth.uid())
);

-- Create function to check if tenant can add users
CREATE OR REPLACE FUNCTION public.check_user_limit(_tenant_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'can_add', CASE
      WHEN ts.billing_status IN ('suspended', 'cancelled') THEN false
      WHEN COALESCE(ts.effective_user_limit, 3) <= (
        SELECT COUNT(*)::integer FROM public.profiles
        WHERE company_id = _tenant_id AND is_active = true AND status = 'ativo'
      ) THEN false
      ELSE true
    END,
    'active_users', (
      SELECT COUNT(*)::integer FROM public.profiles
      WHERE company_id = _tenant_id AND is_active = true AND status = 'ativo'
    ),
    'effective_limit', COALESCE(ts.effective_user_limit, 3),
    'plan_name', COALESCE(ts.plan_name_snapshot, 'Sem plano'),
    'billing_status', COALESCE(ts.billing_status, 'active'),
    'remaining', GREATEST(0, COALESCE(ts.effective_user_limit, 3) - (
      SELECT COUNT(*)::integer FROM public.profiles
      WHERE company_id = _tenant_id AND is_active = true AND status = 'ativo'
    ))
  )
  FROM (SELECT 1) AS dummy
  LEFT JOIN public.tenant_subscriptions ts ON ts.tenant_id = _tenant_id
$$;
