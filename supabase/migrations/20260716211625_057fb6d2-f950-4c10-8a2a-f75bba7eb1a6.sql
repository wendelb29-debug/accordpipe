
-- ============================================================
-- ONDA 1 — Auditoria: extensão de audit_logs + tabelas auxiliares
-- ============================================================

-- 1) Extender audit_logs com novos campos (todos opcionais)
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS actor_type text,
  ADD COLUMN IF NOT EXISTS agent_id uuid,
  ADD COLUMN IF NOT EXISTS module text,
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS severity text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS conversation_id uuid,
  ADD COLUMN IF NOT EXISTS contact_id uuid,
  ADD COLUMN IF NOT EXISTS channel_id uuid,
  ADD COLUMN IF NOT EXISTS team_id uuid,
  ADD COLUMN IF NOT EXISTS automation_id uuid,
  ADD COLUMN IF NOT EXISTS resource_id uuid,
  ADD COLUMN IF NOT EXISTS integration_id uuid,
  ADD COLUMN IF NOT EXISTS request_id text,
  ADD COLUMN IF NOT EXISTS trace_id text,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS duration_ms integer,
  ADD COLUMN IF NOT EXISTS error_code text,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS ip_address_masked text,
  ADD COLUMN IF NOT EXISTS device_type text,
  ADD COLUMN IF NOT EXISTS browser text,
  ADD COLUMN IF NOT EXISTS app_version text,
  ADD COLUMN IF NOT EXISTS environment text;

-- 2) Índices adicionais
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type    ON public.audit_logs (event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module        ON public.audit_logs (module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status        ON public.audit_logs (status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_agent         ON public.audit_logs (agent_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity        ON public.audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_conversation  ON public.audit_logs (conversation_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_contact       ON public.audit_logs (contact_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_trace         ON public.audit_logs (trace_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_type    ON public.audit_logs (actor_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_source        ON public.audit_logs (source);

-- 3) Trigger de imutabilidade (append-only)
CREATE OR REPLACE FUNCTION public.audit_logs_prevent_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only: % operation is not allowed', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

DROP TRIGGER IF EXISTS audit_logs_no_update_trg ON public.audit_logs;
CREATE TRIGGER audit_logs_no_update_trg
  BEFORE UPDATE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_logs_prevent_mutation();

DROP TRIGGER IF EXISTS audit_logs_no_delete_trg ON public.audit_logs;
CREATE TRIGGER audit_logs_no_delete_trg
  BEFORE DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_logs_prevent_mutation();

-- 4) audit_log_changes ----------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log_changes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_log_id  uuid NOT NULL REFERENCES public.audit_logs(id) ON DELETE CASCADE,
  field_name    text NOT NULL,
  field_label   text,
  old_value     jsonb,
  new_value     jsonb,
  change_type   text NOT NULL DEFAULT 'modified',
  is_sensitive  boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_log_changes TO authenticated;
GRANT ALL    ON public.audit_log_changes TO service_role;

ALTER TABLE public.audit_log_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_changes_select_by_parent"
  ON public.audit_log_changes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_logs al
      WHERE al.id = audit_log_changes.audit_log_id
        AND (
          is_master(auth.uid())
          OR (al.servidor_id = get_user_company_id(auth.uid())
              AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role)))
        )
    )
  );

CREATE INDEX IF NOT EXISTS idx_audit_log_changes_log ON public.audit_log_changes (audit_log_id);

-- 5) audit_log_steps ------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log_steps (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_log_id  uuid NOT NULL REFERENCES public.audit_logs(id) ON DELETE CASCADE,
  step_order    integer NOT NULL DEFAULT 0,
  step_name     text NOT NULL,
  status        text NOT NULL DEFAULT 'success',
  started_at    timestamptz,
  completed_at  timestamptz,
  duration_ms   integer,
  input_data    jsonb,
  output_data   jsonb,
  error_message text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_log_steps TO authenticated;
GRANT ALL    ON public.audit_log_steps TO service_role;

ALTER TABLE public.audit_log_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_steps_select_by_parent"
  ON public.audit_log_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_logs al
      WHERE al.id = audit_log_steps.audit_log_id
        AND (
          is_master(auth.uid())
          OR (al.servidor_id = get_user_company_id(auth.uid())
              AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role)))
        )
    )
  );

CREATE INDEX IF NOT EXISTS idx_audit_log_steps_log ON public.audit_log_steps (audit_log_id, step_order);

-- 6) audit_log_exports ----------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log_exports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servidor_id  uuid,
  exported_by  uuid NOT NULL,
  format       text NOT NULL,
  scope        text NOT NULL DEFAULT 'filtered',
  filters      jsonb NOT NULL DEFAULT '{}'::jsonb,
  row_count    integer NOT NULL DEFAULT 0,
  file_path    text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_log_exports TO authenticated;
GRANT ALL    ON public.audit_log_exports TO service_role;

ALTER TABLE public.audit_log_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_exports_select_own_tenant"
  ON public.audit_log_exports FOR SELECT
  USING (
    is_master(auth.uid())
    OR (servidor_id = get_user_company_id(auth.uid())
        AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role)))
  );

CREATE INDEX IF NOT EXISTS idx_audit_log_exports_tenant ON public.audit_log_exports (servidor_id, created_at DESC);

-- 7) audit_log_reversions -------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log_reversions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_log_id   uuid NOT NULL REFERENCES public.audit_logs(id) ON DELETE RESTRICT,
  new_log_id        uuid NOT NULL REFERENCES public.audit_logs(id) ON DELETE RESTRICT,
  reverted_by       uuid NOT NULL,
  servidor_id       uuid,
  created_at        timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_log_reversions TO authenticated;
GRANT ALL    ON public.audit_log_reversions TO service_role;

ALTER TABLE public.audit_log_reversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_reversions_select_own_tenant"
  ON public.audit_log_reversions FOR SELECT
  USING (
    is_master(auth.uid())
    OR (servidor_id = get_user_company_id(auth.uid())
        AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role)))
  );

CREATE INDEX IF NOT EXISTS idx_audit_log_reversions_orig ON public.audit_log_reversions (original_log_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_reversions_tenant ON public.audit_log_reversions (servidor_id, created_at DESC);
