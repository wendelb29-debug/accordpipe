
-- Table for upsells (additional products/services per client)
CREATE TABLE public.client_upsells (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID NOT NULL REFERENCES public.crm_client_registrations(id) ON DELETE CASCADE,
  servidor_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.crm_leads(id),
  name TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'mensal', -- 'mensal' or 'unico'
  status TEXT NOT NULL DEFAULT 'ativo', -- 'ativo', 'pausado', 'cancelado'
  start_date DATE DEFAULT CURRENT_DATE,
  created_by_user_id UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_upsells ENABLE ROW LEVEL SECURITY;

-- RLS: Admin/CEO/Master can manage upsells
CREATE POLICY "Admin can manage upsells" ON public.client_upsells
  FOR ALL TO authenticated
  USING (
    is_master(auth.uid()) OR (
      (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ceo'))
      AND servidor_id = get_user_company_id(auth.uid())
    )
  )
  WITH CHECK (
    is_master(auth.uid()) OR (
      (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ceo'))
      AND servidor_id = get_user_company_id(auth.uid())
    )
  );

-- RLS: Users can view upsells for their servidor
CREATE POLICY "Users can view upsells" ON public.client_upsells
  FOR SELECT TO authenticated
  USING (
    is_master(auth.uid()) OR servidor_id = get_user_company_id(auth.uid())
  );

-- Updated_at trigger
CREATE TRIGGER handle_client_upsells_updated_at
  BEFORE UPDATE ON public.client_upsells
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Also allow anon to insert into client_contract_history (for sign-contract edge function)
CREATE POLICY "Anon can insert history via token" ON public.client_contract_history
  FOR INSERT TO anon
  WITH CHECK (true);
