ALTER TABLE public.collab_conversations
ADD COLUMN IF NOT EXISTS invite_token text NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', '');

CREATE UNIQUE INDEX IF NOT EXISTS collab_conversations_invite_token_key
ON public.collab_conversations(invite_token);