
-- Tabela de auditoria de acesso cross-tenant de super-admin (master global)
CREATE TABLE IF NOT EXISTS public.platform_admin_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  accessed_tenant_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paal_user ON public.platform_admin_access_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_paal_tenant ON public.platform_admin_access_log(accessed_tenant_id, created_at DESC);

GRANT SELECT, INSERT ON public.platform_admin_access_log TO authenticated;
GRANT ALL ON public.platform_admin_access_log TO service_role;

ALTER TABLE public.platform_admin_access_log ENABLE ROW LEVEL SECURITY;

-- Apenas super-admins podem ler o log
DROP POLICY IF EXISTS "platform_admins can view access log" ON public.platform_admin_access_log;
CREATE POLICY "platform_admins can view access log"
  ON public.platform_admin_access_log
  FOR SELECT
  TO authenticated
  USING (public.is_master(auth.uid()));

-- Apenas super-admins podem inserir (e só sobre si mesmos)
DROP POLICY IF EXISTS "platform_admins can insert own access log" ON public.platform_admin_access_log;
CREATE POLICY "platform_admins can insert own access log"
  ON public.platform_admin_access_log
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_master(auth.uid()) AND user_id = auth.uid());

-- Imutável: bloqueia UPDATE/DELETE via trigger (mesmo pra service_role via API)
CREATE OR REPLACE FUNCTION public.platform_admin_access_log_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'platform_admin_access_log é append-only: operação % negada', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

DROP TRIGGER IF EXISTS trg_paal_no_update ON public.platform_admin_access_log;
CREATE TRIGGER trg_paal_no_update
  BEFORE UPDATE OR DELETE ON public.platform_admin_access_log
  FOR EACH ROW EXECUTE FUNCTION public.platform_admin_access_log_immutable();

-- Helper para gravar acesso cross-tenant (usado por RPC/edge functions no futuro)
CREATE OR REPLACE FUNCTION public.log_platform_admin_access(
  _tenant_id uuid,
  _action text,
  _target_type text DEFAULT NULL,
  _target_id text DEFAULT NULL,
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _id uuid;
  _own uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_master(_uid) THEN
    RAISE EXCEPTION 'only platform super-admins can log cross-tenant access' USING ERRCODE = '42501';
  END IF;

  _own := public.get_user_company_id(_uid);
  -- Só faz sentido logar se o tenant acessado for diferente do próprio
  IF _tenant_id IS NULL OR _tenant_id = _own THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.platform_admin_access_log (
    user_id, accessed_tenant_id, action, target_type, target_id, details
  ) VALUES (
    _uid, _tenant_id, _action, _target_type, _target_id, COALESCE(_details, '{}'::jsonb)
  )
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_platform_admin_access(uuid, text, text, text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.log_platform_admin_access(uuid, text, text, text, jsonb) TO authenticated;
