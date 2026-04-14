
-- Create subscriptions table for Asaas recurring billing
CREATE TABLE IF NOT EXISTS public.tenant_asaas_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  local_customer_id uuid,
  asaas_customer_id text NOT NULL,
  asaas_subscription_id text NOT NULL,
  billing_type text NOT NULL DEFAULT 'BOLETO',
  cycle text NOT NULL DEFAULT 'MONTHLY',
  value numeric(14,2) NOT NULL,
  next_due_date date,
  end_date date,
  status text NOT NULL DEFAULT 'ACTIVE',
  description text,
  external_reference text,
  raw_payload jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, asaas_subscription_id)
);

ALTER TABLE public.tenant_asaas_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_asaas_subscriptions_select" ON public.tenant_asaas_subscriptions
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "tenant_asaas_subscriptions_insert" ON public.tenant_asaas_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "tenant_asaas_subscriptions_update" ON public.tenant_asaas_subscriptions
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_company_id(auth.uid()));

-- Add billing_type column to tenant_asaas_payments if missing default
-- (already exists, just ensure we can store PIX and UNDEFINED types)

-- Add index for subscriptions
CREATE INDEX idx_tenant_asaas_subscriptions_tenant ON public.tenant_asaas_subscriptions(tenant_id);
CREATE INDEX idx_tenant_asaas_subscriptions_status ON public.tenant_asaas_subscriptions(status);
