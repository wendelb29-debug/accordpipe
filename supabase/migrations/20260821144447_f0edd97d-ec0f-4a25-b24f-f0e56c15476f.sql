
-- Allow users to see basic info of others in the same company
CREATE OR REPLACE FUNCTION public.get_auth_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

DROP POLICY IF EXISTS "Users can view basic profiles in same tenant" ON public.profiles;
CREATE POLICY "Users can view basic profiles in same tenant"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  company_id = public.get_auth_company_id()
  OR is_master(auth.uid())
);

-- Ensure feed_post_comments has proper RLS
ALTER TABLE public.feed_post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view comments in same tenant" ON public.feed_post_comments;
CREATE POLICY "Users can view comments in same tenant"
ON public.feed_post_comments
FOR SELECT
TO authenticated
USING (
  servidor_id = public.get_auth_company_id()
  OR is_master(auth.uid())
);

DROP POLICY IF EXISTS "Users can insert comments in same tenant" ON public.feed_post_comments;
CREATE POLICY "Users can insert comments in same tenant"
ON public.feed_post_comments
FOR INSERT
TO authenticated
WITH CHECK (
  servidor_id = public.get_auth_company_id()
  AND user_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.feed_post_comments;
CREATE POLICY "Users can delete own comments"
ON public.feed_post_comments
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR is_master(auth.uid())
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'ceo')
);

GRANT SELECT, INSERT, DELETE ON public.feed_post_comments TO authenticated;
GRANT ALL ON public.feed_post_comments TO service_role;
