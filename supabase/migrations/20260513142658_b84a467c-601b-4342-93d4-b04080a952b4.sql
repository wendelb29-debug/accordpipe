
-- Fix: WhatsApp sessions tenant isolation
DROP POLICY IF EXISTS "Admin/operador can manage sessions" ON public.whatsapp_sessions;

CREATE POLICY "Tenant admin/operador can manage own sessions"
ON public.whatsapp_sessions
FOR ALL
TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'operador'::app_role))
)
WITH CHECK (
  company_id = public.get_user_company_id(auth.uid())
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'operador'::app_role))
);

-- Fix: Remove public-read policies on private buckets
DROP POLICY IF EXISTS "Anyone can view contract PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read of user-signatures" ON storage.objects;
