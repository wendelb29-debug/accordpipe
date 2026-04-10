
-- Tenant financial config for PIX keys
CREATE TABLE public.tenant_financial_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  servidor_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pix_key TEXT,
  pix_key_type TEXT DEFAULT 'cpf',
  pix_beneficiary TEXT,
  pix_document TEXT,
  pix_default_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(servidor_id)
);

ALTER TABLE public.tenant_financial_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant config"
  ON public.tenant_financial_config
  FOR SELECT
  TO authenticated
  USING (servidor_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "CEO/Master can manage tenant config"
  ON public.tenant_financial_config
  FOR ALL
  TO authenticated
  USING (
    servidor_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'master') OR public.is_master(auth.uid()))
  )
  WITH CHECK (
    servidor_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'master') OR public.is_master(auth.uid()))
  );

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.tenant_financial_config
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
