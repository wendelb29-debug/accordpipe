-- Fix recursion in user_tenants by using a non-recursive approach
DROP POLICY IF EXISTS "Admins can view all tenant links for their company" ON user_tenants;
CREATE POLICY "Admins can view company tenant links" ON user_tenants
FOR SELECT TO authenticated
USING (
  tenant_id IN (
    SELECT ut.tenant_id 
    FROM user_tenants ut 
    WHERE ut.user_id = auth.uid() 
    AND ut.role IN ('ceo', 'admin', 'master')
  )
);

-- Ensure base tables are readable by authenticated users
GRANT SELECT ON public.companies TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_tenants TO authenticated;
GRANT SELECT ON public.email_accounts TO authenticated;

-- Ensure service_role has all permissions
GRANT ALL ON public.companies TO service_role;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.user_tenants TO service_role;
GRANT ALL ON public.email_accounts TO service_role;

-- Re-grant execute on functions that might be needed by PostgREST
GRANT EXECUTE ON FUNCTION get_user_company_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_company_id(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_user_company_id(uuid) TO service_role;
