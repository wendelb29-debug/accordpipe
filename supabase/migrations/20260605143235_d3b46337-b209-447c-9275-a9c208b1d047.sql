
-- 1. contracts: add tenant scope on INSERT/UPDATE
DROP POLICY IF EXISTS "Admin/operador can insert contracts" ON public.contracts;
CREATE POLICY "Admin/operador can insert contracts" ON public.contracts
  FOR INSERT TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
    AND company_id = get_user_company_id(auth.uid())
  );

DROP POLICY IF EXISTS "Admin/operador can update contracts" ON public.contracts;
CREATE POLICY "Admin/operador can update contracts" ON public.contracts
  FOR UPDATE TO authenticated
  USING (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
    AND company_id = get_user_company_id(auth.uid())
  )
  WITH CHECK (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
    AND company_id = get_user_company_id(auth.uid())
  );

-- 2. contract_signatures: verify parent contract belongs to tenant
DROP POLICY IF EXISTS "Admin/operador can insert contract signatures" ON public.contract_signatures;
CREATE POLICY "Admin/operador can insert contract signatures" ON public.contract_signatures
  FOR INSERT TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_signatures.contract_id
        AND c.company_id = get_user_company_id(auth.uid())
    )
  );

-- 3. contract-pdfs storage: remove broad INSERT policy (keep user-scoped one)
DROP POLICY IF EXISTS "Authenticated users can upload contract PDFs" ON storage.objects;

-- 4. whatsapp-media storage: restrict uploads to tenant folder
DROP POLICY IF EXISTS "WhatsApp media authenticated upload" ON storage.objects;
CREATE POLICY "WhatsApp media tenant-scoped upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'whatsapp-media'
    AND (storage.foldername(name))[1] = get_user_company_id(auth.uid())::text
  );

-- 5. digital-certificates bucket: explicit tenant-scoped read policy (writes via service role only)
CREATE POLICY "Tenant masters can read own digital certificates" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'digital-certificates'
    AND (
      is_master(auth.uid())
      OR (storage.foldername(name))[1] = get_user_company_id(auth.uid())::text
    )
  );

-- 6. realtime.messages: remove broad ALL=true policy; keep narrow SELECT.
-- Add scoped INSERT for broadcast/presence sends (same scoping as SELECT).
DROP POLICY IF EXISTS "Authenticated users can use realtime" ON realtime.messages;

CREATE POLICY "Authenticated can send to own channels" ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    topic LIKE '%' || auth.uid()::text || '%'
    OR topic = ANY (ARRAY['notifications'::text, 'public_feed'::text])
  );

-- 7. Fix function search_path
CREATE OR REPLACE FUNCTION public.handle_new_email_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT user_id INTO v_user_id FROM public.email_accounts WHERE id = NEW.account_id;
    IF (NEW.received_at > now() - interval '30 minutes') THEN
        INSERT INTO public.notifications (
            user_id, servidor_id, title, message, type, link, metadata
        ) VALUES (
            v_user_id, NEW.servidor_id,
            COALESCE(NEW.from_name, NEW.from_email), NEW.subject, 'email', '/email',
            jsonb_build_object('email_id', NEW.id, 'account_id', NEW.account_id, 'from', NEW.from_email)
        );
    END IF;
    RETURN NEW;
END;
$function$;
