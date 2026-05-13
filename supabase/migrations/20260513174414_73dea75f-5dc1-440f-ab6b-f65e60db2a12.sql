
-- 1) PDF contracts: drop the broken anon/auth token-gate policies.
-- Public signing flow uses get_pdf_signer_by_token / get_public_signed_url RPCs.
DROP POLICY IF EXISTS "Anon can view pdf contract for signing" ON public.pdf_contracts;
DROP POLICY IF EXISTS "Auth can view pdf contract for signing" ON public.pdf_contracts;
DROP POLICY IF EXISTS "Anon can view fields for signing" ON public.pdf_contract_fields;

-- 2) Storage: remove broad user-signatures policies, keep owner-scoped equivalents.
DROP POLICY IF EXISTS "Allow users to delete own user-signatures" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update own user-signatures" ON storage.objects;

-- 3) tenant_invoices: allow tenant admins/CEOs/finance to view their own invoices.
DROP POLICY IF EXISTS "Tenant admins can view own invoices" ON public.tenant_invoices;
CREATE POLICY "Tenant admins can view own invoices" ON public.tenant_invoices
FOR SELECT TO authenticated
USING (
  tenant_id = public.get_user_company_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'financeiro'::app_role)
    OR public.is_master(auth.uid())
  )
);

-- 4) Restrict sensitive credential columns on companies.
REVOKE SELECT (zapi_token, zapi_client_token, webhook_token) ON public.companies FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_company_credentials(_company_id uuid)
RETURNS TABLE(zapi_token text, zapi_client_token text, zapi_instance_id text, webhook_token text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.zapi_token, c.zapi_client_token, c.zapi_instance_id, c.webhook_token
  FROM public.companies c
  WHERE c.id = _company_id
    AND (
      public.is_master(auth.uid())
      OR (
        c.id = public.get_user_company_id(auth.uid())
        AND (public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
      )
    )
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.get_company_credentials(uuid) FROM anon;

-- 5) Restrict sensitive credential columns on tenant_whatsapp_integrations.
REVOKE SELECT (instance_token) ON public.tenant_whatsapp_integrations FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_whatsapp_instance_token(_integration_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT i.instance_token
  FROM public.tenant_whatsapp_integrations i
  WHERE i.id = _integration_id
    AND (
      public.is_master(auth.uid())
      OR (
        i.tenant_id = public.get_user_company_id(auth.uid())
        AND (public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
      )
    )
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.get_whatsapp_instance_token(uuid) FROM anon;
