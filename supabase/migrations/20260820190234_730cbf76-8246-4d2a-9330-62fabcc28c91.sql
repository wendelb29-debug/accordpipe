-- Onda 1: Extensão do banco para o Gerenciador de Equipe
-- Reutiliza chatbot_agent_teams e chatbot_team_members, estende com novas colunas e cria tabelas de apoio.

-- 1. Extender chatbot_agent_teams
ALTER TABLE public.chatbot_agent_teams 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS icon text,
ADD COLUMN IF NOT EXISTS color text DEFAULT '#6366f1',
ADD COLUMN IF NOT EXISTS team_type text DEFAULT 'atendimento' CHECK (team_type IN ('atendimento', 'comercial', 'suporte', 'financeiro', 'administrativo', 'custom')),
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
ADD COLUMN IF NOT EXISTS archived_at timestamptz,
ADD COLUMN IF NOT EXISTS distribution_method text DEFAULT 'round_robin' CHECK (distribution_method IN ('round_robin', 'least_load', 'contact_owner', 'deal_owner', 'manual_priority', 'manual', 'specialty')),
ADD COLUMN IF NOT EXISTS max_concurrent_conversations integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS queue_timeout_minutes integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS fallback_action text DEFAULT 'keep_queue' CHECK (fallback_action IN ('keep_queue', 'route_team', 'route_ai', 'create_callback', 'block', 'notify_supervisor')),
ADD COLUMN IF NOT EXISTS fallback_team_id uuid REFERENCES public.chatbot_agent_teams(id),
ADD COLUMN IF NOT EXISTS use_business_hours boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS schedule_mode text DEFAULT 'company' CHECK (schedule_mode IN ('company', '24x7', 'custom'));

-- 2. Extender chatbot_team_members
ALTER TABLE public.chatbot_team_members
ADD COLUMN IF NOT EXISTS member_role text DEFAULT 'agent' CHECK (member_role IN ('responsible', 'supervisor', 'agent', 'observer')),
ADD COLUMN IF NOT EXISTS priority integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_concurrent integer,
ADD COLUMN IF NOT EXISTS member_status text DEFAULT 'active' CHECK (member_status IN ('active', 'inactive')),
ADD COLUMN IF NOT EXISTS joined_at timestamptz DEFAULT now();

-- 3. Nova tabela: team_channels (Equipe ↔ Canais)
CREATE TABLE IF NOT EXISTS public.team_channels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id uuid NOT NULL REFERENCES public.chatbot_agent_teams(id) ON DELETE CASCADE,
    channel_type text NOT NULL CHECK (channel_type IN ('whatsapp', 'email', 'chat', 'instagram', 'facebook')),
    channel_id text NOT NULL, -- UUID da instância ou email
    rule text DEFAULT 'all' CHECK (rule IN ('all', 'transfers_only', 'subject', 'after_hours', 'priority')),
    is_active boolean DEFAULT true,
    tenant_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(team_id, channel_type, channel_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_channels TO authenticated;
GRANT ALL ON public.team_channels TO service_role;

ALTER TABLE public.team_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see channels for their company" ON public.team_channels
FOR SELECT TO authenticated
USING (tenant_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage channels for their company" ON public.team_channels
FOR ALL TO authenticated
USING (
    tenant_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo'))
)
WITH CHECK (
    tenant_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo'))
);

-- 4. Nova tabela: team_schedules (Horários Específicos da Equipe)
CREATE TABLE IF NOT EXISTS public.team_schedules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id uuid NOT NULL REFERENCES public.chatbot_agent_teams(id) ON DELETE CASCADE,
    day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time_1 time,
    end_time_1 time,
    start_time_2 time,
    end_time_2 time,
    is_active boolean DEFAULT true,
    tenant_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(team_id, day_of_week)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_schedules TO authenticated;
GRANT ALL ON public.team_schedules TO service_role;

ALTER TABLE public.team_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see schedules for their company" ON public.team_schedules
FOR SELECT TO authenticated
USING (tenant_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage schedules" ON public.team_schedules
FOR ALL TO authenticated
USING (
    tenant_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo'))
)
WITH CHECK (
    tenant_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo'))
);

-- 5. Nova tabela: team_specialties (Especialidades para Distribuição)
CREATE TABLE IF NOT EXISTS public.team_specialties (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id uuid NOT NULL REFERENCES public.chatbot_agent_teams(id) ON DELETE CASCADE,
    subject text NOT NULL,
    priority integer DEFAULT 1,
    tenant_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(team_id, subject)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_specialties TO authenticated;
GRANT ALL ON public.team_specialties TO service_role;

ALTER TABLE public.team_specialties ENABLE ROW LEVEL SECURITY;

-- 6. Nova tabela: team_member_availability (Disponibilidade Realtime)
CREATE TABLE IF NOT EXISTS public.team_member_availability (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    status text DEFAULT 'offline' CHECK (status IN ('available', 'busy', 'away', 'break', 'meeting', 'offline')),
    last_status_change timestamptz DEFAULT now(),
    metadata jsonb DEFAULT '{}',
    UNIQUE(user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_member_availability TO authenticated;
GRANT ALL ON public.team_member_availability TO service_role;

ALTER TABLE public.team_member_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone in company can see availability" ON public.team_member_availability
FOR SELECT TO authenticated
USING (tenant_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their own availability" ON public.team_member_availability
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 7. Trigger de auditoria
CREATE OR REPLACE FUNCTION public.log_team_event()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (
        module,
        event_type,
        servidor_id,
        user_id,
        entity_type,
        entity_id,
        old_data,
        new_data
    ) VALUES (
        'atendimento',
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'team_created'
            WHEN TG_OP = 'UPDATE' THEN 'team_updated'
            WHEN TG_OP = 'DELETE' THEN 'team_deleted'
        END,
        COALESCE(NEW.tenant_id, OLD.tenant_id),
        auth.uid(),
        'team',
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if triggers already exist before creating
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_audit_teams') THEN
        CREATE TRIGGER tr_audit_teams
        AFTER INSERT OR UPDATE OR DELETE ON public.chatbot_agent_teams
        FOR EACH ROW EXECUTE FUNCTION public.log_team_event();
    END IF;
END $$;

-- Update updated_at triggers using set_updated_at (if it exists) or creating a generic one
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_team_channels_updated_at') THEN
        CREATE TRIGGER tr_team_channels_updated_at BEFORE UPDATE ON public.team_channels FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_team_schedules_updated_at') THEN
        CREATE TRIGGER tr_team_schedules_updated_at BEFORE UPDATE ON public.team_schedules FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;
