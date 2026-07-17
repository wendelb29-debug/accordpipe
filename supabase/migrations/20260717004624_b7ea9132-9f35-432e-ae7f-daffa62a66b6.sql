-- 1. operator_status_events
CREATE TABLE public.operator_status_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL, -- login | logout | pause | busy | available | away
  reason TEXT,
  duration_seconds INTEGER,
  delay_seconds INTEGER,
  departments UUID[],
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ose_tenant_started ON public.operator_status_events (tenant_id, started_at DESC);
CREATE INDEX idx_ose_user_started ON public.operator_status_events (user_id, started_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operator_status_events TO authenticated;
GRANT ALL ON public.operator_status_events TO service_role;
ALTER TABLE public.operator_status_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ose_select_tenant_members"
  ON public.operator_status_events FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'master'::app_role)
  );

CREATE POLICY "ose_insert_self_or_admin"
  ON public.operator_status_events FOR INSERT TO authenticated
  WITH CHECK (
    (user_id = auth.uid() AND tenant_id IN (SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()))
    OR public.has_role(auth.uid(), 'master'::app_role)
  );

-- 2. analytics_export_jobs
CREATE TABLE public.analytics_export_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  requested_by UUID NOT NULL,
  report_type TEXT NOT NULL, -- historico_atendimentos | consumo | csat | ctwa | metricas | status_atendentes | auditoria
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  period_start DATE,
  period_end DATE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | processing | ready | error
  file_url TEXT,
  file_path TEXT,
  row_count INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_aej_tenant_created ON public.analytics_export_jobs (tenant_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.analytics_export_jobs TO authenticated;
GRANT ALL ON public.analytics_export_jobs TO service_role;
ALTER TABLE public.analytics_export_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aej_select_tenant"
  ON public.analytics_export_jobs FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'master'::app_role)
  );

CREATE POLICY "aej_insert_self"
  ON public.analytics_export_jobs FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND (
      tenant_id IN (SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid())
      OR public.has_role(auth.uid(), 'master'::app_role)
    )
  );

CREATE POLICY "aej_update_admin"
  ON public.analytics_export_jobs FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'master'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'ceo'::app_role)
    OR requested_by = auth.uid()
  );

CREATE OR REPLACE FUNCTION public.aej_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_aej_updated
  BEFORE UPDATE ON public.analytics_export_jobs
  FOR EACH ROW EXECUTE FUNCTION public.aej_touch_updated_at();