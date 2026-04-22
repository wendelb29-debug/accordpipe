CREATE TABLE public.paddle_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  paddle_subscription_id text NOT NULL UNIQUE,
  paddle_customer_id text NOT NULL,
  product_id text NOT NULL,
  price_id text NOT NULL,
  seat_price_id text,
  seats_quantity integer NOT NULL DEFAULT 0,
  billing_cycle text NOT NULL DEFAULT 'monthly',
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, environment)
);

CREATE INDEX idx_paddle_subscriptions_tenant ON public.paddle_subscriptions(tenant_id);
CREATE INDEX idx_paddle_subscriptions_paddle_id ON public.paddle_subscriptions(paddle_subscription_id);

ALTER TABLE public.paddle_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view own subscription"
  ON public.paddle_subscriptions FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Service role manages subscriptions"
  ON public.paddle_subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.has_active_paddle_subscription(
  tenant_uuid uuid,
  check_env text DEFAULT 'live'
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.paddle_subscriptions
    WHERE tenant_id = tenant_uuid
      AND environment = check_env
      AND status IN ('active', 'trialing')
      AND (current_period_end IS NULL OR current_period_end > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.tg_paddle_subscriptions_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER paddle_subscriptions_updated_at
BEFORE UPDATE ON public.paddle_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.tg_paddle_subscriptions_updated_at();

-- Limpa plano duplicado lixo
UPDATE public.billing_plans SET is_active = false WHERE slug = 'starter-copy-1776464373331';