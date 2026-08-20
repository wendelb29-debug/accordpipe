-- 1. Fix RLS Enabled No Policy for team_specialties
CREATE POLICY "Users can see specialties for their company" ON public.team_specialties
FOR SELECT TO authenticated
USING (tenant_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage specialties" ON public.team_specialties
FOR ALL TO authenticated
USING (
    tenant_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo'))
)
WITH CHECK (
    tenant_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo'))
);

-- 2. Fix Function Search Path Mutable for log_team_event
ALTER FUNCTION public.log_team_event() SET search_path = public;

-- 3. Fix Public/Authenticated Execution for log_team_event
-- Revoke execution from public roles as it's a trigger function and shouldn't be called directly
REVOKE EXECUTE ON FUNCTION public.log_team_event() FROM public;
REVOKE EXECUTE ON FUNCTION public.log_team_event() FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_team_event() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.log_team_event() TO service_role;
