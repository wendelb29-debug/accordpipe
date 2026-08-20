-- Migration: Closer Support Panel Tables
-- Description: Creates playbooks, scripts, branches, sessions and events for the Closer module.

-- 1. closer_playbooks
CREATE TABLE IF NOT EXISTS public.closer_playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.closer_playbooks TO authenticated;
GRANT ALL ON public.closer_playbooks TO service_role;

ALTER TABLE public.closer_playbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "closer_playbooks_select" ON public.closer_playbooks
  FOR SELECT TO authenticated USING (tenant_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "closer_playbooks_insert" ON public.closer_playbooks
  FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
  
CREATE POLICY "closer_playbooks_update" ON public.closer_playbooks
  FOR UPDATE TO authenticated USING (tenant_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- 2. closer_scripts
CREATE TABLE IF NOT EXISTS public.closer_scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id uuid NOT NULL REFERENCES public.closer_playbooks(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  channel text DEFAULT 'all' CHECK (channel IN ('whatsapp', 'call', 'all')),
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.closer_scripts TO authenticated;
GRANT ALL ON public.closer_scripts TO service_role;

ALTER TABLE public.closer_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "closer_scripts_select" ON public.closer_scripts
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.closer_playbooks p 
      WHERE p.id = closer_scripts.playbook_id 
      AND p.tenant_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- 3. closer_script_branches
CREATE TABLE IF NOT EXISTS public.closer_script_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid NOT NULL REFERENCES public.closer_scripts(id) ON DELETE CASCADE,
  branch_key text NOT NULL,
  label text NOT NULL,
  next_step_key text,
  branch_content text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.closer_script_branches TO authenticated;
GRANT ALL ON public.closer_script_branches TO service_role;

ALTER TABLE public.closer_script_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "closer_branches_select" ON public.closer_script_branches
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.closer_scripts s
      JOIN public.closer_playbooks p ON p.id = s.playbook_id
      WHERE s.id = closer_script_branches.script_id
      AND p.tenant_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- 4. closer_sessions
CREATE TABLE IF NOT EXISTS public.closer_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  playbook_id uuid REFERENCES public.closer_playbooks(id),
  client_name text,
  client_phone text,
  metadata jsonb DEFAULT '{}',
  status text DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled', 'converted')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. closer_session_events
CREATE TABLE IF NOT EXISTS public.closer_session_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.closer_sessions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  step_key text,
  branch_key text,
  content text,
  created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.closer_sessions TO authenticated;
GRANT SELECT, INSERT ON public.closer_session_events TO authenticated;
GRANT ALL ON public.closer_sessions TO service_role;
GRANT ALL ON public.closer_session_events TO service_role;

ALTER TABLE public.closer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closer_session_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "closer_sessions_owner" ON public.closer_sessions
  FOR ALL TO authenticated USING (tenant_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "closer_events_owner" ON public.closer_session_events
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.closer_sessions s
      WHERE s.id = closer_session_events.session_id
      AND s.tenant_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
  );
