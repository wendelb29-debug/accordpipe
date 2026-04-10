
-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  details jsonb DEFAULT '{}',
  servidor_id uuid,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_audit_logs_servidor ON public.audit_logs(servidor_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- Only CEO/Master can view audit logs
CREATE POLICY "CEO and Master can view audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('ceo', 'master'))
  OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_master = true)
);

-- Insert via service role or authenticated users (logged server-side)
CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 2. Create audit helper function
CREATE OR REPLACE FUNCTION public.log_audit(
  _user_id uuid,
  _user_name text,
  _action text,
  _target_type text,
  _target_id text DEFAULT NULL,
  _details jsonb DEFAULT '{}',
  _servidor_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, user_name, action, target_type, target_id, details, servidor_id)
  VALUES (_user_id, _user_name, _action, _target_type, _target_id, _details, 
    COALESCE(_servidor_id, get_user_company_id(_user_id)));
END;
$$;

-- 3. Clear and re-seed ALL permissions with the official matrix
DELETE FROM public.role_default_permissions;

-- ===================== ADMIN (scope: all) =====================
INSERT INTO public.role_default_permissions (role, permission_key, module, data_scope) VALUES
-- Dashboard
('admin', 'view_dashboard', 'dashboard', 'all'),
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
('admin', 'mark_lead_won', 'crm', 'all'),
('admin', 'mark_lead_lost', 'crm', 'all'),
('admin', 'change_lead_owner', 'crm', 'all'),
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
('admin', 'cancel_signature_flow', 'contratos', 'all'),
-- Financeiro
('admin', 'view_financial', 'financeiro', 'all'),
('admin', 'create_transaction', 'financeiro', 'all'),
('admin', 'edit_transaction', 'financeiro', 'all'),
('admin', 'delete_transaction', 'financeiro', 'all'),
('admin', 'view_values', 'financeiro', 'all'),
('admin', 'generate_charge', 'financeiro', 'all'),
('admin', 'update_charge', 'financeiro', 'all'),
('admin', 'confirm_payment', 'financeiro', 'all'),
('admin', 'manual_payment_settlement', 'financeiro', 'all'),
-- Usuarios
('admin', 'view_users', 'usuarios', 'all'),
('admin', 'create_user', 'usuarios', 'all'),
('admin', 'edit_user', 'usuarios', 'all'),
('admin', 'delete_user', 'usuarios', 'all'),
('admin', 'manage_permissions', 'usuarios', 'all'),
('admin', 'manage_roles', 'usuarios', 'all'),
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
('admin', 'create_activities', 'atividades', 'all'),
-- Catalogo
('admin', 'edit_catalog_item', 'catalogo', 'all'),
('admin', 'delete_catalog_item', 'catalogo', 'all'),
-- Plataforma
('admin', 'manage_integrations', 'plataforma', 'all'),
('admin', 'view_audit_logs', 'plataforma', 'all');

-- ===================== COMERCIAL (scope: own) =====================
INSERT INTO public.role_default_permissions (role, permission_key, module, data_scope) VALUES
('comercial', 'view_dashboard', 'dashboard', 'own'),
('comercial', 'view_pipeline', 'crm', 'own'),
('comercial', 'move_card', 'crm', 'own'),
('comercial', 'edit_card', 'crm', 'own'),
('comercial', 'create_lead', 'crm', 'own'),
('comercial', 'edit_lead', 'crm', 'own'),
('comercial', 'assumir_lead', 'crm', 'own'),
('comercial', 'mark_lead_won', 'crm', 'own'),
('comercial', 'mark_lead_lost', 'crm', 'own'),
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
('comercial', 'view_clients', 'clientes', 'own'),
('comercial', 'view_activities', 'atividades', 'own'),
('comercial', 'create_activities', 'atividades', 'own'),
('comercial', 'view_forms', 'formularios', 'own');

