
-- Conversations
CREATE TABLE public.collab_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servidor_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'group' CHECK (kind IN ('group','channel','collab','copilot','video','direct')),
  name text NOT NULL,
  emoji text,
  color text,
  created_by uuid NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_collab_conv_servidor ON public.collab_conversations(servidor_id, last_message_at DESC NULLS LAST);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collab_conversations TO authenticated;
GRANT ALL ON public.collab_conversations TO service_role;
ALTER TABLE public.collab_conversations ENABLE ROW LEVEL SECURITY;

-- Members
CREATE TABLE public.collab_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.collab_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz,
  is_muted boolean NOT NULL DEFAULT false,
  UNIQUE (conversation_id, user_id)
);
CREATE INDEX idx_collab_members_user ON public.collab_members(user_id);
CREATE INDEX idx_collab_members_conv ON public.collab_members(conversation_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collab_members TO authenticated;
GRANT ALL ON public.collab_members TO service_role;
ALTER TABLE public.collab_members ENABLE ROW LEVEL SECURITY;

-- Messages
CREATE TABLE public.collab_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.collab_conversations(id) ON DELETE CASCADE,
  servidor_id uuid NOT NULL,
  sender_id uuid,
  content text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  reply_to_id uuid REFERENCES public.collab_messages(id) ON DELETE SET NULL,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  deleted_at timestamptz
);
CREATE INDEX idx_collab_msg_conv_created ON public.collab_messages(conversation_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collab_messages TO authenticated;
GRANT ALL ON public.collab_messages TO service_role;
ALTER TABLE public.collab_messages ENABLE ROW LEVEL SECURITY;

-- Reactions
CREATE TABLE public.collab_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.collab_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);
CREATE INDEX idx_collab_reactions_msg ON public.collab_reactions(message_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collab_reactions TO authenticated;
GRANT ALL ON public.collab_reactions TO service_role;
ALTER TABLE public.collab_reactions ENABLE ROW LEVEL SECURITY;

-- Helper functions (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_collab_member(_conv_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.collab_members WHERE conversation_id = _conv_id AND user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_collab_admin(_conv_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.collab_members WHERE conversation_id = _conv_id AND user_id = _user_id AND role IN ('owner','admin'))
$$;

CREATE OR REPLACE FUNCTION public.get_collab_servidor(_conv_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT servidor_id FROM public.collab_conversations WHERE id = _conv_id LIMIT 1
$$;

-- Conversations policies
CREATE POLICY "Members see conversations" ON public.collab_conversations FOR SELECT TO authenticated
USING (
  servidor_id = public.get_user_company_id(auth.uid())
  AND (kind = 'channel' OR public.is_collab_member(id, auth.uid()))
);
CREATE POLICY "Tenant users create conversations" ON public.collab_conversations FOR INSERT TO authenticated
WITH CHECK (servidor_id = public.get_user_company_id(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Admins update conversations" ON public.collab_conversations FOR UPDATE TO authenticated
USING (public.is_collab_admin(id, auth.uid()) OR created_by = auth.uid());
CREATE POLICY "Admins delete conversations" ON public.collab_conversations FOR DELETE TO authenticated
USING (public.is_collab_admin(id, auth.uid()) OR created_by = auth.uid());

-- Members policies
CREATE POLICY "Members see co-members" ON public.collab_members FOR SELECT TO authenticated
USING (public.is_collab_member(conversation_id, auth.uid()));
CREATE POLICY "Admins add members" ON public.collab_members FOR INSERT TO authenticated
WITH CHECK (
  public.is_collab_admin(conversation_id, auth.uid())
  OR EXISTS (SELECT 1 FROM public.collab_conversations c WHERE c.id = conversation_id AND c.created_by = auth.uid())
);
CREATE POLICY "Admins update members" ON public.collab_members FOR UPDATE TO authenticated
USING (
  user_id = auth.uid() OR public.is_collab_admin(conversation_id, auth.uid())
);
CREATE POLICY "Admins remove members" ON public.collab_members FOR DELETE TO authenticated
USING (
  user_id = auth.uid() OR public.is_collab_admin(conversation_id, auth.uid())
);

-- Messages policies
CREATE POLICY "Members see messages" ON public.collab_messages FOR SELECT TO authenticated
USING (public.is_collab_member(conversation_id, auth.uid()));
CREATE POLICY "Members send messages" ON public.collab_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_collab_member(conversation_id, auth.uid())
  AND servidor_id = public.get_collab_servidor(conversation_id)
);
CREATE POLICY "Authors edit messages" ON public.collab_messages FOR UPDATE TO authenticated
USING (sender_id = auth.uid());
CREATE POLICY "Authors delete messages" ON public.collab_messages FOR DELETE TO authenticated
USING (sender_id = auth.uid() OR public.is_collab_admin(conversation_id, auth.uid()));

-- Reactions policies
CREATE POLICY "Members see reactions" ON public.collab_reactions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.collab_messages m
    WHERE m.id = message_id AND public.is_collab_member(m.conversation_id, auth.uid())
  )
);
CREATE POLICY "Users add own reactions" ON public.collab_reactions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users remove own reactions" ON public.collab_reactions FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Updated-at trigger on conversations
CREATE TRIGGER trg_collab_conv_updated_at
BEFORE UPDATE ON public.collab_conversations
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Last message preview trigger
CREATE OR REPLACE FUNCTION public.collab_update_last_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _preview text;
BEGIN
  IF NEW.is_system THEN
    _preview := COALESCE(NEW.content, 'Atualização do sistema');
  ELSIF NEW.content IS NOT NULL AND length(NEW.content) > 0 THEN
    _preview := left(NEW.content, 120);
  ELSIF jsonb_array_length(NEW.attachments) > 0 THEN
    _preview := '📎 Anexo';
  ELSE
    _preview := '';
  END IF;

  UPDATE public.collab_conversations
  SET last_message_at = NEW.created_at,
      last_message_preview = _preview,
      updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_collab_msg_last
AFTER INSERT ON public.collab_messages
FOR EACH ROW EXECUTE FUNCTION public.collab_update_last_message();

-- Realtime
ALTER TABLE public.collab_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.collab_members REPLICA IDENTITY FULL;
ALTER TABLE public.collab_messages REPLICA IDENTITY FULL;
ALTER TABLE public.collab_reactions REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.collab_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collab_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collab_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collab_reactions;
