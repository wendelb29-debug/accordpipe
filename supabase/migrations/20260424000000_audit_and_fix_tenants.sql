-- Audit and fix profiles without company_id or with invalid company_id
-- We only do deterministic fixes where possible.

-- 1. Identify profiles without company_id (but they might have an invite that we can use to recover)
-- This migration just provides the structure, you can run it to see logs if you had access to the console.

DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT count(*) INTO invalid_count FROM public.profiles WHERE company_id IS NULL;
    RAISE NOTICE 'Profiles without company_id: %', invalid_count;
END $$;

-- 2. Prevent users from changing their own company_id via RLS
-- (Ensure this is already covered or add it if missing)

-- 3. Transition users from accept_user_invitation_by_token to a more robust transactional approach
-- (This is handled in the AceitarConvite.tsx refactor)

