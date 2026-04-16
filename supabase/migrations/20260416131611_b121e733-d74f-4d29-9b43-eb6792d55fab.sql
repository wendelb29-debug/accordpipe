
-- Create tenant_invoices table
CREATE TABLE public.tenant_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.tenant_subscriptions(id) ON DELETE SET NULL,
  asaas_payment_id TEXT,
  asaas_customer_id TEXT,
  billing_type TEXT, -- PIX, BOLETO, CREDIT_CARD, etc.
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'PENDING',
  invoice_url TEXT,
  bank_slip_url TEXT,
  pix_payload TEXT,
  pix_qrcode_url TEXT,
  identification_field TEXT, -- linha digitável do boleto
  bar_code TEXT,
  paid_at TIMESTAMPTZ,
  grace_until DATE,
  blocking_date DATE,
  external_reference TEXT,
  payment_method_label TEXT,
  invoice_number TEXT,
  is_current BOOLEAN DEFAULT true,
  raw_asaas_payload JSONB,
  last_status_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_tenant_invoices_tenant ON public.tenant_invoices(tenant_id);
CREATE INDEX idx_tenant_invoices_asaas ON public.tenant_invoices(asaas_payment_id);
CREATE INDEX idx_tenant_invoices_current ON public.tenant_invoices(tenant_id, is_current) WHERE is_current = true;

-- Trigger for updated_at
CREATE TRIGGER update_tenant_invoices_updated_at
  BEFORE UPDATE ON public.tenant_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.tenant_invoices ENABLE ROW LEVEL SECURITY;

-- Master tenant admins can do everything
CREATE POLICY "master_admin_all_tenant_invoices"
  ON public.tenant_invoices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.companies c ON c.id = p.company_id
      WHERE p.user_id = auth.uid()
        AND p.is_master = true
        AND c.servidor_id IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.companies c ON c.id = p.company_id
      WHERE p.user_id = auth.uid()
        AND p.is_master = true
        AND c.servidor_id IS NULL
    )
  );

-- Resellers can view invoices of their child tenants
CREATE POLICY "reseller_view_child_tenant_invoices"
  ON public.tenant_invoices FOR SELECT
  TO authenticated
  USING (
    public.user_is_reseller_of(tenant_id)
  );
