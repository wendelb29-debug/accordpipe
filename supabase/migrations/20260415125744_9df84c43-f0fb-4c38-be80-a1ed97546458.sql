
-- Create tenant_events table
CREATE TABLE public.tenant_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'reunião',
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE,
  location TEXT,
  meeting_url TEXT,
  banner_url TEXT,
  target_mode TEXT NOT NULL DEFAULT 'all',
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'scheduled',
  reminder_minutes INTEGER[] DEFAULT '{0,15,60,1440}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tenant_event_confirmations table
CREATE TABLE public.tenant_event_confirmations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.tenant_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Indexes
CREATE INDEX idx_tenant_events_tenant_id ON public.tenant_events(tenant_id);
CREATE INDEX idx_tenant_events_start_at ON public.tenant_events(start_at);
CREATE INDEX idx_tenant_events_status ON public.tenant_events(status);
CREATE INDEX idx_tenant_event_confirmations_event_id ON public.tenant_event_confirmations(event_id);
CREATE INDEX idx_tenant_event_confirmations_user_id ON public.tenant_event_confirmations(user_id);

-- Updated_at triggers
CREATE TRIGGER update_tenant_events_updated_at
  BEFORE UPDATE ON public.tenant_events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_tenant_event_confirmations_updated_at
  BEFORE UPDATE ON public.tenant_event_confirmations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.tenant_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_event_confirmations ENABLE ROW LEVEL SECURITY;

-- RLS for tenant_events
CREATE POLICY "Users can view events of their tenant"
  ON public.tenant_events FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create events in their tenant"
  ON public.tenant_events FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Creator or admin can update events"
  ON public.tenant_events FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_user_company_id(auth.uid())
    AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.is_master(auth.uid()))
  );

CREATE POLICY "Creator or admin can delete events"
  ON public.tenant_events FOR DELETE
  TO authenticated
  USING (
    tenant_id = public.get_user_company_id(auth.uid())
    AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.is_master(auth.uid()))
  );

-- RLS for tenant_event_confirmations
CREATE POLICY "Users can view confirmations of their tenant events"
  ON public.tenant_event_confirmations FOR SELECT
  TO authenticated
  USING (
    event_id IN (SELECT id FROM public.tenant_events WHERE tenant_id = public.get_user_company_id(auth.uid()))
  );

CREATE POLICY "Users can manage their own confirmations"
  ON public.tenant_event_confirmations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own confirmations"
  ON public.tenant_event_confirmations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Add event permissions to role_default_permissions
INSERT INTO public.role_default_permissions (role, permission_key, data_scope)
VALUES
  ('admin', 'view_events', 'all'),
  ('admin', 'create_events', 'all'),
  ('admin', 'edit_events', 'all'),
  ('admin', 'delete_events', 'all'),
  ('admin', 'confirm_event_attendance', 'all'),
  ('admin', 'manage_event_notifications', 'all'),
  ('operador', 'view_events', 'all'),
  ('operador', 'confirm_event_attendance', 'own'),
  ('comercial', 'view_events', 'all'),
  ('comercial', 'confirm_event_attendance', 'own'),
  ('administrativo', 'view_events', 'all'),
  ('administrativo', 'create_events', 'all'),
  ('administrativo', 'confirm_event_attendance', 'own')
ON CONFLICT DO NOTHING;

-- Enable realtime for events
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_events;
