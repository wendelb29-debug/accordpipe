
-- Table to store fintech/payment gateway integrations per tenant
CREATE TABLE public.fintech_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  servidor_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'paypal', 'eduzz', 'custom'
  display_name TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'sandbox', -- 'sandbox' or 'production'
  api_key_masked TEXT, -- masked version for display
  api_key_encrypted TEXT, -- actual encrypted key
  webhook_secret_masked TEXT,
  webhook_secret_encrypted TEXT,
  webhook_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  last_event_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(servidor_id, provider)
);

-- Table to store webhook event logs
CREATE TABLE public.fintech_webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  servidor_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'received', -- 'received', 'processed', 'error'
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fintech_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fintech_webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for fintech_integrations
CREATE POLICY "Users can view integrations of their company"
  ON public.fintech_integrations FOR SELECT TO authenticated
  USING (servidor_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage integrations"
  ON public.fintech_integrations FOR ALL TO authenticated
  USING (servidor_id = public.get_user_company_id(auth.uid()) AND public.has_permission(auth.uid(), 'financeiro.gerenciar'));

-- RLS policies for fintech_webhook_logs
CREATE POLICY "Users can view webhook logs of their company"
  ON public.fintech_webhook_logs FOR SELECT TO authenticated
  USING (servidor_id = public.get_user_company_id(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_fintech_integrations_updated_at
  BEFORE UPDATE ON public.fintech_integrations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
