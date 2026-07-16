
-- =============================================================
-- ONDA 1 — Gerenciador de Equipe: extensão + tabelas auxiliares
-- =============================================================

-- 1) chatbot_teams: novas colunas
ALTER TABLE public.chatbot_teams
  ADD COLUMN IF NOT EXISTS team_type text NOT NULL DEFAULT 'atendimento',
  ADD COLUMN IF NOT EXISTS schedule_mode text NOT NULL DEFAULT 'company',
  ADD COLUMN IF NOT EXISTS distribution_method text NOT NULL DEFAULT 'round_robin',
  ADD COLUMN IF NOT EXISTS max_concurrent_conversations integer,
  ADD COLUMN IF NOT EXISTS queue_timeout_minutes integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS fallback_action text NOT NULL DEFAULT 'keep_queue',
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 1a) Ajustar constraint de status para aceitar 'archived'
ALTER TABLE public.chatbot_teams
  DROP CONSTRAINT IF EXISTS chatbot_teams_status_check;
ALTER TABLE public.chatbot_teams
  ADD CONSTRAINT chatbot_teams_status_check
  CHECK (status = ANY (ARRAY['active','inactive','draft','archived']));

-- 1b) Constraints dos novos campos
ALTER TABLE public.chatbot_teams
  DROP CONSTRAINT IF EXISTS chatbot_teams_team_type_check;
ALTER TABLE public.chatbot_teams
  ADD CONSTRAINT chatbot_teams_team_type_check
  CHECK (team_type = ANY (ARRAY['atendimento','comercial','suporte','financeiro','administrativo','custom']));

ALTER TABLE public.chatbot_teams
  DROP CONSTRAINT IF EXISTS chatbot_teams_schedule_mode_check;
ALTER TABLE public.chatbot_teams
  ADD CONSTRAINT chatbot_teams_schedule_mode_check
  CHECK (schedule_mode = ANY (ARRAY['company','24x7','custom']));

ALTER TABLE public.chatbot_teams
  DROP CONSTRAINT IF EXISTS chatbot_teams_distribution_method_check;
ALTER TABLE public.chatbot_teams
  ADD CONSTRAINT chatbot_teams_distribution_method_check
  CHECK (distribution_method = ANY (ARRAY['round_robin','least_load','contact_owner','deal_owner','manual_priority','manual','specialty']));

ALTER TABLE public.chatbot_teams
  DROP CONSTRAINT IF EXISTS chatbot_teams_fallback_action_check;
ALTER TABLE public.chatbot_teams
  ADD CONSTRAINT chatbot_teams_fallback_action_check
  CHECK (fallback_action = ANY (ARRAY['keep_queue','route_team','route_ai','create_callback','block','notify_supervisor']));

CREATE INDEX IF NOT EXISTS idx_chatbot_teams_status_soft ON public.chatbot_teams (tenant_id, status) WHERE deleted_at IS NULL;

-- 2) chatbot_team_members: novas colunas
ALTER TABLE public.chatbot_team_members
  ADD COLUMN IF NOT EXISTS member_role text,
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS max_concurrent integer,
  ADD COLUMN IF NOT EXISTS member_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS joined_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill member_role a partir do role legado
UPDATE public.chatbot_team_members
   SET member_role = CASE role
       WHEN 'owner'      THEN 'responsible'
       WHEN 'supervisor' THEN 'supervisor'
       WHEN 'agent'      THEN 'agent'
       ELSE 'agent'
     END
 WHERE member_role IS NULL;

ALTER TABLE public.chatbot_team_members
  ALTER COLUMN member_role SET DEFAULT 'agent',
  ALTER COLUMN member_role SET NOT NULL;

ALTER TABLE public.chatbot_team_members
  DROP CONSTRAINT IF EXISTS chatbot_team_members_member_role_check;
ALTER TABLE public.chatbot_team_members
  ADD CONSTRAINT chatbot_team_members_member_role_check
  CHECK (member_role = ANY (ARRAY['responsible','supervisor','agent','observer']));

