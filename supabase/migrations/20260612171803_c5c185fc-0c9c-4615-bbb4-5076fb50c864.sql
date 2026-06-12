
-- 1) tenant_fintech_integrations: hide webhook_auth_token from regular users
DROP POLICY IF EXISTS "Users can view own tenant integrations" ON public.tenant_fintech_integrations;
CREATE POLICY "Admins view own tenant integrations"
ON public.tenant_fintech_integrations
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_company_id(auth.uid())
  AND (
    public.is_master(auth.uid())
    OR public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 2) subscription_extras: scope writes to caller's tenant (except master/reseller of that tenant)
DROP POLICY IF EXISTS "Admins can insert extras" ON public.subscription_extras;
DROP POLICY IF EXISTS "Admins can update extras" ON public.subscription_extras;
DROP POLICY IF EXISTS "Admins can delete extras" ON public.subscription_extras;

CREATE POLICY "Admins can insert extras"
ON public.subscription_extras
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_master(auth.uid())
  OR public.user_is_reseller_of(tenant_id)
  OR (
    tenant_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Admins can update extras"
ON public.subscription_extras
FOR UPDATE
TO authenticated
USING (
  public.is_master(auth.uid())
  OR public.user_is_reseller_of(tenant_id)
  OR (
    tenant_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Admins can delete extras"
ON public.subscription_extras
FOR DELETE
TO authenticated
USING (
  public.is_master(auth.uid())
  OR public.user_is_reseller_of(tenant_id)
  OR (
    tenant_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);

-- 3) realtime.messages: remove shared 'notifications' topic from allowed list
DROP POLICY IF EXISTS "Users can only subscribe to their own channels" ON realtime.messages;
CREATE POLICY "Users can only subscribe to their own channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  topic LIKE ('%' || (auth.uid())::text || '%')
);