-- ===================== ADMINISTRATIVO (scope: team) =====================
INSERT INTO public.role_default_permissions (role, permission_key, module, data_scope) VALUES
('administrativo', 'view_dashboard', 'dashboard', 'team'),
('administrativo', 'view_pipeline', 'crm', 'team'),
('administrativo', 'move_card', 'crm', 'team'),
('administrativo', 'edit_card', 'crm', 'team'),
('administrativo', 'create_lead', 'crm', 'team'),
('administrativo', 'edit_lead', 'crm', 'team'),
('administrativo', 'transfer_lead', 'crm', 'team'),
('administrativo', 'alterar_responsavel', 'crm', 'team'),
('administrativo', 'mark_lead_won', 'crm', 'team'),
('administrativo', 'mark_lead_lost', 'crm', 'team'),
('administrativo', 'change_lead_owner', 'crm', 'team'),
('administrativo', 'view_proposal', 'propostas', 'team'),
('administrativo', 'create_proposal', 'propostas', 'team'),
('administrativo', 'edit_proposal', 'propostas', 'team'),
('administrativo', 'add_item_proposal', 'propostas', 'team'),
('administrativo', 'apply_discount', 'propostas', 'team'),
('administrativo', 'edit_proposal_value', 'propostas', 'team'),
('administrativo', 'generate_pdf_proposal', 'propostas', 'team'),
('administrativo', 'view_contract', 'contratos', 'all'),
('administrativo', 'create_contract', 'contratos', 'all'),
('administrativo', 'edit_contract', 'contratos', 'all'),
('administrativo', 'send_for_signature', 'contratos', 'all'),
('administrativo', 'sign_contract', 'contratos', 'all'),
('administrativo', 'cancel_contract', 'contratos', 'all'),
('administrativo', 'cancel_signature_flow', 'contratos', 'all'),
('administrativo', 'view_financial', 'financeiro', 'all'),
('administrativo', 'create_transaction', 'financeiro', 'all'),
('administrativo', 'edit_transaction', 'financeiro', 'all'),
('administrativo', 'view_values', 'financeiro', 'all'),
('administrativo', 'view_conversations', 'whatsapp', 'all'),
('administrativo', 'send_message', 'whatsapp', 'all'),
('administrativo', 'assign_conversation', 'whatsapp', 'all'),
('administrativo', 'view_workspace', 'workspaces', 'all'),
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
('administrativo', 'create_activities', 'atividades', 'all'),
('administrativo', 'edit_catalog_item', 'catalogo', 'all');

-- ===================== FINANCEIRO (scope: all for finance) =====================
INSERT INTO public.role_default_permissions (role, permission_key, module, data_scope) VALUES
('financeiro', 'view_dashboard', 'dashboard', 'own'),
('financeiro', 'view_financial', 'financeiro', 'all'),
('financeiro', 'create_transaction', 'financeiro', 'all'),
('financeiro', 'edit_transaction', 'financeiro', 'all'),
('financeiro', 'delete_transaction', 'financeiro', 'all'),
('financeiro', 'view_values', 'financeiro', 'all'),
('financeiro', 'generate_charge', 'financeiro', 'all'),
('financeiro', 'update_charge', 'financeiro', 'all'),
('financeiro', 'confirm_payment', 'financeiro', 'all'),
('financeiro', 'manual_payment_settlement', 'financeiro', 'all'),
('financeiro', 'view_contract', 'contratos', 'all'),
('financeiro', 'view_clients', 'clientes', 'all'),
('financeiro', 'view_reports', 'relatorios', 'all'),
('financeiro', 'export_reports', 'relatorios', 'all'),
('financeiro', 'view_documents', 'documentos', 'all'),
('financeiro', 'upload_documents', 'documentos', 'all');

-- ===================== OPERADOR (scope: own) =====================
INSERT INTO public.role_default_permissions (role, permission_key, module, data_scope) VALUES
('operador', 'view_dashboard', 'dashboard', 'own'),
('operador', 'view_pipeline', 'crm', 'own'),
('operador', 'move_card', 'crm', 'own'),
('operador', 'edit_card', 'crm', 'own'),
('operador', 'create_lead', 'crm', 'own'),
('operador', 'edit_lead', 'crm', 'own'),
('operador', 'assumir_lead', 'crm', 'own'),
('operador', 'mark_lead_won', 'crm', 'own'),
('operador', 'mark_lead_lost', 'crm', 'own'),
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
('operador', 'view_clients', 'clientes', 'own'),
('operador', 'view_activities', 'atividades', 'own'),
('operador', 'create_activities', 'atividades', 'own');

-- ===================== LEITURA (scope: own, view only) =====================
INSERT INTO public.role_default_permissions (role, permission_key, module, data_scope) VALUES
('leitura', 'view_dashboard', 'dashboard', 'own'),
('leitura', 'view_pipeline', 'crm', 'own'),
('leitura', 'view_proposal', 'propostas', 'own'),
('leitura', 'view_contract', 'contratos', 'own'),
('leitura', 'view_clients', 'clientes', 'own'),
('leitura', 'view_activities', 'atividades', 'own'),
('leitura', 'view_workspace', 'workspaces', 'own');

-- 4. Update has_permission to also handle 'master' role as bypass
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
  RETURNS boolean
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('ceo', 'master')) THEN true
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

-- 5. Update get_data_scope to handle master
CREATE OR REPLACE FUNCTION public.get_data_scope(_user_id uuid, _permission text)
  RETURNS text
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('ceo', 'master')) THEN 'all'
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

-- Enable realtime for audit_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
