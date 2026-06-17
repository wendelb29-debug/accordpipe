
-- ============ 1. Extend proposals ============
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS control_code text,
  ADD COLUMN IF NOT EXISTS client_oc text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'BRL',
  ADD COLUMN IF NOT EXISTS created_date date NOT NULL DEFAULT current_date,
  ADD COLUMN IF NOT EXISTS validity_days int NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS intro_html text,
  ADD COLUMN IF NOT EXISTS observations text,
  ADD COLUMN IF NOT EXISTS ps_payment jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS mrr_payment jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS template_id uuid,
  ADD COLUMN IF NOT EXISTS public_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS public_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS public_accepted_ip text,
  ADD COLUMN IF NOT EXISTS public_accepted_name text,
  ADD COLUMN IF NOT EXISTS public_accepted_doc text,
  ADD COLUMN IF NOT EXISTS public_rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS public_rejected_reason text;

CREATE UNIQUE INDEX IF NOT EXISTS proposals_control_code_unique
  ON public.proposals(servidor_id, control_code) WHERE control_code IS NOT NULL;

-- ============ 2. proposal_control_sequences ============
CREATE TABLE IF NOT EXISTS public.proposal_control_sequences (
  servidor_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  last_number int NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE ON public.proposal_control_sequences TO authenticated;
GRANT ALL ON public.proposal_control_sequences TO service_role;
ALTER TABLE public.proposal_control_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant manages own proposal sequence"
  ON public.proposal_control_sequences FOR ALL TO authenticated
  USING (servidor_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (servidor_id = public.get_user_company_id(auth.uid()));

CREATE OR REPLACE FUNCTION public.next_proposal_control_code(_servidor_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _next int;
BEGIN
  INSERT INTO public.proposal_control_sequences (servidor_id, last_number)
  VALUES (_servidor_id, 1)
  ON CONFLICT (servidor_id) DO UPDATE SET last_number = proposal_control_sequences.last_number + 1
  RETURNING last_number INTO _next;
  RETURN 'OP-' || LPAD(_next::text, 5, '0');
END;
$$;

-- ============ 3. proposal_line_items (line items per proposal) ============
CREATE TABLE IF NOT EXISTS public.proposal_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  servidor_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  catalog_item_id uuid REFERENCES public.proposal_catalog_items(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  item_type text NOT NULL DEFAULT 'servico', -- servico | mrr
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  unit_value numeric(12,2) NOT NULL DEFAULT 0,
  discount_type text NOT NULL DEFAULT 'percent', -- percent | fixed
  discount_value numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposal_line_items TO authenticated;
GRANT ALL ON public.proposal_line_items TO service_role;
ALTER TABLE public.proposal_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant manages own proposal line items"
  ON public.proposal_line_items FOR ALL TO authenticated
  USING (servidor_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (servidor_id = public.get_user_company_id(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_proposal_line_items_proposal ON public.proposal_line_items(proposal_id);
CREATE TRIGGER update_proposal_line_items_updated_at
  BEFORE UPDATE ON public.proposal_line_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============ 4. proposal_templates ============
CREATE TABLE IF NOT EXISTS public.proposal_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servidor_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  intro_html text,
  observations text,
  default_validity_days int NOT NULL DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposal_templates TO authenticated;
GRANT ALL ON public.proposal_templates TO service_role;
ALTER TABLE public.proposal_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant reads own proposal templates"
  ON public.proposal_templates FOR SELECT TO authenticated
  USING (servidor_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Admins manage proposal templates"
  ON public.proposal_templates FOR ALL TO authenticated
  USING (
    servidor_id = public.get_user_company_id(auth.uid())
    AND (
      public.is_master(auth.uid())
      OR public.has_role(auth.uid(), 'ceo'::app_role)
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  )
  WITH CHECK (
    servidor_id = public.get_user_company_id(auth.uid())
    AND (
      public.is_master(auth.uid())
      OR public.has_role(auth.uid(), 'ceo'::app_role)
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );
CREATE TRIGGER update_proposal_templates_updated_at
  BEFORE UPDATE ON public.proposal_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Add FK after table exists
ALTER TABLE public.proposals
  ADD CONSTRAINT proposals_template_id_fkey FOREIGN KEY (template_id)
  REFERENCES public.proposal_templates(id) ON DELETE SET NULL;

-- ============ 5. proposal_public_events ============
CREATE TABLE IF NOT EXISTS public.proposal_public_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  servidor_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- view | accept | reject
  ip text,
  user_agent text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.proposal_public_events TO authenticated;
GRANT ALL ON public.proposal_public_events TO service_role;
ALTER TABLE public.proposal_public_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant reads own public events"
  ON public.proposal_public_events FOR SELECT TO authenticated
  USING (servidor_id = public.get_user_company_id(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_proposal_public_events_proposal ON public.proposal_public_events(proposal_id);

-- ============ 6. Public RPCs (no login needed) ============
CREATE OR REPLACE FUNCTION public.get_proposal_by_public_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _proposal jsonb;
  _items jsonb;
  _company jsonb;
  _lead jsonb;
BEGIN
  SELECT to_jsonb(p.*) INTO _proposal
  FROM public.proposals p
  WHERE p.public_token = p_token;

  IF _proposal IS NULL THEN RETURN NULL; END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(li.*) ORDER BY li.position), '[]'::jsonb) INTO _items
  FROM public.proposal_line_items li
  WHERE li.proposal_id = (_proposal->>'id')::uuid;

  SELECT jsonb_build_object(
    'id', c.id,
    'razao_social', c.razao_social,
    'nome_fantasia', c.nome_fantasia,
    'cnpj', c.cnpj,
    'logo_url', c.logo_url,
    'email', c.email,
    'telefone', c.telefone
  ) INTO _company
  FROM public.companies c
  WHERE c.id = (_proposal->>'servidor_id')::uuid;

  SELECT jsonb_build_object(
    'id', l.id,
    'name', l.name,
    'email', l.email,
    'phone', l.phone,
    'company_name', l.company_name
  ) INTO _lead
  FROM public.crm_leads l
  WHERE l.id = (_proposal->>'lead_id')::uuid;

  RETURN jsonb_build_object(
    'proposal', _proposal,
    'items', _items,
    'company', _company,
    'lead', _lead
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_proposal_by_public_token(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_proposal_public_view(p_token text, p_ip text, p_user_agent text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _pid uuid; _sid uuid;
BEGIN
  SELECT id, servidor_id INTO _pid, _sid FROM public.proposals WHERE public_token = p_token;
  IF _pid IS NULL THEN RETURN; END IF;
  INSERT INTO public.proposal_public_events(proposal_id, servidor_id, event_type, ip, user_agent)
  VALUES (_pid, _sid, 'view', p_ip, p_user_agent);
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_proposal_public_view(text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.accept_proposal_public(p_token text, p_name text, p_doc text, p_ip text, p_user_agent text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _pid uuid; _sid uuid; _already timestamptz;
BEGIN
  SELECT id, servidor_id, public_accepted_at INTO _pid, _sid, _already
  FROM public.proposals WHERE public_token = p_token;
  IF _pid IS NULL THEN RETURN false; END IF;
  IF _already IS NOT NULL THEN RETURN true; END IF;
  IF p_name IS NULL OR length(trim(p_name)) < 3 THEN RAISE EXCEPTION 'Nome inválido'; END IF;
  IF p_doc IS NULL OR length(regexp_replace(p_doc, '\D', '', 'g')) < 11 THEN RAISE EXCEPTION 'CPF/CNPJ inválido'; END IF;

  UPDATE public.proposals
  SET status = 'aprovada',
      public_accepted_at = now(),
      public_accepted_ip = p_ip,
      public_accepted_name = p_name,
      public_accepted_doc = p_doc,
      approved_at = now(),
      approved_by_name = p_name
  WHERE id = _pid;

  INSERT INTO public.proposal_public_events(proposal_id, servidor_id, event_type, ip, user_agent, payload)
  VALUES (_pid, _sid, 'accept', p_ip, p_user_agent, jsonb_build_object('name', p_name, 'doc', p_doc));
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.accept_proposal_public(text, text, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.reject_proposal_public(p_token text, p_reason text, p_ip text, p_user_agent text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _pid uuid; _sid uuid;
BEGIN
  SELECT id, servidor_id INTO _pid, _sid FROM public.proposals WHERE public_token = p_token;
  IF _pid IS NULL THEN RETURN false; END IF;
  UPDATE public.proposals
  SET status = 'recusada',
      public_rejected_at = now(),
      public_rejected_reason = p_reason
  WHERE id = _pid AND public_accepted_at IS NULL;
  INSERT INTO public.proposal_public_events(proposal_id, servidor_id, event_type, ip, user_agent, payload)
  VALUES (_pid, _sid, 'reject', p_ip, p_user_agent, jsonb_build_object('reason', p_reason));
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.reject_proposal_public(text, text, text, text) TO anon, authenticated;
