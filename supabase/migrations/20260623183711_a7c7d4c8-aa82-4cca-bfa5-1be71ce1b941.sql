
-- 1) companies: hide secret columns from authenticated/anon
REVOKE SELECT (zapi_token, zapi_client_token, webhook_token)
  ON public.companies FROM authenticated;
REVOKE SELECT (zapi_token, zapi_client_token, webhook_token)
  ON public.companies FROM anon;

-- 2) document_signers: hide auth_token and validation_code from authenticated/anon
REVOKE SELECT (auth_token, validation_code)
  ON public.document_signers FROM authenticated;
REVOKE SELECT (auth_token, validation_code)
  ON public.document_signers FROM anon;

-- 3) ad_integrations: split the broad ALL policy so operador can manage but not SELECT credentials
DROP POLICY IF EXISTS "Admin/operador can manage ad_integrations" ON public.ad_integrations;

CREATE POLICY "Admin/operador can insert ad_integrations"
  ON public.ad_integrations FOR INSERT
  WITH CHECK (
    public.is_master(auth.uid())
    OR (
      (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'operador'::app_role))
      AND servidor_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Admin/operador can update ad_integrations"
  ON public.ad_integrations FOR UPDATE
  USING (
    public.is_master(auth.uid())
    OR (
      (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'operador'::app_role))
      AND servidor_id = public.get_user_company_id(auth.uid())
    )
  )
  WITH CHECK (
    public.is_master(auth.uid())
    OR (
      (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'operador'::app_role))
      AND servidor_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Admin/operador can delete ad_integrations"
  ON public.ad_integrations FOR DELETE
  USING (
    public.is_master(auth.uid())
    OR (
      (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'operador'::app_role))
      AND servidor_id = public.get_user_company_id(auth.uid())
    )
  );
