ALTER TABLE public.user_invitations
ADD COLUMN IF NOT EXISTS trial_expires_at timestamptz;

DROP FUNCTION IF EXISTS public.get_user_invitation_by_token(text);

CREATE OR REPLACE FUNCTION public.get_user_invitation_by_token(p_token text)
RETURNS TABLE(id uuid, status text, expires_at timestamp with time zone, role text, invitee_name text, invitee_email text, invitee_cpf text, invitee_birth_date date, invitee_whatsapp text, company_id uuid, trial_expires_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT id, status, expires_at, role::text, invitee_name, invitee_email,
         invitee_cpf, invitee_birth_date, invitee_whatsapp, company_id, trial_expires_at
  FROM public.user_invitations
  WHERE token = p_token
  LIMIT 1;
$function$;