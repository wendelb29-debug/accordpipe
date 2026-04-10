
-- 1. Add 'master' to app_role enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'master' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'master';
  END IF;
END$$;

-- 2. Add module and data_scope columns to role_default_permissions
ALTER TABLE public.role_default_permissions
  ADD COLUMN IF NOT EXISTS module text,
  ADD COLUMN IF NOT EXISTS data_scope text NOT NULL DEFAULT 'own';

-- 3. Add data_scope column to user_custom_permissions
ALTER TABLE public.user_custom_permissions
  ADD COLUMN IF NOT EXISTS data_scope text NOT NULL DEFAULT 'own';

-- 4. Delete all old permission data
DELETE FROM public.role_default_permissions;

-- 5. Insert all new granular permissions for each role

-- ===================== ADMIN =====================
INSERT INTO public.role_default_permissions (role, permission_key, module, data_scope) VALUES
-- CRM
('admin', 'view_pipeline', 'crm', 'all'),
('admin', 'move_card', 'crm', 'all'),
('admin', 'edit_card', 'crm', 'all'),
('admin', 'delete_card', 'crm', 'all'),
('admin', 'create_lead', 'crm', 'all'),
('admin', 'edit_lead', 'crm', 'all'),
('admin', 'transfer_lead', 'crm', 'all'),
('admin', 'assumir_lead', 'crm', 'all'),
('admin', 'alterar_responsavel', 'crm', 'all'),
-- Propostas
('admin', 'view_proposal', 'propostas', 'all'),
('admin', 'create_proposal', 'propostas', 'all'),
('admin', 'edit_proposal', 'propostas', 'all'),
('admin', 'delete_proposal', 'propostas', 'all'),
('admin', 'add_item_proposal', 'propostas', 'all'),
('admin', 'apply_discount', 'propostas', 'all'),
('admin', 'edit_proposal_value', 'propostas', 'all'),
('admin', 'generate_pdf_proposal', 'propostas', 'all'),
-- Contratos
('admin', 'view_contract', 'contratos', 'all'),
('admin', 'create_contract', 'contratos', 'all'),
('admin', 'edit_contract', 'contratos', 'all'),
('admin', 'send_for_signature', 'contratos', 'all'),
('admin', 'sign_contract', 'contratos', 'all'),
('admin', 'cancel_contract', 'contratos', 'all'),
-- Financeiro
('admin', 'view_financial', 'financeiro', 'all'),
('admin', 'create_transaction', 'financeiro', 'all'),
('admin', 'edit_transaction', 'financeiro', 'all'),
('admin', 'delete_transaction', 'financeiro', 'all'),
('admin', 'view_values', 'financeiro', 'all'),
('admin', 'generate_charge', 'financeiro', 'all'),
('admin', 'update_charge', 'financeiro', 'all'),
('admin', 'confirm_payment', 'financeiro', 'all'),
-- Usuarios
('admin', 'view_users', 'usuarios', 'all'),
('admin', 'create_user', 'usuarios', 'all'),
('admin', 'edit_user', 'usuarios', 'all'),
('admin', 'delete_user', 'usuarios', 'all'),
('admin', 'manage_permissions', 'usuarios', 'all'),
-- WhatsApp
('admin', 'view_conversations', 'whatsapp', 'all'),
('admin', 'send_message', 'whatsapp', 'all'),
('admin', 'assign_conversation', 'whatsapp', 'all'),
('admin', 'transfer_conversation', 'whatsapp', 'all'),
('admin', 'send_broadcast', 'whatsapp', 'all'),
-- Workspaces
('admin', 'view_workspace', 'workspaces', 'all'),
('admin', 'create_workspace', 'workspaces', 'all'),
('admin', 'edit_workspace', 'workspaces', 'all'),
('admin', 'configure_pipeline', 'workspaces', 'all'),
('admin', 'edit_columns', 'workspaces', 'all'),
('admin', 'define_sla', 'workspaces', 'all'),
-- Dashboard
('admin', 'view_dashboard', 'dashboard', 'all'),
-- Documentos
('admin', 'view_documents', 'documentos', 'all'),
('admin', 'upload_documents', 'documentos', 'all'),
('admin', 'delete_documents', 'documentos', 'all'),
-- Relatorios
('admin', 'view_reports', 'relatorios', 'all'),
('admin', 'export_reports', 'relatorios', 'all'),
-- Clientes
('admin', 'view_clients', 'clientes', 'all'),
('admin', 'edit_clients', 'clientes', 'all'),
('admin', 'view_post_sale', 'clientes', 'all'),
-- Descarte
('admin', 'view_discard', 'descarte', 'all'),
('admin', 'delete_permanent', 'descarte', 'all'),
-- Formularios
('admin', 'view_forms', 'formularios', 'all'),
('admin', 'create_forms', 'formularios', 'all'),
('admin', 'edit_forms', 'formularios', 'all'),
-- Atividades
('admin', 'view_activities', 'atividades', 'all'),
('admin', 'create_activities', 'atividades', 'all');

