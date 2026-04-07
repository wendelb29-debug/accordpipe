-- Create secure table for API credentials
CREATE TABLE public.company_api_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  zapi_instance_id text,
  zapi_token text,
  zapi_client_token text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE public.company_api_credentials ENABLE ROW LEVEL SECURITY;

-- Only admin/CEO/master can read credentials
CREATE POLICY "Admin/CEO/Master can manage API credentials"
ON public.company_api_credentials
FOR ALL
TO authenticated
USING (
  is_master(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ceo'))
    AND company_id = get_user_company_id(auth.uid())
  )
)
WITH CHECK (
  is_master(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ceo'))
    AND company_id = get_user_company_id(auth.uid())
  )
);

-- Migrate existing data
INSERT INTO public.company_api_credentials (company_id, zapi_instance_id, zapi_token, zapi_client_token)
SELECT id, zapi_instance_id, zapi_token, zapi_client_token
FROM public.companies
WHERE zapi_instance_id IS NOT NULL OR zapi_token IS NOT NULL OR zapi_client_token IS NOT NULL;

-- Clear sensitive tokens from companies table
UPDATE public.companies
SET zapi_instance_id = NULL, zapi_token = NULL, zapi_client_token = NULL
WHERE zapi_instance_id IS NOT NULL OR zapi_token IS NOT NULL OR zapi_client_token IS NOT NULL;

-- Add updated_at trigger
CREATE TRIGGER handle_updated_at_company_api_credentials
  BEFORE UPDATE ON public.company_api_credentials
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();