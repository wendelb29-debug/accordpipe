
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  header_type text NOT NULL DEFAULT 'none',
  header_text text,
  header_media_url text,
  header_media_doc_name text,
  body text NOT NULL DEFAULT '',
  footer text,
  buttons jsonb NOT NULL DEFAULT '[]'::jsonb,
  variable_count integer NOT NULL DEFAULT 0,
  is_favorite boolean NOT NULL DEFAULT false,
  category text,
  language text NOT NULL DEFAULT 'pt_BR',
  status text NOT NULL DEFAULT 'aprovado',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_templates_header_type_check CHECK (header_type IN ('none','text','image','video','document','audio'))
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_tenant ON public.whatsapp_templates(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_templates TO authenticated;
GRANT ALL ON public.whatsapp_templates TO service_role;

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members view templates"
  ON public.whatsapp_templates FOR SELECT TO authenticated
  USING (
    public.is_master(auth.uid())
    OR tenant_id = public.get_user_company_id(auth.uid())
  );

CREATE POLICY "Tenant members insert templates"
  ON public.whatsapp_templates FOR INSERT TO authenticated
  WITH CHECK (
    public.is_master(auth.uid())
    OR tenant_id = public.get_user_company_id(auth.uid())
  );

CREATE POLICY "Tenant members update templates"
  ON public.whatsapp_templates FOR UPDATE TO authenticated
  USING (
    public.is_master(auth.uid())
    OR tenant_id = public.get_user_company_id(auth.uid())
  )
  WITH CHECK (
    public.is_master(auth.uid())
    OR tenant_id = public.get_user_company_id(auth.uid())
  );

CREATE POLICY "Tenant members delete templates"
  ON public.whatsapp_templates FOR DELETE TO authenticated
  USING (
    public.is_master(auth.uid())
    OR tenant_id = public.get_user_company_id(auth.uid())
  );

CREATE TRIGGER trg_whatsapp_templates_updated_at
BEFORE UPDATE ON public.whatsapp_templates
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
