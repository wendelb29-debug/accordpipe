-- ============================================================
-- Fix 1: Prevent privilege escalation via profiles UPDATE
-- ============================================================
-- Recreate the UPDATE policy on profiles with an explicit WITH CHECK
-- that blocks users from setting is_master = true on themselves and
-- restricts changes to sensitive fields (is_master, company_id) to
-- master/admin/ceo only.

DROP POLICY IF EXISTS "Admins can update profiles in their company" ON public.profiles;

CREATE POLICY "Admins can update profiles in their company"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.is_master(auth.uid())
  OR (
    (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'ceo'::app_role))
    AND company_id = public.get_user_company_id(auth.uid())
  )
  OR auth.uid() = user_id
)
WITH CHECK (
  public.is_master(auth.uid())
  OR (
    (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'ceo'::app_role))
    AND company_id = public.get_user_company_id(auth.uid())
    AND is_master = false
  )
  OR (
    auth.uid() = user_id
    AND is_master = false
    AND company_id = public.get_user_company_id(auth.uid())
  )
);

-- ============================================================
-- Fix 2: Storage policies that unintentionally grant DELETE/UPDATE
-- on every bucket except audit-exports
-- ============================================================
-- These policies were PERMISSIVE with USING (bucket_id <> 'audit-exports'),
-- which because of OR-evaluation effectively granted DELETE/UPDATE on
-- signatures, contract-pdfs, digital-certificates, user-signatures, etc.
-- Drop them. Each sensitive bucket already has its own RESTRICTIVE per-bucket
-- policies; the global "no audit-exports writes" intent is now enforced by
-- positive RESTRICTIVE policies that ONLY apply to the audit-exports bucket.

DROP POLICY IF EXISTS "audit_exports_no_delete" ON storage.objects;
DROP POLICY IF EXISTS "audit_exports_no_update" ON storage.objects;

-- Replace with RESTRICTIVE policies scoped exclusively to the audit-exports
-- bucket. RESTRICTIVE means: when bucket_id = 'audit-exports', the operation
-- is denied (USING false). For every other bucket, the policy is not
-- applicable and existing per-bucket policies continue to govern access.

CREATE POLICY "audit_exports_no_delete"
ON storage.objects
AS RESTRICTIVE
FOR DELETE
TO authenticated, anon
USING (bucket_id <> 'audit-exports');

CREATE POLICY "audit_exports_no_update"
ON storage.objects
AS RESTRICTIVE
FOR UPDATE
TO authenticated, anon
USING (bucket_id <> 'audit-exports');