ALTER TABLE public.chatbot_team_members
  DROP CONSTRAINT IF EXISTS chatbot_team_members_member_status_check;
ALTER TABLE public.chatbot_team_members
  ADD CONSTRAINT chatbot_team_members_member_status_check
  CHECK (member_status = ANY (ARRAY['active','inactive']));

CREATE INDEX IF NOT EXISTS idx_chatbot_team_members_priority ON public.chatbot_team_members (team_id, priority);
CREATE INDEX IF NOT EXISTS idx_chatbot_team_members_status ON public.chatbot_team_members (tenant_id, member_status);

DROP TRIGGER IF EXISTS trg_chatbot_team_members_touch ON public.chatbot_team_members;
CREATE TRIGGER trg_chatbot_team_members_touch
  BEFORE UPDATE ON public.chatbot_team_members
  FOR EACH ROW EXECUTE FUNCTION public.chatbot_touch_updated_at();

-- 3) team_channels ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_channels (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  team_id           uuid NOT NULL REFERENCES public.chatbot_teams(id) ON DELETE CASCADE,
  channel_type      text NOT NULL,
  channel_ref_id    uuid,
  channel_label     text,
  receive_rule      text NOT NULL DEFAULT 'all',
  is_enabled        boolean NOT NULL DEFAULT true,
  config            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, channel_type, channel_ref_id)
);
ALTER TABLE public.team_channels
  ADD CONSTRAINT team_channels_receive_rule_check
  CHECK (receive_rule = ANY (ARRAY['all','transfers_only','subject','after_hours','priority']));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_channels TO authenticated;
GRANT ALL ON public.team_channels TO service_role;
ALTER TABLE public.team_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_channels_select_same_tenant"
  ON public.team_channels FOR SELECT
  USING (is_master(auth.uid()) OR tenant_id = get_user_company_id(auth.uid()));

CREATE POLICY "team_channels_write_admin"
  ON public.team_channels FOR ALL
  USING (
    is_master(auth.uid())
    OR (tenant_id = get_user_company_id(auth.uid())
        AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'ceo'::app_role)))
  )
  WITH CHECK (
    is_master(auth.uid())
    OR (tenant_id = get_user_company_id(auth.uid())
        AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'ceo'::app_role)))
  );

CREATE INDEX IF NOT EXISTS idx_team_channels_team ON public.team_channels (team_id);
CREATE INDEX IF NOT EXISTS idx_team_channels_tenant ON public.team_channels (tenant_id);

DROP TRIGGER IF EXISTS trg_team_channels_touch ON public.team_channels;
CREATE TRIGGER trg_team_channels_touch
  BEFORE UPDATE ON public.team_channels
  FOR EACH ROW EXECUTE FUNCTION public.chatbot_touch_updated_at();

-- 4) team_specialties ------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_specialties (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  team_id      uuid NOT NULL REFERENCES public.chatbot_teams(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic        text NOT NULL,
  weight       integer NOT NULL DEFAULT 100,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id, topic)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_specialties TO authenticated;
GRANT ALL ON public.team_specialties TO service_role;
ALTER TABLE public.team_specialties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_specialties_select_same_tenant"
  ON public.team_specialties FOR SELECT
  USING (is_master(auth.uid()) OR tenant_id = get_user_company_id(auth.uid()));

CREATE POLICY "team_specialties_write_admin"
  ON public.team_specialties FOR ALL
  USING (
    is_master(auth.uid())
    OR (tenant_id = get_user_company_id(auth.uid())
        AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'ceo'::app_role)))
  )
  WITH CHECK (
    is_master(auth.uid())
    OR (tenant_id = get_user_company_id(auth.uid())
        AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'ceo'::app_role)))
  );

CREATE INDEX IF NOT EXISTS idx_team_specialties_team ON public.team_specialties (team_id);
CREATE INDEX IF NOT EXISTS idx_team_specialties_topic ON public.team_specialties (tenant_id, topic);

