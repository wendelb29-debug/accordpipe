-- 1. Create extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;

-- 2. Revoke public execute from security definer functions in public schema
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.prosecdef = true
    LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC', 
                       func_record.nspname, func_record.proname, func_record.args);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated, service_role', 
                       func_record.nspname, func_record.proname, func_record.args);
    END LOOP;
END $$;

-- 3. Storage Security
-- Restrict listing on public buckets by removing broad SELECT and adding specific ones
-- Note: Supabase Storage UI/API listing requires SELECT. 
-- By using specific bucket checks, we prevent users from listing other buckets.

-- Allow SELECT only if authenticated for private buckets, 
-- and only by bucket for public ones.
DROP POLICY IF EXISTS "Public select for email-assets" ON storage.objects;
CREATE POLICY "Public select for email-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'email-assets');

DROP POLICY IF EXISTS "Public select for whatsapp-media" ON storage.objects;
CREATE POLICY "Public select for whatsapp-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'whatsapp-media');

-- Ensure authenticated users can still see their own files in private buckets
-- (Assuming they already have policies, but let's be safe)

-- 4. Realtime Security
-- Linter: "Any authenticated user can subscribe to any Realtime channel"
-- We add a policy to realtime.messages (or the relevant table)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'realtime') THEN
        ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can only subscribe to their own channels" ON realtime.messages;
        CREATE POLICY "Users can only subscribe to their own channels"
        ON realtime.messages
        FOR SELECT
        TO authenticated
        USING (
            -- Basic check: topic must contain user id or be a generic allowed topic
            topic LIKE '%' || auth.uid()::text || '%'
            OR topic IN ('notifications', 'public_feed')
        );
    END IF;
END $$;
