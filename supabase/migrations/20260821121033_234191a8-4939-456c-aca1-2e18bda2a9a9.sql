-- 1. Adiciona restrições únicas para permitir o uso de ON CONFLICT nas migrações de playbooks
ALTER TABLE public.closer_playbooks ADD CONSTRAINT closer_playbooks_name_tenant_id_key UNIQUE (name, tenant_id);
ALTER TABLE public.closer_scripts ADD CONSTRAINT closer_scripts_playbook_id_step_key UNIQUE (playbook_id, step_key);
ALTER TABLE public.closer_script_branches ADD CONSTRAINT closer_script_branches_script_id_branch_key UNIQUE (script_id, branch_key);
