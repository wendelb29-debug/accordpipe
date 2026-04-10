
-- Expand fintech_integrations with more credential fields
ALTER TABLE public.fintech_integrations 
  ADD COLUMN IF NOT EXISTS base_url text,
  ADD COLUMN IF NOT EXISTS client_id text,
  ADD COLUMN IF NOT EXISTS client_secret_encrypted text,
  ADD COLUMN IF NOT EXISTS client_secret_masked text,
  ADD COLUMN IF NOT EXISTS origin_key_encrypted text,
  ADD COLUMN IF NOT EXISTS origin_key_masked text,
  ADD COLUMN IF NOT EXISTS public_key text;

-- Expand fintech_webhook_logs with direction and payload details
ALTER TABLE public.fintech_webhook_logs
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'inbound',
  ADD COLUMN IF NOT EXISTS endpoint text,
  ADD COLUMN IF NOT EXISTS request_payload jsonb,
  ADD COLUMN IF NOT EXISTS response_payload jsonb,
  ADD COLUMN IF NOT EXISTS status_code integer;

-- Create integration_actions table for automation rules
CREATE TABLE public.integration_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  servidor_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  integration_id uuid NOT NULL REFERENCES public.fintech_integrations(id) ON DELETE CASCADE,
  trigger_event text NOT NULL,
  action_type text NOT NULL DEFAULT 'http_post',
  endpoint_override text,
  field_mapping jsonb DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant integration_actions"
  ON public.integration_actions FOR SELECT TO authenticated
  USING (servidor_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert their tenant integration_actions"
  ON public.integration_actions FOR INSERT TO authenticated
  WITH CHECK (servidor_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update their tenant integration_actions"
  ON public.integration_actions FOR UPDATE TO authenticated
  USING (servidor_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete their tenant integration_actions"
  ON public.integration_actions FOR DELETE TO authenticated
  USING (servidor_id = public.get_user_company_id(auth.uid()));

CREATE TRIGGER update_integration_actions_updated_at
  BEFORE UPDATE ON public.integration_actions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
