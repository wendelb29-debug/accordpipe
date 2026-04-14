
-- Table: tenant fintech integrations (one per tenant)
CREATE TABLE public.tenant_fintech_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'asaas',
  environment text NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  api_key_encrypted text,
  api_key_masked text,
  webhook_url text,
  webhook_auth_token text,
  webhook_remote_id text,
  webhook_enabled boolean DEFAULT false,
  connection_status text DEFAULT 'disconnected',
  last_connection_check_at timestamptz,
  last_connection_error text,
  last_webhook_event text,
  last_webhook_received_at timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, provider)
);

ALTER TABLE public.tenant_fintech_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant integrations"
  ON public.tenant_fintech_integrations FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert own tenant integrations"
  ON public.tenant_fintech_integrations FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update own tenant integrations"
  ON public.tenant_fintech_integrations FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete own tenant integrations"
  ON public.tenant_fintech_integrations FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_company_id(auth.uid()));

-- Table: tenant asaas customers
CREATE TABLE public.tenant_asaas_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  local_customer_id uuid NOT NULL,
  asaas_customer_id text NOT NULL,
  name text,
  email text,
  cpf_cnpj text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, local_customer_id),
  UNIQUE(tenant_id, asaas_customer_id)
);

ALTER TABLE public.tenant_asaas_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant asaas customers"
  ON public.tenant_asaas_customers FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert own tenant asaas customers"
  ON public.tenant_asaas_customers FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update own tenant asaas customers"
  ON public.tenant_asaas_customers FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_company_id(auth.uid()));

-- Table: tenant asaas payments
CREATE TABLE public.tenant_asaas_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  local_customer_id uuid,
  asaas_customer_id text,
  local_sale_id uuid,
  local_proposal_id uuid,
  local_contract_id uuid,
  asaas_payment_id text NOT NULL,
  billing_type text NOT NULL DEFAULT 'BOLETO',
  status text DEFAULT 'PENDING',
  value numeric(14,2),
  net_value numeric(14,2),
  original_value numeric(14,2),
  due_date date,
  payment_date date,
  invoice_url text,
  bank_slip_url text,
  identification_field text,
  bar_code text,
  nosso_numero text,
  installment_count int,
  installment_value numeric(14,2),
  installment_id text,
  description text,
  external_reference text,
  raw_payload jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, asaas_payment_id)
);

ALTER TABLE public.tenant_asaas_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant asaas payments"
  ON public.tenant_asaas_payments FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert own tenant asaas payments"
  ON public.tenant_asaas_payments FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update own tenant asaas payments"
  ON public.tenant_asaas_payments FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_company_id(auth.uid()));

-- Table: tenant asaas webhook events
CREATE TABLE public.tenant_asaas_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_id text,
  event_type text NOT NULL,
  asaas_payment_id text,
  payload jsonb NOT NULL,
  processed boolean DEFAULT false,
  processed_at timestamptz,
  processing_error text,
  received_at timestamptz DEFAULT now()
);

ALTER TABLE public.tenant_asaas_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant webhook events"
  ON public.tenant_asaas_webhook_events FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_company_id(auth.uid()));

-- Indexes for performance
CREATE INDEX idx_tenant_fintech_tenant ON public.tenant_fintech_integrations(tenant_id);
CREATE INDEX idx_asaas_customers_tenant ON public.tenant_asaas_customers(tenant_id);
CREATE INDEX idx_asaas_payments_tenant ON public.tenant_asaas_payments(tenant_id);
CREATE INDEX idx_asaas_payments_status ON public.tenant_asaas_payments(tenant_id, status);
CREATE INDEX idx_asaas_payments_due ON public.tenant_asaas_payments(tenant_id, due_date);
CREATE INDEX idx_asaas_webhook_tenant ON public.tenant_asaas_webhook_events(tenant_id);
CREATE INDEX idx_asaas_webhook_type ON public.tenant_asaas_webhook_events(event_type);
CREATE INDEX idx_asaas_webhook_payment ON public.tenant_asaas_webhook_events(asaas_payment_id);
CREATE INDEX idx_asaas_webhook_received ON public.tenant_asaas_webhook_events(received_at);
CREATE INDEX idx_asaas_webhook_idempotency ON public.tenant_asaas_webhook_events(tenant_id, event_id) WHERE event_id IS NOT NULL;

-- Triggers for updated_at
CREATE TRIGGER update_tenant_fintech_integrations_updated_at
  BEFORE UPDATE ON public.tenant_fintech_integrations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_tenant_asaas_customers_updated_at
  BEFORE UPDATE ON public.tenant_asaas_customers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_tenant_asaas_payments_updated_at
  BEFORE UPDATE ON public.tenant_asaas_payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Allow webhook edge function to insert events (no auth context)
CREATE POLICY "Service can insert webhook events"
  ON public.tenant_asaas_webhook_events FOR INSERT TO anon
  WITH CHECK (true);
