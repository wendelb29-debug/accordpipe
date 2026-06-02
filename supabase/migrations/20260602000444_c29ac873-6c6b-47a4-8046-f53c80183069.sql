ALTER TABLE public.collab_messages
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS collab_messages_pinned_idx
  ON public.collab_messages(conversation_id, is_pinned)
  WHERE is_pinned = true;