
-- 1. FIX: Missing GRANTs on user_workspace_permissions (causes the red toast)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_workspace_permissions TO authenticated;
GRANT ALL ON public.user_workspace_permissions TO service_role;

-- 2. EXPAND: New permission catalog entries
-- Assign to admin/ceo/master all new perms; give operador a minimal subset.

DO $$
DECLARE
  new_perms text[][] := ARRAY[
    -- whatsapp
    ['whatsapp','connect_whatsapp_instance'],
    ['whatsapp','disconnect_whatsapp_instance'],
    ['whatsapp','view_all_conversations'],
    ['whatsapp','send_media_message'],
    ['whatsapp','edit_whatsapp_profile'],
    ['whatsapp','manage_whatsapp_groups'],
    ['whatsapp','view_whatsapp_diagnostics'],
    -- campanhas
    ['campanhas','create_template'],
    ['campanhas','edit_template'],
    ['campanhas','delete_template'],
    ['campanhas','create_mass_campaign'],
    ['campanhas','pause_mass_campaign'],
    ['campanhas','view_all_campaigns'],
    -- contatos
    ['contatos','view_own_contacts'],
    ['contatos','view_all_contacts'],
    ['contatos','create_contact'],
    ['contatos','edit_contact'],
    ['contatos','block_contact'],
    ['contatos','import_contacts'],
    ['contatos','manage_contact_groups'],
    -- analise
    ['analise','view_own_history'],
    ['analise','view_all_history'],
    ['analise','view_indicators'],
    ['analise','view_operator_status'],
    ['analise','download_reports'],
    ['analise','manage_content_analysis'],
    -- equipe
    ['equipe','transfer_conversations_bulk'],
    ['equipe','manage_quick_replies'],
    ['equipe','manage_business_hours'],
    ['equipe','manage_stickers'],
    -- configuracoes
    ['configuracoes','edit_visual_identity'],
    ['configuracoes','edit_contract_fiscal'],
    ['configuracoes','manage_webhooks']
  ];
  operador_defaults text[] := ARRAY[
    'view_own_conversations','send_media_message',
    'view_own_contacts','create_contact','edit_contact',
    'view_own_history'
  ];
  privileged_roles app_role[] := ARRAY['admin','ceo','master']::app_role[];
  r app_role;
  i int;
  mod text;
  key text;
BEGIN
  FOR i IN 1 .. array_length(new_perms,1) LOOP
    mod := new_perms[i][1];
    key := new_perms[i][2];

    -- All privileged roles get every new permission
    FOREACH r IN ARRAY privileged_roles LOOP
      INSERT INTO public.role_default_permissions (role, module, permission_key)
      VALUES (r, mod, key)
      ON CONFLICT DO NOTHING;
    END LOOP;

    -- Operador: only explicit subset
    IF key = ANY(operador_defaults) THEN
      INSERT INTO public.role_default_permissions (role, module, permission_key)
      VALUES ('operador'::app_role, mod, key)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;
