-- 1) Tipo do workspace
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS workspace_type text NOT NULL DEFAULT 'crm';

ALTER TABLE public.workspaces
  DROP CONSTRAINT IF EXISTS workspaces_workspace_type_check;
ALTER TABLE public.workspaces
  ADD CONSTRAINT workspaces_workspace_type_check
  CHECK (workspace_type IN ('crm','sdr','cadastro'));

-- 2) sdr_leads (workspaces.servidor_id == user_tenants.tenant_id)
CREATE TABLE IF NOT EXISTS public.sdr_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  servidor_id uuid NOT NULL,
  owner_id uuid,
  name text NOT NULL,
  company text,
  phone text,
  email text,
  origin text NOT NULL DEFAULT 'cold-call',
  channel text,
  stage text NOT NULL DEFAULT 'novo',
  temperature text,
  disc text,
  notes text,
  qual jsonb NOT NULL DEFAULT '{}'::jsonb,
  sequence_day integer NOT NULL DEFAULT 0,
  last_touch_at timestamptz,
  next_touch_at timestamptz,
  qualified_at timestamptz,
  promoted_lead_id uuid,
  promoted_workspace_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sdr_leads TO authenticated;
GRANT ALL ON public.sdr_leads TO service_role;

ALTER TABLE public.sdr_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sdr_leads tenant access" ON public.sdr_leads;
CREATE POLICY "sdr_leads tenant access"
  ON public.sdr_leads
  FOR ALL
  TO authenticated
  USING (servidor_id IN (SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()))
  WITH CHECK (servidor_id IN (SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS sdr_leads_workspace_idx ON public.sdr_leads (workspace_id);
CREATE INDEX IF NOT EXISTS sdr_leads_servidor_idx ON public.sdr_leads (servidor_id);
CREATE INDEX IF NOT EXISTS sdr_leads_stage_idx ON public.sdr_leads (stage);

CREATE OR REPLACE FUNCTION public.set_sdr_leads_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_sdr_leads_updated_at ON public.sdr_leads;
CREATE TRIGGER trg_sdr_leads_updated_at
  BEFORE UPDATE ON public.sdr_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_sdr_leads_updated_at();

-- 3) Sequence events
CREATE TABLE IF NOT EXISTS public.sdr_sequence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sdr_lead_id uuid NOT NULL REFERENCES public.sdr_leads(id) ON DELETE CASCADE,
  day integer NOT NULL,
  channel text NOT NULL,
  message text,
  response text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sdr_sequence_events TO authenticated;
GRANT ALL ON public.sdr_sequence_events TO service_role;

ALTER TABLE public.sdr_sequence_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sdr_sequence_events via lead" ON public.sdr_sequence_events;
CREATE POLICY "sdr_sequence_events via lead"
  ON public.sdr_sequence_events
  FOR ALL
  TO authenticated
  USING (sdr_lead_id IN (
    SELECT sl.id FROM public.sdr_leads sl
    WHERE sl.servidor_id IN (SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid())
  ))
  WITH CHECK (sdr_lead_id IN (
    SELECT sl.id FROM public.sdr_leads sl
    WHERE sl.servidor_id IN (SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid())
  ));

CREATE INDEX IF NOT EXISTS sdr_seq_lead_idx ON public.sdr_sequence_events (sdr_lead_id);

-- 4) Promote SDR -> CRM
CREATE OR REPLACE FUNCTION public.promote_sdr_lead(_sdr_lead_id uuid, _target_workspace_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sdr public.sdr_leads%ROWTYPE;
  v_first_col_id uuid;
  v_first_col_name text;
  v_new_lead_id uuid;
  v_servidor uuid;
BEGIN
  SELECT * INTO v_sdr FROM public.sdr_leads WHERE id = _sdr_lead_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'SDR lead not found'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid() AND ut.tenant_id = v_sdr.servidor_id
  ) THEN
    RAISE EXCEPTION 'forbidden: tenant mismatch';
  END IF;

  SELECT servidor_id INTO v_servidor FROM public.workspaces WHERE id = _target_workspace_id;
  IF v_servidor IS NULL OR v_servidor <> v_sdr.servidor_id THEN
    RAISE EXCEPTION 'invalid target workspace';
  END IF;

  SELECT id, name INTO v_first_col_id, v_first_col_name
  FROM public.kanban_columns
  WHERE workspace_id = _target_workspace_id
  ORDER BY position ASC NULLS LAST, created_at ASC
  LIMIT 1;

  INSERT INTO public.crm_leads (
    workspace_id, servidor_id, owner_id,
    name, phone, email, source, notes,
    column_id, stage
  ) VALUES (
    _target_workspace_id, v_sdr.servidor_id, COALESCE(v_sdr.owner_id, auth.uid()),
    v_sdr.name, v_sdr.phone, v_sdr.email,
    COALESCE(v_sdr.origin, 'sdr'),
    COALESCE(v_sdr.notes, '') || E'\n\n[Promovido do SDR em ' || to_char(now(),'DD/MM/YYYY HH24:MI') || ']',
    v_first_col_id, COALESCE(v_first_col_name, 'novo')
  ) RETURNING id INTO v_new_lead_id;

  UPDATE public.sdr_leads
    SET stage = 'qualificado',
        qualified_at = now(),
        promoted_lead_id = v_new_lead_id,
        promoted_workspace_id = _target_workspace_id,
        updated_at = now()
    WHERE id = _sdr_lead_id;

  RETURN v_new_lead_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_sdr_lead(uuid, uuid) TO authenticated;