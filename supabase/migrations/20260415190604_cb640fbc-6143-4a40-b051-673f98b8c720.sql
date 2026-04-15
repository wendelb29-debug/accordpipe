
CREATE TABLE public.system_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  user_id uuid,
  module text NOT NULL,
  action text NOT NULL,
  severity text NOT NULL DEFAULT 'error' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  message text NOT NULL,
  stack_trace text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_system_error_logs_tenant ON public.system_error_logs(tenant_id);
CREATE INDEX idx_system_error_logs_severity ON public.system_error_logs(severity);
CREATE INDEX idx_system_error_logs_created ON public.system_error_logs(created_at DESC);
CREATE INDEX idx_system_error_logs_module ON public.system_error_logs(module);

ALTER TABLE public.system_error_logs ENABLE ROW LEVEL SECURITY;

-- Masters and admins can view logs for their tenant
CREATE POLICY "Masters can view system logs"
  ON public.system_error_logs FOR SELECT
  TO authenticated
  USING (
    public.is_master(auth.uid())
    OR (tenant_id IS NOT NULL AND tenant_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'))
    OR (tenant_id IS NOT NULL AND tenant_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'ceo'))
  );

-- Allow insert from authenticated users and service role
CREATE POLICY "Anyone can insert error logs"
  ON public.system_error_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RPC function for edge functions to log errors (service role)
CREATE OR REPLACE FUNCTION public.log_system_error(
  _module text,
  _action text,
  _message text,
  _severity text DEFAULT 'error',
  _tenant_id uuid DEFAULT NULL,
  _user_id uuid DEFAULT NULL,
  _stack_trace text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.system_error_logs (tenant_id, user_id, module, action, severity, message, stack_trace, metadata)
  VALUES (_tenant_id, _user_id, _module, _action, _severity, _message, _stack_trace, _metadata)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;
