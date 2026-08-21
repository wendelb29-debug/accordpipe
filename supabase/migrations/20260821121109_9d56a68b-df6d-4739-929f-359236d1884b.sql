-- Migração para Playbook "Recuperação de Associados" global e correções de RLS

-- 1. Garante que o playbook padrão exista
DO $$
DECLARE
    v_master_tenant_id uuid;
    v_playbook_id uuid;
BEGIN
    -- Busca o ID do primeiro tenant (geralmente o master no Accord)
    SELECT id INTO v_master_tenant_id FROM public.companies ORDER BY created_at LIMIT 1;

    -- Tenta encontrar ou criar o playbook
    INSERT INTO public.closer_playbooks (name, description, is_active, tenant_id)
    VALUES ('Save Car — Recuperação de Associados', 'Fluxo consultivo de alto impacto para contratos inativos', true, v_master_tenant_id)
    ON CONFLICT (name, tenant_id) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_playbook_id;

    -- 2. Insere os scripts do playbook
    -- ABERTURA
    INSERT INTO public.closer_scripts (playbook_id, step_key, title, content, channel, sort_order)
    VALUES (v_playbook_id, 'abertura', 'Abertura', 'Oi, [Nome], tudo bem? Sou Head na Save Car. Vi que você já foi nosso associado, Você continua com o veículo [Placa/Modelo]?', 'whatsapp', 0)
    ON CONFLICT (playbook_id, step_key) DO UPDATE SET content = EXCLUDED.content;

    -- INVESTIGAÇÃO
    INSERT INTO public.closer_scripts (playbook_id, step_key, title, content, channel, sort_order)
    VALUES (v_playbook_id, 'investigacao', 'Investigação Consultiva', 'Pergunto porque quero entender se o motivo que levou ao cancelamento ainda existe. Na época, o que mais pesou para você sair?', 'whatsapp', 1)
    ON CONFLICT (playbook_id, step_key) DO UPDATE SET content = EXCLUDED.content;

    -- IDENTIFICAÇÃO DO MOTIVO
    INSERT INTO public.closer_scripts (playbook_id, step_key, title, content, channel, sort_order)
    VALUES (v_playbook_id, 'motivo', 'Identificação do Motivo', 'Entendi.', 'whatsapp', 2)
    ON CONFLICT (playbook_id, step_key) DO UPDATE SET content = EXCLUDED.content;

    -- 3. Ramificações
    DECLARE
        v_script_motivo_id uuid;
    BEGIN
        SELECT id INTO v_script_motivo_id FROM public.closer_scripts WHERE playbook_id = v_playbook_id AND step_key = 'motivo';

        INSERT INTO public.closer_script_branches (script_id, branch_key, label, branch_content, sort_order)
        VALUES (v_script_motivo_id, 'continua', 'Continua', 'Entendi. E atualmente ele está sem proteção?', 0)
        ON CONFLICT (script_id, branch_key) DO UPDATE SET branch_content = EXCLUDED.branch_content;

        INSERT INTO public.closer_script_branches (script_id, branch_key, label, branch_content, sort_order)
        VALUES (v_script_motivo_id, 'trocou', 'Trocou', 'Qual veículo você está usando atualmente? Seu veículo novo já está protegido?', 1)
        ON CONFLICT (script_id, branch_key) DO UPDATE SET branch_content = EXCLUDED.branch_content;

        INSERT INTO public.closer_script_branches (script_id, branch_key, label, branch_content, sort_order)
        VALUES (v_script_motivo_id, 'vendeu', 'Vendeu', 'Está sem veículo atualmente? Bacana! Consegue me indicar pessoas que você sabe que possuem veículo? Se elas fecharem comigo, te pago um PIX de R$ 50,00!', 2)
        ON CONFLICT (script_id, branch_key) DO UPDATE SET branch_content = EXCLUDED.branch_content;
    END;
END $$;

-- 4. RLS hardening
ALTER TABLE public.closer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closer_session_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own closer sessions" ON public.closer_sessions;
CREATE POLICY "Users can view their own closer sessions" ON public.closer_sessions
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'ceo') OR 
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_master = true)
);

DROP POLICY IF EXISTS "Users can insert their own closer sessions" ON public.closer_sessions;
CREATE POLICY "Users can insert their own closer sessions" ON public.closer_sessions
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own closer sessions" ON public.closer_sessions;
CREATE POLICY "Users can update their own closer sessions" ON public.closer_sessions
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view events of their sessions" ON public.closer_session_events;
CREATE POLICY "Users can view events of their sessions" ON public.closer_session_events
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.closer_sessions s
    WHERE s.id = session_id AND (
      s.user_id = auth.uid() OR 
      public.has_role(auth.uid(), 'admin') OR 
      public.has_role(auth.uid(), 'ceo') OR
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_master = true)
    )
  )
);

DROP POLICY IF EXISTS "Users can insert events for their sessions" ON public.closer_session_events;
CREATE POLICY "Users can insert events for their sessions" ON public.closer_session_events
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.closer_sessions s
    WHERE s.id = session_id AND s.user_id = auth.uid()
  )
);

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.closer_sessions TO authenticated;
GRANT SELECT, INSERT ON public.closer_session_events TO authenticated;
GRANT SELECT ON public.closer_playbooks TO authenticated;
GRANT SELECT ON public.closer_scripts TO authenticated;
GRANT SELECT ON public.closer_script_branches TO authenticated;
GRANT ALL ON public.closer_sessions TO service_role;
GRANT ALL ON public.closer_session_events TO service_role;
GRANT ALL ON public.closer_playbooks TO service_role;
GRANT ALL ON public.closer_scripts TO service_role;
GRANT ALL ON public.closer_script_branches TO service_role;
