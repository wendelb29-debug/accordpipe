
CREATE OR REPLACE FUNCTION public.set_updated_at_now()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE IF NOT EXISTS public.email_suppression_list (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  email TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('hard_bounce','complaint','unsubscribe','manual','soft_bounce_repeated')),
  source TEXT,
  external_message_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS email_suppression_list_tenant_email_key
  ON public.email_suppression_list (COALESCE(tenant_id::text,'GLOBAL'), lower(email));

CREATE INDEX IF NOT EXISTS email_suppression_list_email_idx
  ON public.email_suppression_list (lower(email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_suppression_list TO authenticated;
GRANT ALL ON public.email_suppression_list TO service_role;

ALTER TABLE public.email_suppression_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant members can view suppression"
  ON public.email_suppression_list FOR SELECT TO authenticated
  USING (
    tenant_id IS NULL OR EXISTS (
      SELECT 1 FROM public.user_tenants ut
      WHERE ut.user_id = auth.uid() AND ut.tenant_id = email_suppression_list.tenant_id
    )
  );

CREATE POLICY "tenant admins can manage suppression"
  ON public.email_suppression_list FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_id = email_suppression_list.tenant_id
      AND ut.role IN ('admin','ceo','master')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_id = email_suppression_list.tenant_id
      AND ut.role IN ('admin','ceo','master')
  ));

CREATE TRIGGER update_email_suppression_list_updated_at
  BEFORE UPDATE ON public.email_suppression_list
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();
