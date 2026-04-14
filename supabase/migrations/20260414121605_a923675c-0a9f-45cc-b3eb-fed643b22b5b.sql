CREATE POLICY "Authenticated can delete setup requests"
ON public.tenant_setup_requests
FOR DELETE
TO authenticated
USING (true);