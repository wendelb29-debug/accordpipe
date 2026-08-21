-- 1. Fix constraints and populate using the first available tenant
DO $$
DECLARE
    v_target_tenant_id uuid;
    v_playbook_id uuid;
    v_script_motivo_id uuid;
BEGIN
    -- Get first tenant
    SELECT id INTO v_target_tenant_id FROM public.companies ORDER BY created_at LIMIT 1;
    
    IF v_target_tenant_id IS NULL THEN
        RETURN;
    END IF;

    -- Add unique constraints
    ALTER TABLE public.closer_playbooks DROP CONSTRAINT IF EXISTS closer_playbooks_name_tenant_key;
    ALTER TABLE public.closer_playbooks ADD CONSTRAINT closer_playbooks_name_tenant_key UNIQUE (name, tenant_id);

    ALTER TABLE public.closer_scripts DROP CONSTRAINT IF EXISTS closer_scripts_playbook_step_key;
    ALTER TABLE public.closer_scripts ADD CONSTRAINT closer_scripts_playbook_step_key UNIQUE (playbook_id, step_key);

    ALTER TABLE public.closer_script_branches DROP CONSTRAINT IF EXISTS closer_branches_script_branch_key;
    ALTER TABLE public.closer_script_branches ADD CONSTRAINT closer_branches_script_branch_key UNIQUE (script_id, branch_key);

    -- Ensure playbook exists
    INSERT INTO public.closer_playbooks (name, description, is_active, tenant_id)
    VALUES ('Save Car — Recuperação de Associados', 'Fluxo consultivo de alto impacto para contratos inativos', true, v_target_tenant_id)
    ON CONFLICT (name, tenant_id) 
    DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_playbook_id;

    -- ABERTURA
    INSERT INTO public.closer_scripts (playbook_id, step_key, title, content, channel, sort_order)
    VALUES (v_playbook_id, 'abertura', 'Abertura', 'Oi, [Nome], tudo bem? Sou Head na Save Car. Vi que você já foi nosso associado, Você continua com o veículo [Placa/Modelo]?', 'whatsapp', 0)
    ON CONFLICT (playbook_id, step_key) DO UPDATE SET content = EXCLUDED.content;

    -- INVESTIGAÇÃO
    INSERT INTO public.closer_scripts (playbook_id, step_key, title, content, channel, sort_order)
    VALUES (v_playbook_id, 'investigacao', 'Investigação Consultiva', 'Pergunto porque quero entender se o motivo que levou ao cancelamento ainda existe. Na época, o que mais pesou para você sair?', 'whatsapp', 1)
    ON CONFLICT (playbook_id, step_key) DO UPDATE SET content = EXCLUDED.content;

    -- MOTIVO
    INSERT INTO public.closer_scripts (playbook_id, step_key, title, content, channel, sort_order)
    VALUES (v_playbook_id, 'motivo', 'Identificação do Motivo', 'Entendi.', 'whatsapp', 2)
    ON CONFLICT (playbook_id, step_key) DO UPDATE SET content = EXCLUDED.content
    RETURNING id INTO v_script_motivo_id;

    -- Ramificações do MOTIVO
    INSERT INTO public.closer_script_branches (script_id, branch_key, label, branch_content, sort_order)
    VALUES (v_script_motivo_id, 'continua', 'Continua', 'Entendi. E atualmente ele está sem proteção?', 0)
    ON CONFLICT (script_id, branch_key) DO UPDATE SET branch_content = EXCLUDED.branch_content;

    INSERT INTO public.closer_script_branches (script_id, branch_key, label, branch_content, sort_order)
    VALUES (v_script_motivo_id, 'trocou', 'Trocou', 'Qual veículo você está usando atualmente? Seu veículo novo já está protegido?', 1)
    ON CONFLICT (script_id, branch_key) DO UPDATE SET branch_content = EXCLUDED.branch_content;

    INSERT INTO public.closer_script_branches (script_id, branch_key, label, branch_content, sort_order)
    VALUES (v_script_motivo_id, 'vendeu', 'Vendeu', 'Está sem veículo atualmente? Bacana! Consegue me indicar pessoas que você sabe que possuem veículo? Se elas fecharem comigo, te pago um PIX de R$ 50,00!', 2)
    ON CONFLICT (script_id, branch_key) DO UPDATE SET branch_content = EXCLUDED.branch_content;
END $$;
