-- 1. Adicionar coluna de responsável
ALTER TABLE public.crm_leads ADD COLUMN assigned_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Inicializar com o criador para não perder dados
UPDATE public.crm_leads SET assigned_to_user_id = created_by_user_id WHERE assigned_to_user_id IS NULL;

-- 3. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_crm_leads_assigned ON public.crm_leads(assigned_to_user_id);

-- 4. Criar função para buscar membros do workspace de forma segura
CREATE OR REPLACE FUNCTION public.get_workspace_team_members(p_workspace_id uuid)
RETURNS TABLE (
    user_id uuid,
    name text,
    avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.user_id,
        p.name,
        p.avatar_url
    FROM public.profiles p
    WHERE p.company_id = (SELECT servidor_id FROM public.workspaces WHERE id = p_workspace_id)
      AND p.is_active = true
      AND (
          -- Se for master, vê todos da empresa
          public.has_role(auth.uid(), 'master') 
          OR EXISTS (
              SELECT 1 FROM public.user_workspace_permissions uwp 
              WHERE uwp.workspace_id = p_workspace_id AND uwp.user_id = p.user_id
          )
      );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_workspace_team_members(uuid) TO authenticated;

-- 5. Atualizar políticas RLS da crm_leads
-- Removemos as antigas que podem estar conflitando
DROP POLICY IF EXISTS "Users can see leads from their company" ON public.crm_leads;
DROP POLICY IF EXISTS "Leads isolados por tenant" ON public.crm_leads;

-- Nova política de SELECT: Isolamento por responsável para usuários comuns
CREATE POLICY "crm_leads_select_policy" ON public.crm_leads
FOR SELECT
TO authenticated
USING (
    servidor_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    AND (
        -- Admin/CEO/Master vê tudo do tenant
        public.has_role(auth.uid(), 'admin') 
        OR public.has_role(auth.uid(), 'ceo') 
        OR public.has_role(auth.uid(), 'master')
        OR (SELECT is_master FROM public.profiles WHERE user_id = auth.uid())
        -- Usuário comum só vê o que lhe foi atribuído
        OR assigned_to_user_id = auth.uid()
    )
);

-- Política de UPDATE: Apenas se for responsável ou supervisor
CREATE POLICY "crm_leads_update_policy" ON public.crm_leads
FOR UPDATE
TO authenticated
USING (
    servidor_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    AND (
        public.has_role(auth.uid(), 'admin') 
        OR public.has_role(auth.uid(), 'ceo') 
        OR public.has_role(auth.uid(), 'master')
        OR (SELECT is_master FROM public.profiles WHERE user_id = auth.uid())
        OR assigned_to_user_id = auth.uid()
    )
)
WITH CHECK (
    servidor_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);

-- Garantir privilégios
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_leads TO authenticated;
