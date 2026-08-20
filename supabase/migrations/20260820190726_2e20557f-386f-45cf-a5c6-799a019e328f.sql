-- Seed default Save Car playbook and scripts
DO $$
DECLARE
    v_tenant_id uuid;
    v_playbook_id uuid;
    v_script1_id uuid;
    v_script2_id uuid;
    v_script3_id uuid;
BEGIN
    -- Get the first available tenant to seed data
    SELECT id INTO v_tenant_id FROM public.companies LIMIT 1;
    
    IF v_tenant_id IS NOT NULL THEN
        -- Create Playbook
        INSERT INTO public.closer_playbooks (tenant_id, name, description)
        VALUES (v_tenant_id, 'Save Car', 'Fluxo de recuperação de associados inativos.')
        RETURNING id INTO v_playbook_id;

        -- Step 1: Abertura
        INSERT INTO public.closer_scripts (playbook_id, step_key, title, content, sort_order)
        VALUES (v_playbook_id, 'abertura', 'Etapa 1 — Abertura', 'Oi, [Nome], tudo bem? Sou Head na Save Car. Vi que você já foi nosso associado. Você continua com o veículo [Placa/Modelo]?', 0)
        RETURNING id INTO v_script1_id;

        -- Step 2: Investigação
        INSERT INTO public.closer_scripts (playbook_id, step_key, title, content, sort_order)
        VALUES (v_playbook_id, 'investigacao', 'Etapa 2 — Investigação Consultiva', 'Pergunto porque quero entender se o motivo que levou ao cancelamento ainda existe. Na época, o que mais pesou para você sair?', 1)
        RETURNING id INTO v_script2_id;

        -- Step 3: Identificação do Motivo (Branches)
        INSERT INTO public.closer_scripts (playbook_id, step_key, title, content, sort_order)
        VALUES (v_playbook_id, 'motivo', 'Etapa 3 — Identificação do Motivo', 'Entendi. E como está a sua situação hoje?', 2)
        RETURNING id INTO v_script3_id;

        -- Branches for Step 3
        INSERT INTO public.closer_script_branches (script_id, branch_key, label, branch_content)
        VALUES (v_script3_id, 'continua', 'Continua', 'Entendi. E atualmente ele está sem proteção?');
        
        INSERT INTO public.closer_script_branches (script_id, branch_key, label, branch_content)
        VALUES (v_script3_id, 'trocou', 'Trocou', 'Qual veículo você está usando atualmente? Seu veículo novo já está protegido?');
        
        INSERT INTO public.closer_script_branches (script_id, branch_key, label, branch_content)
        VALUES (v_script3_id, 'vendeu', 'Vendeu', 'Está sem veículo atualmente? Bacana! Consegue me indicar pessoas que você sabe que possuem veículo? Se elas fecharem comigo, te pago um PIX de R$ 50,00!');
    END IF;
END $$;
