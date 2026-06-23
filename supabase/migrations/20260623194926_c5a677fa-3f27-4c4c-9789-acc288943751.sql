
-- ============================================
-- tenant_departments
-- ============================================
CREATE TABLE IF NOT EXISTS public.tenant_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  icon text DEFAULT '🏪',
  color text DEFAULT '#6366f1',
  routing_method text NOT NULL DEFAULT 'load-balanced' CHECK (routing_method IN ('load-balanced','random','manual')),
  auto_response_message text,
  position int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);
CREATE INDEX IF NOT EXISTS idx_tenant_departments_tenant ON public.tenant_departments(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_departments TO authenticated;
GRANT ALL ON public.tenant_departments TO service_role;

ALTER TABLE public.tenant_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members see tenant departments"
  ON public.tenant_departments FOR SELECT TO authenticated
  USING (
    public.is_master(auth.uid())
    OR tenant_id = public.get_user_company_id(auth.uid())
  );

CREATE POLICY "Admins manage tenant departments"
  ON public.tenant_departments FOR ALL TO authenticated
  USING (
    public.is_master(auth.uid())
    OR (
      tenant_id = public.get_user_company_id(auth.uid())
      AND (public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  )
  WITH CHECK (
    public.is_master(auth.uid())
    OR (
      tenant_id = public.get_user_company_id(auth.uid())
      AND (public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE TRIGGER trg_tenant_departments_updated_at
  BEFORE UPDATE ON public.tenant_departments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- user_departments
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES public.tenant_departments(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  priority int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, department_id)
);
CREATE INDEX IF NOT EXISTS idx_user_departments_user ON public.user_departments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_departments_dept ON public.user_departments(department_id);
CREATE INDEX IF NOT EXISTS idx_user_departments_tenant ON public.user_departments(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_departments TO authenticated;
GRANT ALL ON public.user_departments TO service_role;

ALTER TABLE public.user_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members see tenant user_departments"
  ON public.user_departments FOR SELECT TO authenticated
  USING (
    public.is_master(auth.uid())
    OR tenant_id = public.get_user_company_id(auth.uid())
  );

CREATE POLICY "Admins manage user_departments"
  ON public.user_departments FOR ALL TO authenticated
  USING (
    public.is_master(auth.uid())
    OR (
      tenant_id = public.get_user_company_id(auth.uid())
      AND (public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  )
  WITH CHECK (
    public.is_master(auth.uid())
    OR (
      tenant_id = public.get_user_company_id(auth.uid())
      AND (public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- ============================================
-- department_routing_config
-- ============================================
CREATE TABLE IF NOT EXISTS public.department_routing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT false,
  welcome_message text NOT NULL DEFAULT 'Olá! 👋 Bem-vindo!
Para ser atendido, digite o número do departamento desejado:

1 - Vendas
2 - Suporte
3 - Financeiro
4 - Canais',
  first_response_message text NOT NULL DEFAULT 'Obrigado por escolher {department}! Um de nossos especialistas atenderá você em breve. 📞',
  timeout_minutes int NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_routing_config_tenant ON public.department_routing_config(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.department_routing_config TO authenticated;
GRANT ALL ON public.department_routing_config TO service_role;

ALTER TABLE public.department_routing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read routing config"
  ON public.department_routing_config FOR SELECT TO authenticated
  USING (
    public.is_master(auth.uid())
    OR tenant_id = public.get_user_company_id(auth.uid())
  );

CREATE POLICY "Admins manage routing config"
  ON public.department_routing_config FOR ALL TO authenticated
  USING (
    public.is_master(auth.uid())
    OR (
      tenant_id = public.get_user_company_id(auth.uid())
      AND (public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  )
  WITH CHECK (
    public.is_master(auth.uid())
    OR (
      tenant_id = public.get_user_company_id(auth.uid())
      AND (public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE TRIGGER trg_department_routing_config_updated_at
  BEFORE UPDATE ON public.department_routing_config
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- department_routing_log
-- ============================================
CREATE TABLE IF NOT EXISTS public.department_routing_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
  selected_option text,
  selected_department_id uuid REFERENCES public.tenant_departments(id) ON DELETE SET NULL,
  routed_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  routing_method text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_routing_log_contact ON public.department_routing_log(contact_id);
CREATE INDEX IF NOT EXISTS idx_routing_log_dept ON public.department_routing_log(selected_department_id);
CREATE INDEX IF NOT EXISTS idx_routing_log_tenant ON public.department_routing_log(tenant_id);

GRANT SELECT ON public.department_routing_log TO authenticated;
GRANT ALL ON public.department_routing_log TO service_role;

ALTER TABLE public.department_routing_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view routing log"
  ON public.department_routing_log FOR SELECT TO authenticated
  USING (
    public.is_master(auth.uid())
    OR (
      tenant_id = public.get_user_company_id(auth.uid())
      AND (public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- ============================================
-- whatsapp_contacts: department tracking
-- ============================================
ALTER TABLE public.whatsapp_contacts
  ADD COLUMN IF NOT EXISTS routed_by_department boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.tenant_departments(id) ON DELETE SET NULL;

-- ============================================
-- RPC: route_by_department
-- ============================================
CREATE OR REPLACE FUNCTION public.route_by_department(
  p_contact_id uuid,
  p_tenant_id uuid,
  p_department_id uuid,
  p_selected_option text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assigned_user_id uuid;
  v_users uuid[];
  v_routing_method text;
BEGIN
  SELECT routing_method INTO v_routing_method
  FROM public.tenant_departments
  WHERE id = p_department_id AND tenant_id = p_tenant_id;

  IF v_routing_method IS NULL THEN
    RAISE EXCEPTION 'Department not found';
  END IF;

  SELECT array_agg(DISTINCT ud.user_id)
  INTO v_users
  FROM public.user_departments ud
  WHERE ud.department_id = p_department_id
    AND ud.is_active = true;

  IF v_users IS NULL OR array_length(v_users, 1) = 0 THEN
    RAISE EXCEPTION 'No active users in this department';
  END IF;

  IF v_routing_method = 'load-balanced' THEN
    SELECT u INTO v_assigned_user_id
    FROM unnest(v_users) AS u
    LEFT JOIN public.whatsapp_contacts wc
      ON wc.assigned_to = u
     AND wc.department_id = p_department_id
    GROUP BY u
    ORDER BY count(wc.id) ASC
    LIMIT 1;
  ELSIF v_routing_method = 'random' THEN
    v_assigned_user_id := v_users[floor(random() * array_length(v_users, 1))::int + 1];
  ELSE
    v_assigned_user_id := v_users[1];
  END IF;

  UPDATE public.whatsapp_contacts
  SET assigned_to = v_assigned_user_id,
      department_id = p_department_id,
      routed_by_department = true,
      updated_at = now()
  WHERE id = p_contact_id;

  INSERT INTO public.department_routing_log (
    tenant_id, contact_id, selected_option, selected_department_id,
    routed_to_user_id, routing_method, reason
  ) VALUES (
    p_tenant_id, p_contact_id, p_selected_option, p_department_id,
    v_assigned_user_id, v_routing_method, 'client_selection'
  );

  RETURN v_assigned_user_id;
END;
$$;
