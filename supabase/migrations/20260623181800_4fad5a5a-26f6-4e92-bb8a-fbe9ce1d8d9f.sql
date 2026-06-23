
CREATE TABLE public.whatsapp_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  initiated_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  call_type TEXT NOT NULL CHECK (call_type IN ('outgoing','incoming')),
  status TEXT NOT NULL DEFAULT 'initiated',
  rejection_reason TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INT,
  uazapi_call_id TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_whatsapp_calls_contact_id ON public.whatsapp_calls(contact_id);
CREATE INDEX idx_whatsapp_calls_company_id ON public.whatsapp_calls(company_id);
CREATE INDEX idx_whatsapp_calls_workspace_id ON public.whatsapp_calls(workspace_id);
CREATE INDEX idx_whatsapp_calls_user_id ON public.whatsapp_calls(initiated_by_user_id);
CREATE INDEX idx_whatsapp_calls_created_at ON public.whatsapp_calls(created_at DESC);
CREATE INDEX idx_whatsapp_calls_status ON public.whatsapp_calls(status);

GRANT SELECT, UPDATE ON public.whatsapp_calls TO authenticated;
GRANT ALL ON public.whatsapp_calls TO service_role;

ALTER TABLE public.whatsapp_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own or admin sees all"
  ON public.whatsapp_calls FOR SELECT
  TO authenticated
  USING (
    initiated_by_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'master'::app_role)
    OR (
      (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'ceo'::app_role))
      AND company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users update own or admin updates all"
  ON public.whatsapp_calls FOR UPDATE
  TO authenticated
  USING (
    initiated_by_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'master'::app_role)
    OR (
      (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'ceo'::app_role))
      AND company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE TRIGGER update_whatsapp_calls_updated_at
  BEFORE UPDATE ON public.whatsapp_calls
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.register_whatsapp_call(
  p_contact_id UUID,
  p_company_id UUID,
  p_workspace_id UUID,
  p_user_id UUID,
  p_phone TEXT,
  p_name TEXT,
  p_call_type TEXT,
  p_uazapi_call_id TEXT DEFAULT NULL
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
    contact_id, company_id, workspace_id, initiated_by_user_id,
    contact_phone, contact_name, call_type, uazapi_call_id, status
  ) VALUES (
    p_contact_id, p_company_id, p_workspace_id, p_user_id,
    p_phone, p_name, p_call_type, p_uazapi_call_id, 'initiated'
  )
  RETURNING id INTO v_call_id;
  RETURN v_call_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_whatsapp_call_status(
  p_call_id UUID,
  p_status TEXT,
  p_duration_seconds INT DEFAULT NULL,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.whatsapp_calls
  SET
    status = p_status,
    duration_seconds = COALESCE(p_duration_seconds, duration_seconds),
    rejection_reason = COALESCE(p_rejection_reason, rejection_reason),
    started_at = CASE WHEN p_status = 'active' AND started_at IS NULL THEN now() ELSE started_at END,
    ended_at = CASE WHEN p_status IN ('ended','rejected','missed') AND ended_at IS NULL THEN now() ELSE ended_at END
  WHERE id = p_call_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_whatsapp_call(UUID,UUID,UUID,UUID,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_whatsapp_call(UUID,UUID,UUID,UUID,TEXT,TEXT,TEXT,TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.update_whatsapp_call_status(UUID,TEXT,INT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_whatsapp_call_status(UUID,TEXT,INT,TEXT) TO service_role, authenticated;
