-- 1) documents bucket: tenant-scoped DELETE mirroring INSERT
DROP POLICY IF EXISTS "Tenant admins can delete own tenant document files" ON storage.objects;
CREATE POLICY "Tenant admins can delete own tenant document files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role))
  AND get_user_company_id(auth.uid()) IS NOT NULL
  AND (storage.foldername(name))[1] = (get_user_company_id(auth.uid()))::text
);

-- 2) user_roles: enforce tenant scope as a RESTRICTIVE rule (no null bypass)
ALTER TABLE public.profiles ALTER COLUMN company_id SET NOT NULL;

DROP POLICY IF EXISTS "Tenant scope required for role writes" ON public.user_roles;
CREATE POLICY "Tenant scope required for role writes"
ON public.user_roles AS RESTRICTIVE FOR UPDATE TO authenticated
USING (
  is_master(auth.uid())
  OR (
    get_profile_company_id(user_id) IS NOT NULL
    AND get_user_company_id(auth.uid()) IS NOT NULL
    AND (
      get_profile_company_id(user_id) = get_user_company_id(auth.uid())
      OR user_is_reseller_of(get_profile_company_id(user_id))
    )
  )
)
WITH CHECK (
  is_master(auth.uid())
  OR (
    get_profile_company_id(user_id) IS NOT NULL
    AND get_user_company_id(auth.uid()) IS NOT NULL
    AND (
      get_profile_company_id(user_id) = get_user_company_id(auth.uid())
      OR user_is_reseller_of(get_profile_company_id(user_id))
    )
  )
);

DROP POLICY IF EXISTS "Tenant scope required for role inserts" ON public.user_roles;
CREATE POLICY "Tenant scope required for role inserts"
ON public.user_roles AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (
  is_master(auth.uid())
  OR (
    get_profile_company_id(user_id) IS NOT NULL
    AND get_user_company_id(auth.uid()) IS NOT NULL
    AND (
      get_profile_company_id(user_id) = get_user_company_id(auth.uid())
      OR user_is_reseller_of(get_profile_company_id(user_id))
    )
  )
);

-- 3) whatsapp-media: validate tenant folder against real company, not naming convention alone
DROP POLICY IF EXISTS "WhatsApp media tenant-scoped read" ON storage.objects;
CREATE POLICY "WhatsApp media tenant-scoped read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'whatsapp-media'
  AND get_user_company_id(auth.uid()) IS NOT NULL
  AND (
    (storage.foldername(name))[1] = (get_user_company_id(auth.uid()))::text
    OR (
      (storage.foldername(name))[1] = 'inbound'
      AND (storage.foldername(name))[2] = (get_user_company_id(auth.uid()))::text
      AND EXISTS (
        SELECT 1 FROM public.companies c
        WHERE c.id = get_user_company_id(auth.uid())
      )
    )
  )
);

DROP POLICY IF EXISTS "WhatsApp media tenant-scoped upload" ON storage.objects;
CREATE POLICY "WhatsApp media tenant-scoped upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'whatsapp-media'
  AND get_user_company_id(auth.uid()) IS NOT NULL
  AND (storage.foldername(name))[1] = (get_user_company_id(auth.uid()))::text
  AND EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = get_user_company_id(auth.uid())
  )
);