-- Allow authenticated users to upload generated contract PDFs under their tenant folder
CREATE POLICY "Tenant users can upload generated contract pdfs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contract-pdfs'
  AND (storage.foldername(name))[1] = 'generated'
  AND (storage.foldername(name))[2] = public.get_user_company_id(auth.uid())::text
);

CREATE POLICY "Tenant users can update generated contract pdfs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'contract-pdfs'
  AND (storage.foldername(name))[1] = 'generated'
  AND (storage.foldername(name))[2] = public.get_user_company_id(auth.uid())::text
)
WITH CHECK (
  bucket_id = 'contract-pdfs'
  AND (storage.foldername(name))[1] = 'generated'
  AND (storage.foldername(name))[2] = public.get_user_company_id(auth.uid())::text
);

CREATE POLICY "Tenant users can read generated contract pdfs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'contract-pdfs'
  AND (storage.foldername(name))[1] = 'generated'
  AND (storage.foldername(name))[2] = public.get_user_company_id(auth.uid())::text
);