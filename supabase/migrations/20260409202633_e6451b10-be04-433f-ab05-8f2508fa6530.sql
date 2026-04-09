
DROP POLICY IF EXISTS "Authenticated users can upload contract PDFs" ON storage.objects;
CREATE POLICY "Authenticated users can upload contract PDFs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'contract-pdfs');

DROP POLICY IF EXISTS "Authenticated users can update contract PDFs" ON storage.objects;
CREATE POLICY "Authenticated users can update contract PDFs"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'contract-pdfs')
WITH CHECK (bucket_id = 'contract-pdfs');
