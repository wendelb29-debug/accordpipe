
-- Client registration data (titular)
CREATE TABLE public.crm_client_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  servidor_id uuid NOT NULL REFERENCES public.companies(id),
  -- Titular fields
  nome_completo text,
  cpf text,
  data_nascimento date,
  email text,
  nome_pai text,
  nome_mae text,
  cep text,
  endereco text,
  numero text,
  bairro text,
  cidade text,
  estado text,
  rg text,
  comprovante_url text,
  -- Status
  status text NOT NULL DEFAULT 'pendente',
  created_by_user_id uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lead_id)
);

-- Dependents
CREATE TABLE public.crm_client_dependents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.crm_client_registrations(id) ON DELETE CASCADE,
  nome_completo text NOT NULL,
  data_nascimento date,
  grau_parentesco text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_client_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_client_dependents ENABLE ROW LEVEL SECURITY;

-- RLS for registrations
CREATE POLICY "Users can view registrations for their servidor" ON public.crm_client_registrations
  FOR SELECT TO authenticated
  USING (is_master(auth.uid()) OR servidor_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admin/administrativo can manage registrations" ON public.crm_client_registrations
  FOR ALL TO authenticated
  USING (is_master(auth.uid()) OR ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'administrativo')) AND servidor_id = get_user_company_id(auth.uid())))
  WITH CHECK (is_master(auth.uid()) OR ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'administrativo')) AND servidor_id = get_user_company_id(auth.uid())));

-- RLS for dependents (through registration)
CREATE POLICY "Users can view dependents" ON public.crm_client_dependents
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.crm_client_registrations r 
    WHERE r.id = registration_id 
    AND (is_master(auth.uid()) OR r.servidor_id = get_user_company_id(auth.uid()))
  ));

CREATE POLICY "Admin/administrativo can manage dependents" ON public.crm_client_dependents
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.crm_client_registrations r 
    WHERE r.id = registration_id 
    AND (is_master(auth.uid()) OR ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'administrativo')) AND r.servidor_id = get_user_company_id(auth.uid())))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.crm_client_registrations r 
    WHERE r.id = registration_id 
    AND (is_master(auth.uid()) OR ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'administrativo')) AND r.servidor_id = get_user_company_id(auth.uid())))
  ));

-- Updated_at trigger
CREATE TRIGGER set_updated_at_crm_client_registrations
  BEFORE UPDATE ON public.crm_client_registrations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
