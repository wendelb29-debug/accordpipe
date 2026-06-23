
-- contact_assignment_status
CREATE TABLE IF NOT EXISTS public.contact_assignment_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL UNIQUE REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.tenant_departments(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','closed')),
  assigned_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_by_system boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  assumed_at timestamptz,
  closed_at timestamptz,
  timeout_auto_release_at timestamptz,
  queue_position int
);
CREATE INDEX IF NOT EXISTS idx_cas_tenant ON public.contact_assignment_status(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cas_department ON public.contact_assignment_status(department_id);
CREATE INDEX IF NOT EXISTS idx_cas_assigned ON public.contact_assignment_status(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_cas_status ON public.contact_assignment_status(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_assignment_status TO authenticated;
GRANT ALL ON public.contact_assignment_status TO service_role;

ALTER TABLE public.contact_assignment_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members see queue of their departments"
  ON public.contact_assignment_status FOR SELECT TO authenticated
  USING (
    public.is_master(auth.uid())
    OR assigned_to_user_id = auth.uid()
    OR (
      tenant_id = public.get_user_company_id(auth.uid())
      AND (public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
    )
    OR EXISTS (
      SELECT 1 FROM public.user_departments ud
      WHERE ud.user_id = auth.uid()
        AND ud.is_active = true
        AND ud.department_id = contact_assignment_status.department_id
    )
  );

CREATE POLICY "Members in tenant manage queue items"
  ON public.contact_assignment_status FOR ALL TO authenticated
  USING (
    public.is_master(auth.uid())
    OR tenant_id = public.get_user_company_id(auth.uid())
  )
  WITH CHECK (
    public.is_master(auth.uid())
    OR tenant_id = public.get_user_company_id(auth.uid())
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_assignment_status;

-- notification_preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sound_enabled boolean NOT NULL DEFAULT true,
  sound_file text NOT NULL DEFAULT 'notification_queue.mp3',
  sound_volume int NOT NULL DEFAULT 80 CHECK (sound_volume BETWEEN 0 AND 100),
  browser_notification_enabled boolean NOT NULL DEFAULT true,
  auto_release_timeout_minutes int NOT NULL DEFAULT 30 CHECK (auto_release_timeout_minutes BETWEEN 1 AND 240),
  auto_release_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);
CREATE INDEX IF NOT EXISTS idx_notif_pref_user ON public.notification_preferences(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notification prefs"
  ON public.notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RPCs
CREATE OR REPLACE FUNCTION public.assume_attendance(
  p_contact_id uuid,
  p_user_id uuid,
  p_timeout_minutes int DEFAULT 30
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.contact_assignment_status
  SET
    status = 'in_progress',
    assigned_to_user_id = p_user_id,
    assumed_at = now(),
    timeout_auto_release_at = now() + (p_timeout_minutes || ' minutes')::interval
  WHERE contact_id = p_contact_id
    AND status = 'pending';

  UPDATE public.whatsapp_contacts
  SET assigned_to = p_user_id, updated_at = now()
  WHERE id = p_contact_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_attendance(p_contact_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.contact_assignment_status
  SET
    status = 'pending',
    assigned_to_user_id = NULL,
    assumed_at = NULL,
    timeout_auto_release_at = NULL
  WHERE contact_id = p_contact_id
    AND status = 'in_progress'
    AND assigned_to_user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.count_queue_items(p_department_id uuid)
RETURNS int
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.contact_assignment_status
  WHERE department_id = p_department_id
    AND status = 'pending';
$$;

CREATE OR REPLACE FUNCTION public.auto_release_expired_attendance()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.contact_assignment_status
  SET
    status = 'pending',
    assigned_to_user_id = NULL,
    assumed_at = NULL,
    timeout_auto_release_at = NULL
  WHERE status = 'in_progress'
    AND timeout_auto_release_at < now();
$$;
