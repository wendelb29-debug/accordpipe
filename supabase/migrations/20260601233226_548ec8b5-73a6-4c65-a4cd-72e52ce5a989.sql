-- Extend collab_polls to support message-anchored, multi-choice and anonymous polls
ALTER TABLE public.collab_polls
  ADD COLUMN IF NOT EXISTS message_id uuid REFERENCES public.collab_messages(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS multi      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS anonymous  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS closed     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS closes_at  timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS collab_polls_message_id_uidx
  ON public.collab_polls(message_id)
  WHERE message_id IS NOT NULL;

-- Allow multi-choice votes (drop old per-user unique, add per-option unique)
ALTER TABLE public.collab_poll_votes
  DROP CONSTRAINT IF EXISTS collab_poll_votes_poll_id_user_id_key;

ALTER TABLE public.collab_poll_votes
  ADD COLUMN IF NOT EXISTS servidor_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS collab_poll_votes_unique_per_option
  ON public.collab_poll_votes(poll_id, user_id, option_id);

-- Update vote insert policy to also respect the new `closed` flag
DROP POLICY IF EXISTS "Members vote" ON public.collab_poll_votes;
CREATE POLICY "Members vote" ON public.collab_poll_votes
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.collab_polls p
      WHERE p.id = poll_id
        AND is_collab_member(p.conversation_id, auth.uid())
        AND p.closed_at IS NULL
        AND COALESCE(p.closed, false) = false
    )
  );