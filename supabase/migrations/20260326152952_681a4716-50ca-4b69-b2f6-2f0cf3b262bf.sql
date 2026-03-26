
-- Add Z-API configuration columns to companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS zapi_instance_id text,
  ADD COLUMN IF NOT EXISTS zapi_token text,
  ADD COLUMN IF NOT EXISTS zapi_client_token text,
  ADD COLUMN IF NOT EXISTS zapi_phone text;

-- Add company_id to whatsapp_messages for proper tenant isolation
-- (already exists)

-- Add assigned_to to whatsapp_contacts if not present (already exists)

-- Update RLS on whatsapp_contacts for proper tenant + user isolation
DROP POLICY IF EXISTS "Admin/operador can view contacts" ON public.whatsapp_contacts;
DROP POLICY IF EXISTS "Admin/operador can insert contacts" ON public.whatsapp_contacts;
DROP POLICY IF EXISTS "Admin/operador can update contacts" ON public.whatsapp_contacts;
DROP POLICY IF EXISTS "Admin/operador can delete contacts" ON public.whatsapp_contacts;

CREATE POLICY "Master can view all contacts" ON public.whatsapp_contacts
  FOR SELECT TO authenticated
  USING (is_master(auth.uid()));

CREATE POLICY "Admin can view tenant contacts" ON public.whatsapp_contacts
  FOR SELECT TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ceo'))
    AND company_id = get_user_company_id(auth.uid())
  );

CREATE POLICY "Operador can view own contacts" ON public.whatsapp_contacts
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'operador')
    AND company_id = get_user_company_id(auth.uid())
    AND (assigned_to = auth.uid() OR assigned_to IS NULL)
  );

CREATE POLICY "Admin/operador can insert tenant contacts" ON public.whatsapp_contacts
  FOR INSERT TO authenticated
  WITH CHECK (
    is_master(auth.uid())
    OR (
      (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador') OR has_role(auth.uid(), 'ceo'))
      AND company_id = get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Admin/operador can update tenant contacts" ON public.whatsapp_contacts
  FOR UPDATE TO authenticated
  USING (
    is_master(auth.uid())
    OR (
      (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ceo'))
      AND company_id = get_user_company_id(auth.uid())
    )
    OR (
      has_role(auth.uid(), 'operador')
      AND company_id = get_user_company_id(auth.uid())
      AND assigned_to = auth.uid()
    )
  );

CREATE POLICY "Admin can delete tenant contacts" ON public.whatsapp_contacts
  FOR DELETE TO authenticated
  USING (
    is_master(auth.uid())
    OR (
      (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ceo'))
      AND company_id = get_user_company_id(auth.uid())
    )
  );

-- Service role insert for webhooks
CREATE POLICY "Anon can insert contacts via webhook" ON public.whatsapp_contacts
  FOR INSERT TO anon
  WITH CHECK (true);

-- Update RLS on whatsapp_messages for proper tenant + user isolation
DROP POLICY IF EXISTS "Admin/operador can view messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Admin/operador can insert messages" ON public.whatsapp_messages;

CREATE POLICY "Master can view all messages" ON public.whatsapp_messages
  FOR SELECT TO authenticated
  USING (is_master(auth.uid()));

CREATE POLICY "Admin can view tenant messages" ON public.whatsapp_messages
  FOR SELECT TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ceo'))
    AND company_id = get_user_company_id(auth.uid())
  );

CREATE POLICY "Operador can view own messages" ON public.whatsapp_messages
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'operador')
    AND company_id = get_user_company_id(auth.uid())
    AND contact_id IN (
      SELECT id FROM public.whatsapp_contacts
      WHERE assigned_to = auth.uid() OR assigned_to IS NULL
    )
  );

CREATE POLICY "Admin/operador can insert tenant messages" ON public.whatsapp_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    is_master(auth.uid())
    OR (
      (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador') OR has_role(auth.uid(), 'ceo'))
      AND company_id = get_user_company_id(auth.uid())
    )
  );

-- Service role insert for webhooks
CREATE POLICY "Anon can insert messages via webhook" ON public.whatsapp_messages
  FOR INSERT TO anon
  WITH CHECK (true);

-- Enable realtime for messages and contacts
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_contacts;