-- 5) team_member_availability -------------------------------
CREATE TABLE IF NOT EXISTS public.team_member_availability (
  user_id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id        uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  presence_status  text NOT NULL DEFAULT 'offline',
  status_reason    text,
  since            timestamptz NOT NULL DEFAULT now(),
  break_until      timestamptz,
  updated_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.team_member_availability
  ADD CONSTRAINT team_member_availability_status_check
  CHECK (presence_status = ANY (ARRAY['available','busy','away','break','meeting','offline']));

GRANT SELECT, INSERT, UPDATE ON public.team_member_availability TO authenticated;
GRANT ALL ON public.team_member_availability TO service_role;
ALTER TABLE public.team_member_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_availability_select_same_tenant"
  ON public.team_member_availability FOR SELECT
  USING (is_master(auth.uid()) OR tenant_id = get_user_company_id(auth.uid()));

CREATE POLICY "team_availability_upsert_self"
  ON public.team_member_availability FOR INSERT
  WITH CHECK (user_id = auth.uid() AND tenant_id = get_user_company_id(auth.uid()));

CREATE POLICY "team_availability_update_self_or_admin"
  ON public.team_member_availability FOR UPDATE
  USING (
    user_id = auth.uid()
    OR is_master(auth.uid())
    OR (tenant_id = get_user_company_id(auth.uid())
        AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'ceo'::app_role)))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR is_master(auth.uid())
    OR (tenant_id = get_user_company_id(auth.uid())
        AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'ceo'::app_role)))
  );

CREATE INDEX IF NOT EXISTS idx_team_availability_tenant ON public.team_member_availability (tenant_id, presence_status);

DROP TRIGGER IF EXISTS trg_team_availability_touch ON public.team_member_availability;
CREATE TRIGGER trg_team_availability_touch
  BEFORE UPDATE ON public.team_member_availability
  FOR EACH ROW EXECUTE FUNCTION public.chatbot_touch_updated_at();

-- 6) Trigger de auditoria em chatbot_teams
CREATE OR REPLACE FUNCTION public.audit_chatbot_teams_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action   text;
  v_event    text;
  v_uid      uuid := auth.uid();
  v_uname    text;
BEGIN
  IF v_uid IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT COALESCE(p.name, p.email) INTO v_uname FROM public.profiles p WHERE p.user_id = v_uid LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    v_action := 'create_team'; v_event := 'team_created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
      v_action := 'delete_team'; v_event := 'team_deleted';
    ELSIF NEW.archived_at IS NOT NULL AND OLD.archived_at IS NULL THEN
      v_action := 'archive_team'; v_event := 'team_archived';
    ELSIF NEW.archived_at IS NULL AND OLD.archived_at IS NOT NULL THEN
      v_action := 'restore_team'; v_event := 'team_restored';
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
      v_action := CASE WHEN NEW.status = 'active' THEN 'activate_team' ELSE 'deactivate_team' END;
      v_event  := CASE WHEN NEW.status = 'active' THEN 'team_activated' ELSE 'team_deactivated' END;
    ELSE
      v_action := 'edit_team'; v_event := 'team_updated';
    END IF;
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO public.audit_logs (
    user_id, user_name, action, target_type, target_id, servidor_id, details,
    module, event_type, entity_type, entity_id, title, status
  ) VALUES (
    v_uid, v_uname, v_action, 'team',
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    jsonb_build_object(
      'before', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
      'after',  CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
    ),
    'atendimento', v_event, 'team', COALESCE(NEW.id, OLD.id)::text,
    COALESCE(NEW.name, OLD.name),
    'success'
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_chatbot_teams ON public.chatbot_teams;
CREATE TRIGGER trg_audit_chatbot_teams
  AFTER INSERT OR UPDATE ON public.chatbot_teams
  FOR EACH ROW EXECUTE FUNCTION public.audit_chatbot_teams_changes();

-- 7) Habilitar Realtime nas tabelas de equipe (idempotente)
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chatbot_teams; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chatbot_team_members; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.team_channels; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.team_member_availability; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
