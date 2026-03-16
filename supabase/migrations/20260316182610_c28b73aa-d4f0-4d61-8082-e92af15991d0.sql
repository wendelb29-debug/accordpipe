
-- Financial transactions table
CREATE TABLE public.financial_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  servidor_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES public.crm_client_registrations(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'cobranca',
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  due_date DATE,
  paid_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pendente',
  payment_method TEXT,
  reference TEXT,
  notes TEXT,
  created_by_user_id UUID,
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add client_status to crm_client_registrations
ALTER TABLE public.crm_client_registrations ADD COLUMN IF NOT EXISTS client_status TEXT NOT NULL DEFAULT 'pendente';
ALTER TABLE public.crm_client_registrations ADD COLUMN IF NOT EXISTS plano_contratado TEXT;
ALTER TABLE public.crm_client_registrations ADD COLUMN IF NOT EXISTS valor_mensal NUMERIC DEFAULT 0;
ALTER TABLE public.crm_client_registrations ADD COLUMN IF NOT EXISTS data_adesao DATE;

-- Enable RLS
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for financial_transactions
CREATE POLICY "Users can view transactions for their servidor"
  ON public.financial_transactions FOR SELECT TO authenticated
  USING (is_master(auth.uid()) OR servidor_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admin/financeiro can manage transactions"
  ON public.financial_transactions FOR ALL TO authenticated
  USING (is_master(auth.uid()) OR ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro') OR has_role(auth.uid(), 'administrativo')) AND servidor_id = get_user_company_id(auth.uid())))
  WITH CHECK (is_master(auth.uid()) OR ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro') OR has_role(auth.uid(), 'administrativo')) AND servidor_id = get_user_company_id(auth.uid())));

-- Updated_at trigger
CREATE TRIGGER handle_updated_at_financial_transactions
  BEFORE UPDATE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
