
-- ============================================
-- whatsapp_quick_replies: tenant-scoped quick reply snippets
-- ============================================
CREATE TABLE IF NOT EXISTS public.whatsapp_quick_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  content text NOT NULL,
  shortcut text,
  category text,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_quick_replies_company ON public.whatsapp_quick_replies(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quick_replies_shortcut ON public.whatsapp_quick_replies(company_id, shortcut) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_quick_replies TO authenticated;
GRANT ALL ON public.whatsapp_quick_replies TO service_role;

ALTER TABLE public.whatsapp_quick_replies ENABLE ROW LEVEL SECURITY;

-- Anyone in the tenant can read active quick replies
CREATE POLICY "tenant members read quick replies"
  ON public.whatsapp_quick_replies FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

-- Only admin/ceo/master can manage (insert/update/delete)
CREATE POLICY "admins insert quick replies"
  ON public.whatsapp_quick_replies FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.get_user_company_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'ceo'::app_role)
      OR public.is_master(auth.uid())
    )
  );

CREATE POLICY "admins update quick replies"
  ON public.whatsapp_quick_replies FOR UPDATE TO authenticated
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'ceo'::app_role)
      OR public.is_master(auth.uid())
    )
  );

CREATE POLICY "admins delete quick replies"
  ON public.whatsapp_quick_replies FOR DELETE TO authenticated
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'ceo'::app_role)
      OR public.is_master(auth.uid())
    )
  );

CREATE TRIGGER trg_quick_replies_updated_at
  BEFORE UPDATE ON public.whatsapp_quick_replies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- whatsapp_chat_pins: per-user pinned chats
-- ============================================
CREATE TABLE IF NOT EXISTS public.whatsapp_chat_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pinned_at timestamptz NOT NULL DEFAULT now(),
  order_position integer,
  UNIQUE (user_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_pins_user ON public.whatsapp_chat_pins(user_id, pinned_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_pins_contact ON public.whatsapp_chat_pins(contact_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_chat_pins TO authenticated;
GRANT ALL ON public.whatsapp_chat_pins TO service_role;

ALTER TABLE public.whatsapp_chat_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own pins"
  ON public.whatsapp_chat_pins FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND company_id = public.get_user_company_id(auth.uid()));
