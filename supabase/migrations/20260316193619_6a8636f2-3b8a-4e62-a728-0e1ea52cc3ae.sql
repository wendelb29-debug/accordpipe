
-- Client contracts table linked to registrations
CREATE TABLE public.client_contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id uuid NOT NULL REFERENCES public.crm_client_registrations(id) ON DELETE CASCADE,
  servidor_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.crm_leads(id),
  client_name text NOT NULL,
  client_cpf text,
  plan_name text,
  monthly_value numeric DEFAULT 0,
  contract_content text,
  contract_status text NOT NULL DEFAULT 'pendente', -- pendente, assinado, cancelado
  signing_token text,
  signed_at timestamptz,
  signature_photo_url text,
  signature_latitude double precision,
  signature_longitude double precision,
  signature_address text,
  signer_name text,
  signer_document text,
  created_by_user_id uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Sequence for client contract codes
CREATE SEQUENCE IF NOT EXISTS client_contract_code_seq START 1;

-- Trigger for auto code
CREATE OR REPLACE FUNCTION public.generate_client_contract_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.id := COALESCE(NEW.id, gen_random_uuid());
  RETURN NEW;
END;
$$;

-- Enable RLS
ALTER TABLE public.client_contracts ENABLE ROW LEVEL SECURITY;

-- Master/admin/administrativo can manage
CREATE POLICY "Admin can manage client contracts"
ON public.client_contracts FOR ALL TO authenticated
USING (
  is_master(auth.uid()) OR 
  ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'administrativo') OR has_role(auth.uid(), 'ceo')) 
   AND servidor_id = get_user_company_id(auth.uid()))
)
WITH CHECK (
  is_master(auth.uid()) OR 
  ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'administrativo') OR has_role(auth.uid(), 'ceo')) 
   AND servidor_id = get_user_company_id(auth.uid()))
);

-- Operador can view only contracts they created
CREATE POLICY "Operador can view own contracts"
ON public.client_contracts FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'operador') AND created_by_user_id = auth.uid()
);

-- Financeiro can view
CREATE POLICY "Financeiro can view contracts"
ON public.client_contracts FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'financeiro') AND servidor_id = get_user_company_id(auth.uid())
);

-- Anon can view by signing token (for public signing page)
CREATE POLICY "Anon can view by signing token"
ON public.client_contracts FOR SELECT TO anon
USING (signing_token IS NOT NULL);

-- Anon can update signature via token
CREATE POLICY "Anon can sign via token"
ON public.client_contracts FOR UPDATE TO anon
USING (signing_token IS NOT NULL AND contract_status = 'pendente')
WITH CHECK (signing_token IS NOT NULL);

-- Contract history/audit table
CREATE TABLE public.client_contract_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id uuid NOT NULL REFERENCES public.client_contracts(id) ON DELETE CASCADE,
  action text NOT NULL, -- 'gerado', 'enviado', 'assinado', 'cancelado'
  description text,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_contract_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contract history"
ON public.client_contract_history FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_contracts cc
    WHERE cc.id = client_contract_history.contract_id
    AND (is_master(auth.uid()) OR cc.servidor_id = get_user_company_id(auth.uid()))
  )
);

CREATE POLICY "Admin can insert contract history"
ON public.client_contract_history FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_contracts cc
    WHERE cc.id = client_contract_history.contract_id
    AND (is_master(auth.uid()) OR 
        (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'administrativo') OR has_role(auth.uid(), 'operador'))
        AND cc.servidor_id = get_user_company_id(auth.uid()))
  )
);
