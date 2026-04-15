
-- 1. Make documents bucket private
UPDATE storage.buckets SET public = false WHERE id = 'documents';

-- 2. Drop existing policies
DROP POLICY IF EXISTS "Allow public read access on documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads on documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes on documents" ON storage.objects;
DROP POLICY IF EXISTS "documents_auth_select" ON storage.objects;
DROP POLICY IF EXISTS "documents_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "documents_auth_delete" ON storage.objects;
DROP POLICY IF EXISTS "documents_auth_update" ON storage.objects;

-- 3. Create proper RLS policies for documents bucket
CREATE POLICY "documents_auth_select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "documents_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "documents_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "documents_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');

-- 4. Performance indexes
CREATE INDEX IF NOT EXISTS idx_crm_leads_servidor_id ON public.crm_leads(servidor_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_workspace_id ON public.crm_leads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_lead_status ON public.crm_leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_created_by ON public.crm_leads(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_stage ON public.crm_leads(stage);

CREATE INDEX IF NOT EXISTS idx_crm_lead_activities_lead_id ON public.crm_lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_activities_servidor_id ON public.crm_lead_activities(servidor_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_activities_created_at ON public.crm_lead_activities(created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_servidor_id ON public.notifications(servidor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_companies_parent_tenant ON public.companies(parent_tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);

CREATE INDEX IF NOT EXISTS idx_card_history_workspace ON public.card_history(workspace_id);
CREATE INDEX IF NOT EXISTS idx_card_history_lead ON public.card_history(lead_id);

CREATE INDEX IF NOT EXISTS idx_pdf_contracts_servidor ON public.pdf_contracts(servidor_id);
CREATE INDEX IF NOT EXISTS idx_drive_files_servidor ON public.drive_files(servidor_id);
CREATE INDEX IF NOT EXISTS idx_drive_files_parent ON public.drive_files(parent_id);
