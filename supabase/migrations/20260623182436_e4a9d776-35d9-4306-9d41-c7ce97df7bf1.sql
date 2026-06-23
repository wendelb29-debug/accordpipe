
ALTER TABLE public.whatsapp_calls
  ADD COLUMN IF NOT EXISTS caller_name TEXT,
  ADD COLUMN IF NOT EXISTS caller_avatar TEXT,
  ADD COLUMN IF NOT EXISTS answered_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS answered_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_whatsapp_calls_incoming
  ON public.whatsapp_calls(status)
  WHERE call_type = 'incoming' AND status = 'initiated';

CREATE OR REPLACE FUNCTION public.register_incoming_whatsapp_call(
  p_contact_id UUID,
  p_company_id UUID,
  p_workspace_id UUID,
  p_phone TEXT,
  p_caller_name TEXT DEFAULT NULL,
  p_caller_avatar TEXT DEFAULT NULL,
  p_external_call_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_call_id UUID;
BEGIN
  INSERT INTO public.whatsapp_calls (
    contact_id, company_id, workspace_id,
    contact_phone, caller_name, caller_avatar,
    call_type, status, uazapi_call_id
  ) VALUES (
    p_contact_id, p_company_id, p_workspace_id,
    p_phone, p_caller_name, p_caller_avatar,
    'incoming', 'initiated', p_external_call_id
  )
  RETURNING id INTO v_call_id;
  RETURN v_call_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_incoming_whatsapp_call(UUID,UUID,UUID,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_incoming_whatsapp_call(UUID,UUID,UUID,TEXT,TEXT,TEXT,TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.get_call_responder(
  p_contact_id UUID,
  p_workspace_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT assigned_to INTO v_user_id
  FROM public.whatsapp_contacts
  WHERE id = p_contact_id;

  IF v_user_id IS NOT NULL THEN
    RETURN v_user_id;
  END IF;

  IF p_workspace_id IS NOT NULL THEN
    SELECT user_id INTO v_user_id
    FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
    ORDER BY created_at NULLS LAST
    LIMIT 1;
  END IF;

  RETURN v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_call_responder(UUID,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_call_responder(UUID,UUID) TO service_role, authenticated;
