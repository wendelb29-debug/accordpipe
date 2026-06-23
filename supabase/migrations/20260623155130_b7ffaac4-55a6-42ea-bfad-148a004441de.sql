
-- documents: scope admin SELECT to own tenant
DROP POLICY IF EXISTS "Users can view documents for their company" ON public.documents;
CREATE POLICY "Users can view documents for their company"
ON public.documents FOR SELECT
USING (
  is_master(auth.uid())
  OR (company_id = get_user_company_id(auth.uid()))
);

-- payments: scope admin SELECT to own tenant
DROP POLICY IF EXISTS "Users can view payments for their company" ON public.payments;
CREATE POLICY "Users can view payments for their company"
ON public.payments FOR SELECT
USING (
  is_master(auth.uid())
  OR (company_id = get_user_company_id(auth.uid()))
);

-- support_requests: admins limited to requests from users in their tenant
DROP POLICY IF EXISTS "Admins can view all requests" ON public.support_requests;
DROP POLICY IF EXISTS "Admins can update requests" ON public.support_requests;

CREATE POLICY "Admins can view tenant requests"
ON public.support_requests FOR SELECT
USING (
  is_master(auth.uid())
  OR (
    has_role(auth.uid(), 'admin'::app_role)
    AND get_user_company_id(user_id) = get_user_company_id(auth.uid())
  )
);

CREATE POLICY "Admins can update tenant requests"
ON public.support_requests FOR UPDATE
USING (
  is_master(auth.uid())
  OR (
    has_role(auth.uid(), 'admin'::app_role)
    AND get_user_company_id(user_id) = get_user_company_id(auth.uid())
  )
);

-- feed_posts: DELETE scoped to tenant for admins
DROP POLICY IF EXISTS "Users delete their own posts or admins delete any" ON public.feed_posts;
CREATE POLICY "Users delete their own posts or tenant admins delete in tenant"
ON public.feed_posts FOR DELETE
USING (
  author_id = auth.uid()
  OR is_master(auth.uid())
  OR (
    has_role(auth.uid(), 'admin'::app_role)
    AND servidor_id = get_user_company_id(auth.uid())
  )
);

-- feed_post_comments: DELETE scoped to tenant for admins
DROP POLICY IF EXISTS "feed_comments_delete_own_or_admin" ON public.feed_post_comments;
CREATE POLICY "feed_comments_delete_own_or_tenant_admin"
ON public.feed_post_comments FOR DELETE
USING (
  user_id = auth.uid()
  OR is_master(auth.uid())
  OR (
    has_role(auth.uid(), 'admin'::app_role)
    AND servidor_id = get_user_company_id(auth.uid())
  )
);

-- vendas_webhook and vendas_orbit: platform-master only (no tenant column to scope by)
DROP POLICY IF EXISTS "Admins can manage sales" ON public.vendas_webhook;
DROP POLICY IF EXISTS "Admins can view all sales" ON public.vendas_webhook;
CREATE POLICY "Master can manage sales"
ON public.vendas_webhook FOR ALL
USING (is_master(auth.uid()))
WITH CHECK (is_master(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage orbit sales" ON public.vendas_orbit;
DROP POLICY IF EXISTS "Admins can view orbit sales" ON public.vendas_orbit;
CREATE POLICY "Master can manage orbit sales"
ON public.vendas_orbit FOR ALL
USING (is_master(auth.uid()))
WITH CHECK (is_master(auth.uid()));

-- Storage: allow tenant users to delete contract pdfs in their own folder
DROP POLICY IF EXISTS "Tenant users can delete generated contract pdfs" ON storage.objects;
CREATE POLICY "Tenant users can delete generated contract pdfs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'contract-pdfs'
  AND (storage.foldername(name))[1] = 'generated'
  AND (storage.foldername(name))[2] = (get_user_company_id(auth.uid()))::text
);
