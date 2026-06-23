
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
  v_routing_method text;
BEGIN
  SELECT routing_method INTO v_routing_method
  FROM public.tenant_departments
  WHERE id = p_department_id AND tenant_id = p_tenant_id;

  IF v_routing_method IS NULL THEN
    RAISE EXCEPTION 'Department not found';
  END IF;

  -- Mark contact with the chosen department (but DO NOT lock to a user yet).
  UPDATE public.whatsapp_contacts
  SET department_id = p_department_id,
      routed_by_department = true,
      assigned_to = NULL,
      updated_at = now()
  WHERE id = p_contact_id;

  -- Create / refresh queue status as pending so attendants get notified.
  INSERT INTO public.contact_assignment_status (
    contact_id, tenant_id, department_id, status, assigned_by_system
  ) VALUES (
    p_contact_id, p_tenant_id, p_department_id, 'pending', true
  )
  ON CONFLICT (contact_id) DO UPDATE
    SET department_id = EXCLUDED.department_id,
        tenant_id = EXCLUDED.tenant_id,
        status = 'pending',
        assigned_to_user_id = NULL,
        assumed_at = NULL,
        timeout_auto_release_at = NULL,
        closed_at = NULL,
        created_at = now();

  INSERT INTO public.department_routing_log (
    tenant_id, contact_id, selected_option, selected_department_id,
    routed_to_user_id, routing_method, reason
  ) VALUES (
    p_tenant_id, p_contact_id, p_selected_option, p_department_id,
    NULL, v_routing_method, 'client_selection_queue'
  );

  RETURN NULL::uuid;
END;
$$;
