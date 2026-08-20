CREATE OR REPLACE FUNCTION public.enforce_companies_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Platform master may change anything
  IF public.is_master(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Privilege / hierarchy flags: never editable by resellers or tenant admins
  IF NEW.tenant_type IS DISTINCT FROM OLD.tenant_type
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
     OR NEW.parent_tenant_id IS DISTINCT FROM OLD.parent_tenant_id
     OR NEW.created_by_tenant_id IS DISTINCT FROM OLD.created_by_tenant_id
  THEN
    RAISE EXCEPTION 'Alteração de privilégios/hierarquia do tenant é restrita ao master da plataforma';
  END IF;

  -- Integration credentials/webhooks: only editable by users of that same company
  IF NEW.id IS DISTINCT FROM public.get_user_company_id(auth.uid()) THEN
    IF NEW.zapi_instance_id IS DISTINCT FROM OLD.zapi_instance_id
       OR NEW.zapi_token IS DISTINCT FROM OLD.zapi_token
       OR NEW.zapi_client_token IS DISTINCT FROM OLD.zapi_client_token
       OR NEW.webhook_token IS DISTINCT FROM OLD.webhook_token
    THEN
      RAISE EXCEPTION 'Credenciais de integração só podem ser alteradas por administradores do próprio tenant';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_companies_privileged_columns ON public.companies;
CREATE TRIGGER trg_enforce_companies_privileged_columns
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.enforce_companies_privileged_columns();