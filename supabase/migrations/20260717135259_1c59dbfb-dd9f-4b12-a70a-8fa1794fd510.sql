
-- Extend whatsapp_chats with group metadata
ALTER TABLE public.whatsapp_chats
  ADD COLUMN IF NOT EXISTS group_topic text,
  ADD COLUMN IF NOT EXISTS group_owner_jid text,
  ADD COLUMN IF NOT EXISTS participant_count integer NOT NULL DEFAULT 0;

-- Extend whatsapp_messages with per-message sender identity (for groups)
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS sender_jid text,
  ADD COLUMN IF NOT EXISTS sender_name text;

-- Group participants
CREATE TABLE IF NOT EXISTS public.whatsapp_group_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  chat_id uuid NOT NULL REFERENCES public.whatsapp_chats(id) ON DELETE CASCADE,
  participant_jid text NOT NULL,
  participant_name text,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chat_id, participant_jid)
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_group_participants_tenant ON public.whatsapp_group_participants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_group_participants_chat ON public.whatsapp_group_participants(chat_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_group_participants TO authenticated;
GRANT ALL ON public.whatsapp_group_participants TO service_role;
ALTER TABLE public.whatsapp_group_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members view group participants"
  ON public.whatsapp_group_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = whatsapp_group_participants.tenant_id
        AND ut.status = 'active'
    )
    OR public.has_role(auth.uid(), 'master'::app_role)
  );

CREATE TRIGGER trg_wa_group_participants_updated_at
  BEFORE UPDATE ON public.whatsapp_group_participants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Phone discrepancies
CREATE TABLE IF NOT EXISTS public.whatsapp_phone_discrepancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  phone_atual_no_lead text,
  phone_resolvido_pela_uazapi text NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wa_phone_disc_tenant ON public.whatsapp_phone_discrepancies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wa_phone_disc_lead ON public.whatsapp_phone_discrepancies(lead_id) WHERE resolved_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_phone_discrepancies TO authenticated;
GRANT ALL ON public.whatsapp_phone_discrepancies TO service_role;
ALTER TABLE public.whatsapp_phone_discrepancies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members view phone discrepancies"
  ON public.whatsapp_phone_discrepancies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = whatsapp_phone_discrepancies.tenant_id
        AND ut.status = 'active'
    )
    OR public.has_role(auth.uid(), 'master'::app_role)
  );

CREATE POLICY "Tenant admins mark discrepancy resolved"
  ON public.whatsapp_phone_discrepancies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = whatsapp_phone_discrepancies.tenant_id
        AND ut.status = 'active'
    )
    OR public.has_role(auth.uid(), 'master'::app_role)
  );
