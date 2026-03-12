
-- Add trial fields to companies
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS is_trial boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_start timestamp with time zone,
ADD COLUMN IF NOT EXISTS trial_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS trial_extensions integer NOT NULL DEFAULT 0;

-- Create function to auto-block expired trials
CREATE OR REPLACE FUNCTION public.block_expired_trials()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.companies
  SET status = 'expirado'
  WHERE is_trial = true
    AND status NOT IN ('expirado', 'cancelled')
    AND trial_expires_at IS NOT NULL
    AND trial_expires_at <= now();
    
  -- Also deactivate all users of expired trial companies
  UPDATE public.profiles
  SET is_active = false, status = 'bloqueado'
  WHERE company_id IN (
    SELECT id FROM public.companies
    WHERE is_trial = true AND status = 'expirado'
  )
  AND is_active = true;
END;
$$;

-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Allow master users to view trial companies
-- Update the company SELECT policy to include trial companies
DROP POLICY IF EXISTS "Users can view their company or master sees all" ON public.companies;
CREATE POLICY "Users can view their company or master sees all"
ON public.companies
FOR SELECT
USING (
  is_master(auth.uid()) 
  OR (id = get_user_company_id(auth.uid())) 
  OR (servidor_id = get_user_company_id(auth.uid()))
);
