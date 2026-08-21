-- Ensure all closer tables are fully multi-tenant enabled
ALTER TABLE public.closer_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closer_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closer_script_branches ENABLE ROW LEVEL SECURITY;

-- Scripts/Playbooks RLS (Visible to own tenant or global)
DROP POLICY IF EXISTS "playbooks_read" ON public.closer_playbooks;
CREATE POLICY "playbooks_read" ON public.closer_playbooks
FOR SELECT TO authenticated
USING (tenant_id IS NULL OR tenant_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "scripts_read" ON public.closer_scripts;
CREATE POLICY "scripts_read" ON public.closer_scripts
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.closer_playbooks p 
    WHERE p.id = playbook_id AND (p.tenant_id IS NULL OR p.tenant_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  )
);

DROP POLICY IF EXISTS "branches_read" ON public.closer_script_branches;
CREATE POLICY "branches_read" ON public.closer_script_branches
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.closer_scripts s
    JOIN public.closer_playbooks p ON p.id = s.playbook_id
    WHERE s.id = script_id AND (p.tenant_id IS NULL OR p.tenant_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  )
);

-- Grant missing permissions
GRANT SELECT ON public.closer_playbooks TO authenticated;
GRANT SELECT ON public.closer_scripts TO authenticated;
GRANT SELECT ON public.closer_script_branches TO authenticated;
