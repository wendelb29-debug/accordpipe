
-- Add whatsapp column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp text;

-- Create user_invitations table
CREATE TABLE public.user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_user_id uuid NOT NULL,
  inviter_name text,
  invitee_name text NOT NULL,
  invitee_email text NOT NULL,
  invitee_cpf text,
  invitee_birth_date date,
  invitee_whatsapp text,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  company_name text,
  role text NOT NULL DEFAULT 'leitura',
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Authenticated users can create invitations
CREATE POLICY "Users can create invitations"
ON public.user_invitations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = inviter_user_id);

-- Users can view invitations they created
CREATE POLICY "Users can view own invitations"
ON public.user_invitations
FOR SELECT
TO authenticated
USING (auth.uid() = inviter_user_id);

-- Allow anonymous users to read invitations by token (for accepting)
CREATE POLICY "Anyone can read invitation by token"
ON public.user_invitations
FOR SELECT
TO anon
USING (true);

-- Index for token lookups
CREATE INDEX idx_user_invitations_token ON public.user_invitations(token);
