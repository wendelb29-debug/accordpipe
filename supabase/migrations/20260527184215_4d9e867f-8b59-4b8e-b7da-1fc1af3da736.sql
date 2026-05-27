DROP POLICY IF EXISTS "Members see conversations" ON public.collab_conversations;

CREATE POLICY "Members see conversations"
ON public.collab_conversations
FOR SELECT
TO authenticated
USING (
  public.user_has_tenant_access(auth.uid(), servidor_id)
  AND (
    kind = 'channel'
    OR created_by = auth.uid()
    OR public.is_collab_member(id, auth.uid())
  )
);