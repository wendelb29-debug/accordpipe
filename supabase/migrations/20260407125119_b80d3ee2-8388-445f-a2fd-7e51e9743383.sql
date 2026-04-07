-- Drop the dangerous public UPDATE policy on contract_signatures
-- Signing is handled exclusively via the sign-contract edge function with service_role
DROP POLICY IF EXISTS "Anyone can update signature via token" ON public.contract_signatures;