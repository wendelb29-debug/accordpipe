
CREATE TABLE public.collab_polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.collab_conversations(id) ON DELETE CASCADE,
  servidor_id UUID NOT NULL,
  created_by UUID NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  show_voters BOOLEAN NOT NULL DEFAULT true,
  deadline TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.collab_poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.collab_polls(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

CREATE INDEX idx_collab_poll_votes_poll ON public.collab_poll_votes(poll_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collab_polls TO authenticated;
GRANT ALL ON public.collab_polls TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collab_poll_votes TO authenticated;
GRANT ALL ON public.collab_poll_votes TO service_role;

ALTER TABLE public.collab_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collab_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read polls" ON public.collab_polls
  FOR SELECT TO authenticated
  USING (is_collab_member(conversation_id, auth.uid()));

CREATE POLICY "Members create polls" ON public.collab_polls
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND is_collab_member(conversation_id, auth.uid()));

CREATE POLICY "Author updates poll" ON public.collab_polls
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Author deletes poll" ON public.collab_polls
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Members read votes" ON public.collab_poll_votes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.collab_polls p WHERE p.id = poll_id AND is_collab_member(p.conversation_id, auth.uid())));

CREATE POLICY "Members vote" ON public.collab_poll_votes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.collab_polls p WHERE p.id = poll_id AND is_collab_member(p.conversation_id, auth.uid()) AND p.closed_at IS NULL));

CREATE POLICY "Update own vote" ON public.collab_poll_votes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Delete own vote" ON public.collab_poll_votes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.collab_polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collab_poll_votes;
