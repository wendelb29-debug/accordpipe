
-- 1) Tighten RLS policies that used USING (true) / WITH CHECK (true)

-- paddle_subscriptions: only service_role manages
DROP POLICY IF EXISTS "Service role manages subscriptions" ON public.paddle_subscriptions;
CREATE POLICY "Service role manages subscriptions"
ON public.paddle_subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- system_error_logs: only authenticated users may insert
DROP POLICY IF EXISTS "Anyone can insert error logs" ON public.system_error_logs;
CREATE POLICY "Authenticated can insert error logs"
ON public.system_error_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- tenant_asaas_webhook_events: only service_role may insert
DROP POLICY IF EXISTS "Service can insert webhook events" ON public.tenant_asaas_webhook_events;
CREATE POLICY "Service can insert webhook events"
ON public.tenant_asaas_webhook_events
FOR INSERT
TO service_role
WITH CHECK (true);

-- tenant_contract_sequences: only service_role full access
DROP POLICY IF EXISTS "Service access for tenant sequences" ON public.tenant_contract_sequences;
CREATE POLICY "Service access for tenant sequences"
ON public.tenant_contract_sequences
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 2) Set search_path on email queue helper functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