-- ===================== COMERCIAL =====================
INSERT INTO public.role_default_permissions (role, permission_key, module, data_scope) VALUES
('comercial', 'view_pipeline', 'crm', 'own'),
('comercial', 'move_card', 'crm', 'own'),
('comercial', 'edit_card', 'crm', 'own'),
('comercial', 'create_lead', 'crm', 'own'),
('comercial', 'edit_lead', 'crm', 'own'),
('comercial', 'assumir_lead', 'crm', 'own'),
('comercial', 'view_proposal', 'propostas', 'own'),
('comercial', 'create_proposal', 'propostas', 'own'),
('comercial', 'edit_proposal', 'propostas', 'own'),
('comercial', 'generate_pdf_proposal', 'propostas', 'own'),
('comercial', 'view_contract', 'contratos', 'own'),
('comercial', 'create_contract', 'contratos', 'own'),
('comercial', 'send_for_signature', 'contratos', 'own'),
('comercial', 'view_conversations', 'whatsapp', 'own'),
('comercial', 'send_message', 'whatsapp', 'own'),
('comercial', 'view_workspace', 'workspaces', 'own'),
('comercial', 'view_dashboard', 'dashboard', 'own'),
('comercial', 'view_clients', 'clientes', 'own'),
('comercial', 'view_activities', 'atividades', 'own'),
('comercial', 'create_activities', 'atividades', 'own'),
('comercial', 'view_forms', 'formularios', 'own');

-- ===================== ADMINISTRATIVO =====================
INSERT INTO public.role_default_permissions (role, permission_key, module, data_scope) VALUES
('administrativo', 'view_pipeline', 'crm', 'all'),
('administrativo', 'move_card', 'crm', 'all'),
('administrativo', 'edit_card', 'crm', 'all'),
('administrativo', 'create_lead', 'crm', 'all'),
('administrativo', 'edit_lead', 'crm', 'all'),
('administrativo', 'transfer_lead', 'crm', 'all'),
('administrativo', 'alterar_responsavel', 'crm', 'all'),
('administrativo', 'view_proposal', 'propostas', 'all'),
('administrativo', 'create_proposal', 'propostas', 'all'),
('administrativo', 'edit_proposal', 'propostas', 'all'),
('administrativo', 'add_item_proposal', 'propostas', 'all'),
('administrativo', 'apply_discount', 'propostas', 'all'),
('administrativo', 'edit_proposal_value', 'propostas', 'all'),
('administrativo', 'generate_pdf_proposal', 'propostas', 'all'),
('administrativo', 'view_contract', 'contratos', 'all'),
('administrativo', 'create_contract', 'contratos', 'all'),
('administrativo', 'edit_contract', 'contratos', 'all'),
('administrativo', 'send_for_signature', 'contratos', 'all'),
('administrativo', 'sign_contract', 'contratos', 'all'),
('administrativo', 'cancel_contract', 'contratos', 'all'),
('administrativo', 'view_financial', 'financeiro', 'all'),
('administrativo', 'create_transaction', 'financeiro', 'all'),
('administrativo', 'edit_transaction', 'financeiro', 'all'),
('administrativo', 'view_values', 'financeiro', 'all'),
('administrativo', 'view_conversations', 'whatsapp', 'all'),
('administrativo', 'send_message', 'whatsapp', 'all'),
('administrativo', 'assign_conversation', 'whatsapp', 'all'),
('administrativo', 'view_workspace', 'workspaces', 'all'),
('administrativo', 'view_dashboard', 'dashboard', 'all'),
('administrativo', 'view_documents', 'documentos', 'all'),
('administrativo', 'upload_documents', 'documentos', 'all'),
('administrativo', 'view_reports', 'relatorios', 'all'),
('administrativo', 'export_reports', 'relatorios', 'all'),
('administrativo', 'view_clients', 'clientes', 'all'),
('administrativo', 'edit_clients', 'clientes', 'all'),
('administrativo', 'view_post_sale', 'clientes', 'all'),
('administrativo', 'view_discard', 'descarte', 'all'),
('administrativo', 'view_forms', 'formularios', 'all'),
('administrativo', 'create_forms', 'formularios', 'all'),
('administrativo', 'edit_forms', 'formularios', 'all'),
('administrativo', 'view_activities', 'atividades', 'all'),
('administrativo', 'create_activities', 'atividades', 'all');

