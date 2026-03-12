CREATE TABLE public.zapi_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  phone text,
  message_id text,
  payload jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.zapi_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read webhook events"
ON public.zapi_webhook_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert webhook events"
ON public.zapi_webhook_events
FOR INSERT
TO anon
WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.zapi_webhook_events;