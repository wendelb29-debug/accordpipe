
REVOKE SELECT (zapi_token, zapi_client_token, webhook_token) ON public.companies FROM authenticated;
REVOKE SELECT (zapi_token, zapi_client_token, webhook_token) ON public.companies FROM anon;

REVOKE SELECT (invite_token) ON public.collab_conversations FROM authenticated;
REVOKE SELECT (invite_token) ON public.collab_conversations FROM anon;

CREATE OR REPLACE FUNCTION public.get_collab_invite_token(_conv_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.invite_token
  FROM public.collab_conversations c
  WHERE c.id = _conv_id
    AND (
      c.created_by = auth.uid()
      OR public.is_collab_admin(c.id, auth.uid())
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_collab_invite_token(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_collab_invite_token(uuid) TO authenticated;
