
-- 1) billing_plans: restrict is_custom plans to CEO/master only
DROP POLICY IF EXISTS "Authenticated users can view active plans" ON public.billing_plans;
CREATE POLICY "Authenticated users can view public plans"
ON public.billing_plans
FOR SELECT
TO authenticated
USING (
  COALESCE(is_custom, false) = false
  OR is_master(auth.uid())
  OR has_role(auth.uid(), 'ceo'::app_role)
);

-- 2) whatsapp_calls: use profiles.user_id (or get_user_company_id) for company matching
DROP POLICY IF EXISTS "Users see own or admin sees all" ON public.whatsapp_calls;
CREATE POLICY "Users see own or admin sees all"
ON public.whatsapp_calls
FOR SELECT
TO authenticated
USING (
  initiated_by_user_id = auth.uid()
  OR has_role(auth.uid(), 'master'::app_role)
  OR (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role))
    AND company_id = get_user_company_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Users update own or admin updates all" ON public.whatsapp_calls;
CREATE POLICY "Users update own or admin updates all"
ON public.whatsapp_calls
FOR UPDATE
TO authenticated
USING (
  initiated_by_user_id = auth.uid()
  OR has_role(auth.uid(), 'master'::app_role)
  OR (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role))
    AND company_id = get_user_company_id(auth.uid())
  )
);

-- 3) realtime.messages: replace weak substring LIKE with strict prefix/equality
DROP POLICY IF EXISTS "Users can only subscribe to their own channels" ON realtime.messages;
CREATE POLICY "Users can only subscribe to their own channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  topic = ('user:' || (auth.uid())::text)
  OR topic LIKE ('user:' || (auth.uid())::text || ':%')
);

DROP POLICY IF EXISTS "Authenticated can send to own channels" ON realtime.messages;
CREATE POLICY "Authenticated can send to own channels"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  topic = ('user:' || (auth.uid())::text)
  OR topic LIKE ('user:' || (auth.uid())::text || ':%')
);
