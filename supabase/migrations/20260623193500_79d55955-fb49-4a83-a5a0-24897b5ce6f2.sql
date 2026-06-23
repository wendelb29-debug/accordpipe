
CREATE TABLE IF NOT EXISTS public.whatsapp_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  presence_type TEXT NOT NULL CHECK (presence_type IN ('typing','recording','paused')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, contact_id, presence_type)
);

CREATE INDEX IF NOT EXISTS idx_presence_contact ON public.whatsapp_presence(contact_id, presence_type);
CREATE INDEX IF NOT EXISTS idx_presence_user ON public.whatsapp_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_presence_last_updated ON public.whatsapp_presence(last_updated);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_presence TO authenticated;
GRANT ALL ON public.whatsapp_presence TO service_role;

ALTER TABLE public.whatsapp_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view presence"
  ON public.whatsapp_presence FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid())
    OR tenant_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users insert their own presence"
  ON public.whatsapp_presence FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update their own presence"
  ON public.whatsapp_presence FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users delete their own presence"
  ON public.whatsapp_presence FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_presence;
ALTER TABLE public.whatsapp_presence REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION public.update_presence(
  p_user_id UUID,
  p_contact_id UUID,
  p_tenant_id UUID,
  p_presence_type TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  INSERT INTO public.whatsapp_presence (user_id, contact_id, tenant_id, presence_type)
  VALUES (p_user_id, p_contact_id, p_tenant_id, p_presence_type)
  ON CONFLICT (user_id, contact_id, presence_type)
  DO UPDATE SET last_updated = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_presence(
  p_user_id UUID,
  p_contact_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  DELETE FROM public.whatsapp_presence
  WHERE user_id = p_user_id AND contact_id = p_contact_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_presence() RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.whatsapp_presence
  WHERE now() - last_updated > interval '5 minutes';
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_presence(UUID, UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_presence(UUID, UUID) TO authenticated;