-- ===================== FINANCEIRO =====================
INSERT INTO public.role_default_permissions (role, permission_key, module, data_scope) VALUES
('financeiro', 'view_financial', 'financeiro', 'all'),
('financeiro', 'create_transaction', 'financeiro', 'all'),
('financeiro', 'edit_transaction', 'financeiro', 'all'),
('financeiro', 'delete_transaction', 'financeiro', 'all'),
('financeiro', 'view_values', 'financeiro', 'all'),
('financeiro', 'generate_charge', 'financeiro', 'all'),
('financeiro', 'update_charge', 'financeiro', 'all'),
('financeiro', 'confirm_payment', 'financeiro', 'all'),
('financeiro', 'view_contract', 'contratos', 'all'),
('financeiro', 'view_clients', 'clientes', 'all'),
('financeiro', 'view_dashboard', 'dashboard', 'own'),
('financeiro', 'view_reports', 'relatorios', 'all'),
('financeiro', 'export_reports', 'relatorios', 'all'),
('financeiro', 'view_documents', 'documentos', 'all'),
('financeiro', 'upload_documents', 'documentos', 'all');

-- ===================== OPERADOR =====================
INSERT INTO public.role_default_permissions (role, permission_key, module, data_scope) VALUES
('operador', 'view_pipeline', 'crm', 'own'),
('operador', 'move_card', 'crm', 'own'),
('operador', 'edit_card', 'crm', 'own'),
('operador', 'create_lead', 'crm', 'own'),
('operador', 'edit_lead', 'crm', 'own'),
('operador', 'assumir_lead', 'crm', 'own'),
('operador', 'view_proposal', 'propostas', 'own'),
('operador', 'create_proposal', 'propostas', 'own'),
('operador', 'edit_proposal', 'propostas', 'own'),
('operador', 'generate_pdf_proposal', 'propostas', 'own'),
('operador', 'view_contract', 'contratos', 'own'),
('operador', 'create_contract', 'contratos', 'own'),
('operador', 'send_for_signature', 'contratos', 'own'),
('operador', 'view_conversations', 'whatsapp', 'own'),
('operador', 'send_message', 'whatsapp', 'own'),
('operador', 'view_workspace', 'workspaces', 'own'),
('operador', 'view_dashboard', 'dashboard', 'own'),
('operador', 'view_clients', 'clientes', 'own'),
('operador', 'view_activities', 'atividades', 'own'),
('operador', 'create_activities', 'atividades', 'own');

-- ===================== LEITURA =====================
INSERT INTO public.role_default_permissions (role, permission_key, module, data_scope) VALUES
('leitura', 'view_pipeline', 'crm', 'own'),
('leitura', 'view_proposal', 'propostas', 'own'),
('leitura', 'view_contract', 'contratos', 'own'),
('leitura', 'view_dashboard', 'dashboard', 'own'),
('leitura', 'view_clients', 'clientes', 'own'),
('leitura', 'view_activities', 'atividades', 'own'),
('leitura', 'view_workspace', 'workspaces', 'own');

-- 6. Update has_permission function to keep backward compat
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
  RETURNS boolean
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'ceo') THEN true
    WHEN EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id AND is_master = true) THEN true
    WHEN EXISTS (SELECT 1 FROM public.user_custom_permissions WHERE user_id = _user_id AND permission_key = _permission) THEN
      (SELECT granted FROM public.user_custom_permissions WHERE user_id = _user_id AND permission_key = _permission LIMIT 1)
    ELSE EXISTS (
      SELECT 1 FROM public.role_default_permissions rdp
      JOIN public.user_roles ur ON ur.role = rdp.role
      WHERE ur.user_id = _user_id AND rdp.permission_key = _permission
    )
  END
$$;

-- 7. Create get_data_scope function
CREATE OR REPLACE FUNCTION public.get_data_scope(_user_id uuid, _permission text)
  RETURNS text
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'ceo') THEN 'all'
    WHEN EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id AND is_master = true) THEN 'all'
    WHEN EXISTS (SELECT 1 FROM public.user_custom_permissions WHERE user_id = _user_id AND permission_key = _permission AND granted = true) THEN
      (SELECT COALESCE(data_scope, 'own') FROM public.user_custom_permissions WHERE user_id = _user_id AND permission_key = _permission LIMIT 1)
    WHEN EXISTS (
      SELECT 1 FROM public.role_default_permissions rdp
      JOIN public.user_roles ur ON ur.role = rdp.role
      WHERE ur.user_id = _user_id AND rdp.permission_key = _permission
    ) THEN
      (SELECT COALESCE(rdp.data_scope, 'own') FROM public.role_default_permissions rdp
       JOIN public.user_roles ur ON ur.role = rdp.role
       WHERE ur.user_id = _user_id AND rdp.permission_key = _permission LIMIT 1)
    ELSE 'own'
  END
$$;
