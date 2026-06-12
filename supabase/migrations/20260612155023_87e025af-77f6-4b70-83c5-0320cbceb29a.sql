-- 1.1 Expand audit_logs SELECT to include admin role
DROP POLICY IF EXISTS "CEO and Master can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Gestao can view audit logs" ON public.audit_logs;

CREATE POLICY "Gestao can view audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_master = true)
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin'::app_role, 'ceo'::app_role, 'master'::app_role)
  )
);

-- 1.2 Immutability — deny UPDATE and DELETE
DROP POLICY IF EXISTS "audit_logs_no_update" ON public.audit_logs;
CREATE POLICY "audit_logs_no_update" ON public.audit_logs
FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS "audit_logs_no_delete" ON public.audit_logs;
CREATE POLICY "audit_logs_no_delete" ON public.audit_logs
FOR DELETE TO authenticated USING (false);

-- 1.3 Indexes for fast jsonb filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_page_path
  ON public.audit_logs ((details->>'page_path'));

CREATE INDEX IF NOT EXISTS idx_audit_logs_details_gin
  ON public.audit_logs USING GIN (details);

CREATE INDEX IF NOT EXISTS idx_audit_logs_servidor_created
  ON public.audit_logs (servidor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON public.audit_logs (action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
  ON public.audit_logs (user_id);
