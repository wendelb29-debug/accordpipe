
-- Create user_signatures table with unique constraint on user_id
CREATE TABLE IF NOT EXISTS public.user_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  cpf text NOT NULL,
  birth_date date,
  email text NOT NULL,
  phone text,
  cargo text,
  signature_image_url text,
  signature_type text NOT NULL DEFAULT 'typed',
  signature_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_signatures ENABLE ROW LEVEL SECURITY;

-- Users can insert only their own signature
CREATE POLICY "Users can insert own signature"
ON public.user_signatures FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view only their own signature
CREATE POLICY "Users can view own signature"
ON public.user_signatures FOR SELECT TO authenticated
USING (auth.uid() = user_id OR is_admin(auth.uid()) OR is_master(auth.uid()));

-- No update or delete (immutable signatures)

-- Add signature_completed to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'signature_completed'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN signature_completed boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Create function to generate SHA-256 hash for signature integrity
CREATE OR REPLACE FUNCTION public.generate_signature_hash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.signature_hash := encode(
    extensions.digest(
      NEW.user_id::text || NEW.full_name || NEW.cpf || NEW.email || COALESCE(NEW.signature_image_url, '') || NEW.created_at::text,
      'sha256'
    ),
    'hex'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_signature_hash
BEFORE INSERT ON public.user_signatures
FOR EACH ROW
EXECUTE FUNCTION public.generate_signature_hash();
