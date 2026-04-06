
-- Table for role default permissions
CREATE TABLE public.role_default_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role, permission_key)
);

ALTER TABLE public.role_default_permissions ENABLE ROW LEVEL SECURITY;

-- Table for user custom permissions (overrides role defaults)
CREATE TABLE public.user_custom_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, permission_key)
);

ALTER TABLE public.user_custom_permissions ENABLE ROW LEVEL SECURITY;

-- RLS: Only admins/master can manage permissions
CREATE POLICY "Admin/master can manage role_default_permissions"
ON public.role_default_permissions
FOR ALL
TO authenticated
USING (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role))
WITH CHECK (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "Authenticated can view role_default_permissions"
ON public.role_default_permissions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin/master can manage user_custom_permissions"
ON public.user_custom_permissions
FOR ALL
TO authenticated
USING (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role))
WITH CHECK (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "Users can view own custom_permissions"
ON public.user_custom_permissions
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

-- Security definer function to check permissions
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    -- CEO and master always have all permissions
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'ceo') THEN true
    WHEN EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id AND is_master = true) THEN true
    -- Check custom permissions first
    WHEN EXISTS (SELECT 1 FROM public.user_custom_permissions WHERE user_id = _user_id AND permission_key = _permission) THEN
      (SELECT granted FROM public.user_custom_permissions WHERE user_id = _user_id AND permission_key = _permission LIMIT 1)
    -- Fall back to role defaults
    ELSE EXISTS (
      SELECT 1 FROM public.role_default_permissions rdp
      JOIN public.user_roles ur ON ur.role = rdp.role
      WHERE ur.user_id = _user_id AND rdp.permission_key = _permission
    )
  END
$$;

-- Seed default permissions for each role
-- Admin: all permissions
INSERT INTO public.role_default_permissions (role, permission_key) VALUES
('admin', 'visualizar_dashboard'),
('admin', 'visualizar_vendas'), ('admin', 'editar_vendas'), ('admin', 'excluir_vendas'),
('admin', 'visualizar_formularios'), ('admin', 'criar_formularios'), ('admin', 'editar_formularios'),
('admin', 'visualizar_atividades'), ('admin', 'criar_atividades'),
('admin', 'visualizar_financeiro'), ('admin', 'editar_financeiro'), ('admin', 'acessar_boletos'),
('admin', 'visualizar_documentos'), ('admin', 'enviar_documentos'), ('admin', 'excluir_documentos'),
('admin', 'visualizar_relatorios'), ('admin', 'exportar_relatorios'),
('admin', 'visualizar_contratos'), ('admin', 'criar_contratos'), ('admin', 'assinar_contratos'),
('admin', 'visualizar_pipeline'), ('admin', 'mover_oportunidades'), ('admin', 'fechar_vendas'),
('admin', 'visualizar_clientes'), ('admin', 'editar_clientes'), ('admin', 'ver_dados_pos_venda'),
('admin', 'visualizar_descarte'), ('admin', 'excluir_permanente'),
('admin', 'enviar_mensagem'), ('admin', 'enviar_broadcast'), ('admin', 'acessar_grupos'),
('admin', 'criar_usuario'), ('admin', 'editar_usuario'), ('admin', 'excluir_usuario'),
-- Operador/Comercial
('operador', 'visualizar_dashboard'),
('operador', 'visualizar_vendas'), ('operador', 'editar_vendas'),
('operador', 'visualizar_formularios'),
('operador', 'visualizar_atividades'), ('operador', 'criar_atividades'),
('operador', 'visualizar_pipeline'), ('operador', 'mover_oportunidades'), ('operador', 'fechar_vendas'),
('operador', 'visualizar_clientes'),
('operador', 'enviar_mensagem'),
('comercial', 'visualizar_dashboard'),
('comercial', 'visualizar_vendas'), ('comercial', 'editar_vendas'),
('comercial', 'visualizar_formularios'),
('comercial', 'visualizar_atividades'), ('comercial', 'criar_atividades'),
('comercial', 'visualizar_pipeline'), ('comercial', 'mover_oportunidades'), ('comercial', 'fechar_vendas'),
('comercial', 'visualizar_clientes'),
('comercial', 'enviar_mensagem'),
-- Administrativo
('administrativo', 'visualizar_dashboard'),
('administrativo', 'visualizar_vendas'), ('administrativo', 'editar_vendas'),
('administrativo', 'visualizar_formularios'), ('administrativo', 'criar_formularios'), ('administrativo', 'editar_formularios'),
('administrativo', 'visualizar_atividades'), ('administrativo', 'criar_atividades'),
('administrativo', 'visualizar_documentos'), ('administrativo', 'enviar_documentos'),
('administrativo', 'visualizar_clientes'), ('administrativo', 'editar_clientes'),
('administrativo', 'criar_usuario'), ('administrativo', 'editar_usuario'),
-- Financeiro
('financeiro', 'visualizar_dashboard'),
('financeiro', 'visualizar_financeiro'), ('financeiro', 'editar_financeiro'), ('financeiro', 'acessar_boletos'),
('financeiro', 'visualizar_contratos'),
('financeiro', 'visualizar_clientes'),
('financeiro', 'visualizar_relatorios'), ('financeiro', 'exportar_relatorios'),
('financeiro', 'visualizar_documentos'),
-- Leitura
('leitura', 'visualizar_dashboard');
