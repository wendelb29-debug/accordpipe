ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS can_create_child_tenants boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_edit_child_tenants boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_suspend_child_tenants boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_reactivate_child_tenants boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_view_child_billing boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_create_test_tenants boolean NOT NULL DEFAULT false;

UPDATE public.companies
SET
  can_create_child_tenants = COALESCE(can_create_tenants, false),
  can_edit_child_tenants = COALESCE(can_manage_child_tenants, false),
  can_suspend_child_tenants = COALESCE(can_manage_child_tenants, false),
  can_reactivate_child_tenants = COALESCE(can_manage_child_tenants, false),
  can_view_child_billing = CASE WHEN is_reseller = true AND reseller_panel_enabled = true THEN true ELSE false END,
  can_create_test_tenants = false;

CREATE OR REPLACE FUNCTION public.is_active_master_tenant(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = _company_id
      AND c.servidor_id IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_enabled_reseller()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = public.get_user_company_id(auth.uid())
      AND c.is_reseller = true
      AND c.reseller_panel_enabled = true
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_create_child_tenants()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = public.get_user_company_id(auth.uid())
      AND c.is_reseller = true
      AND c.reseller_panel_enabled = true
      AND c.can_create_child_tenants = true
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_manage_child_tenants()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = public.get_user_company_id(auth.uid())
      AND c.is_reseller = true
      AND c.reseller_panel_enabled = true
      AND c.can_edit_child_tenants = true
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_suspend_child_tenants()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = public.get_user_company_id(auth.uid())
      AND c.is_reseller = true
      AND c.reseller_panel_enabled = true
      AND c.can_suspend_child_tenants = true
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_reactivate_child_tenants()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = public.get_user_company_id(auth.uid())
      AND c.is_reseller = true
      AND c.reseller_panel_enabled = true
      AND c.can_reactivate_child_tenants = true
  );
$$;

CREATE OR REPLACE FUNCTION public.log_tenant_security_event(_action text, _target_id uuid, _details jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _user_name text;
BEGIN
  IF _actor IS NULL THEN
    RETURN;
  END IF;

  SELECT p.email INTO _user_name
  FROM public.profiles p
  WHERE p.user_id = _actor
  LIMIT 1;

  INSERT INTO public.audit_logs (user_id, user_name, action, target_type, target_id, details)
  VALUES (_actor, _user_name, _action, 'company', _target_id, COALESCE(_details, '{}'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_company_reseller_governance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _actor_company_id uuid := public.get_user_company_id(_actor);
BEGIN
  IF _actor IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória.' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF public.is_master(_actor) THEN
      NEW.is_reseller := false;
      NEW.reseller_panel_enabled := false;
      NEW.can_create_tenants := false;
      NEW.can_manage_child_tenants := false;
      NEW.can_create_child_tenants := false;
      NEW.can_edit_child_tenants := false;
      NEW.can_suspend_child_tenants := false;
      NEW.can_reactivate_child_tenants := false;
      NEW.can_view_child_billing := false;
      NEW.can_create_test_tenants := false;
      NEW.tenant_type := 'standard';
      RETURN NEW;
    END IF;

    IF NOT public.current_user_can_create_child_tenants() THEN
      PERFORM public.log_tenant_security_event(
        'blocked_child_tenant_create_attempt',
        NEW.id,
        jsonb_build_object('reason', 'missing_reseller_permission', 'parent_tenant_id', NEW.parent_tenant_id, 'created_by_tenant_id', NEW.created_by_tenant_id)
      );
      RAISE EXCEPTION 'Apenas o Tenant Master ou revendedores habilitados podem criar tenants.' USING ERRCODE = '42501';
    END IF;

    IF NEW.parent_tenant_id IS DISTINCT FROM _actor_company_id
       OR NEW.created_by_tenant_id IS DISTINCT FROM _actor_company_id THEN
      PERFORM public.log_tenant_security_event(
        'blocked_child_tenant_create_attempt',
        NEW.id,
        jsonb_build_object('reason', 'invalid_hierarchy', 'expected_parent', _actor_company_id, 'received_parent', NEW.parent_tenant_id, 'received_creator', NEW.created_by_tenant_id)
      );
      RAISE EXCEPTION 'Revendedores só podem criar tenants filhos próprios.' USING ERRCODE = '42501';
    END IF;

    IF COALESCE(NEW.is_reseller, false)
       OR COALESCE(NEW.reseller_panel_enabled, false)
       OR COALESCE(NEW.can_create_tenants, false)
       OR COALESCE(NEW.can_manage_child_tenants, false)
       OR COALESCE(NEW.can_create_child_tenants, false)
       OR COALESCE(NEW.can_edit_child_tenants, false)
       OR COALESCE(NEW.can_suspend_child_tenants, false)
       OR COALESCE(NEW.can_reactivate_child_tenants, false)
       OR COALESCE(NEW.can_view_child_billing, false)
       OR COALESCE(NEW.can_create_test_tenants, false)
       OR COALESCE(NEW.tenant_type, 'standard') <> 'standard' THEN
      PERFORM public.log_tenant_security_event(
        'blocked_child_tenant_create_attempt',
        NEW.id,
        jsonb_build_object('reason', 'attempted_reseller_promotion_on_create')
      );
      RAISE EXCEPTION 'Tenants criados por revenda devem nascer como tenant comum.' USING ERRCODE = '42501';
    END IF;

    NEW.is_reseller := false;
    NEW.reseller_panel_enabled := false;
    NEW.can_create_tenants := false;
    NEW.can_manage_child_tenants := false;
    NEW.can_create_child_tenants := false;
    NEW.can_edit_child_tenants := false;
    NEW.can_suspend_child_tenants := false;
    NEW.can_reactivate_child_tenants := false;
    NEW.can_view_child_billing := false;
    NEW.can_create_test_tenants := false;
    NEW.tenant_type := 'standard';
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF public.is_master(_actor) THEN
      RETURN NEW;
    END IF;

    IF NOT public.user_is_reseller_of(OLD.id) OR NOT public.current_user_can_manage_child_tenants() THEN
      PERFORM public.log_tenant_security_event(
        'blocked_global_tenant_management_attempt',
        OLD.id,
        jsonb_build_object('reason', 'missing_child_management_permission')
      );
      RAISE EXCEPTION 'Acesso negado à gestão de tenants.' USING ERRCODE = '42501';
    END IF;

    IF NEW.parent_tenant_id IS DISTINCT FROM OLD.parent_tenant_id
       OR NEW.created_by_tenant_id IS DISTINCT FROM OLD.created_by_tenant_id
       OR NEW.is_reseller IS DISTINCT FROM OLD.is_reseller
       OR NEW.reseller_panel_enabled IS DISTINCT FROM OLD.reseller_panel_enabled
       OR NEW.can_create_tenants IS DISTINCT FROM OLD.can_create_tenants
       OR NEW.can_manage_child_tenants IS DISTINCT FROM OLD.can_manage_child_tenants
       OR NEW.can_create_child_tenants IS DISTINCT FROM OLD.can_create_child_tenants
       OR NEW.can_edit_child_tenants IS DISTINCT FROM OLD.can_edit_child_tenants
       OR NEW.can_suspend_child_tenants IS DISTINCT FROM OLD.can_suspend_child_tenants
       OR NEW.can_reactivate_child_tenants IS DISTINCT FROM OLD.can_reactivate_child_tenants
       OR NEW.can_view_child_billing IS DISTINCT FROM OLD.can_view_child_billing
       OR NEW.can_create_test_tenants IS DISTINCT FROM OLD.can_create_test_tenants
       OR COALESCE(NEW.tenant_type, 'standard') IS DISTINCT FROM COALESCE(OLD.tenant_type, 'standard') THEN
      PERFORM public.log_tenant_security_event(
        'blocked_reseller_settings_access',
        OLD.id,
        jsonb_build_object('reason', 'structural_reseller_fields_are_master_only')
      );
      RAISE EXCEPTION 'A configuração estrutural de revenda só pode ser alterada pelo Tenant Master.' USING ERRCODE = '42501';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF OLD.status = 'active' AND NEW.status <> 'active' AND NOT public.current_user_can_suspend_child_tenants() THEN
        PERFORM public.log_tenant_security_event(
          'blocked_child_tenant_suspend_attempt',
          OLD.id,
          jsonb_build_object('from_status', OLD.status, 'to_status', NEW.status)
        );
        RAISE EXCEPTION 'Você não tem permissão para suspender tenants filhos.' USING ERRCODE = '42501';
      END IF;

      IF OLD.status <> 'active' AND NEW.status = 'active' AND NOT public.current_user_can_reactivate_child_tenants() THEN
        PERFORM public.log_tenant_security_event(
          'blocked_child_tenant_reactivate_attempt',
          OLD.id,
          jsonb_build_object('from_status', OLD.status, 'to_status', NEW.status)
        );
        RAISE EXCEPTION 'Você não tem permissão para reativar tenants filhos.' USING ERRCODE = '42501';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_company_reseller_governance_trigger ON public.companies;
CREATE TRIGGER enforce_company_reseller_governance_trigger
BEFORE INSERT OR UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.enforce_company_reseller_governance();

DROP POLICY IF EXISTS "Admin/operador can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Admin/operador can update companies" ON public.companies;
DROP POLICY IF EXISTS "Resellers can update child tenants" ON public.companies;

CREATE POLICY "Master or enabled resellers can insert companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_master(auth.uid())
  OR (
    public.current_user_can_create_child_tenants()
    AND parent_tenant_id = public.get_user_company_id(auth.uid())
    AND created_by_tenant_id = public.get_user_company_id(auth.uid())
    AND COALESCE(is_reseller, false) = false
    AND COALESCE(reseller_panel_enabled, false) = false
    AND COALESCE(can_create_tenants, false) = false
    AND COALESCE(can_manage_child_tenants, false) = false
    AND COALESCE(can_create_child_tenants, false) = false
    AND COALESCE(can_edit_child_tenants, false) = false
    AND COALESCE(can_suspend_child_tenants, false) = false
    AND COALESCE(can_reactivate_child_tenants, false) = false
    AND COALESCE(can_view_child_billing, false) = false
    AND COALESCE(can_create_test_tenants, false) = false
    AND COALESCE(tenant_type, 'standard') = 'standard'
  )
);

CREATE POLICY "Master or authorized resellers can update companies"
ON public.companies
FOR UPDATE
TO authenticated
USING (
  public.is_master(auth.uid())
  OR (
    public.user_is_reseller_of(id)
    AND public.current_user_can_manage_child_tenants()
  )
)
WITH CHECK (
  public.is_master(auth.uid())
  OR (
    public.user_is_reseller_of(id)
    AND public.current_user_can_manage_child_tenants()
  )
);

DROP POLICY IF EXISTS "Authenticated can insert" ON public.tenant_setup_requests;
DROP POLICY IF EXISTS "Authenticated can delete setup requests" ON public.tenant_setup_requests;

CREATE POLICY "Master or enabled resellers can create setup requests"
ON public.tenant_setup_requests
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_master(auth.uid())
  OR public.current_user_can_create_child_tenants()
);

CREATE POLICY "Master or owner reseller can delete setup requests"
ON public.tenant_setup_requests
FOR DELETE
TO authenticated
USING (
  public.is_master(auth.uid())
  OR (created_by = auth.uid() AND public.current_user_can_create_child_tenants())
);