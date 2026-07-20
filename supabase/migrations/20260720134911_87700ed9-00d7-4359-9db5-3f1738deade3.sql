
-- Extend whatsapp_contacts with fields for the unified Contacts module
ALTER TABLE public.whatsapp_contacts
  ADD COLUMN IF NOT EXISTS contact_group_id uuid,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'whatsapp_auto' CHECK (source IN ('whatsapp_auto','manual','import','crm_lead')),
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','blocked')),
  ADD COLUMN IF NOT EXISTS name_manually_edited boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wa_chatid text,
  ADD COLUMN IF NOT EXISTS last_interaction_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_wa_contacts_status ON public.whatsapp_contacts(company_id, status);
CREATE INDEX IF NOT EXISTS idx_wa_contacts_group ON public.whatsapp_contacts(contact_group_id);
CREATE INDEX IF NOT EXISTS idx_wa_contacts_last_interaction ON public.whatsapp_contacts(company_id, last_interaction_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_contacts_phone_search ON public.whatsapp_contacts(company_id, phone);
CREATE INDEX IF NOT EXISTS idx_wa_contacts_name_search ON public.whatsapp_contacts(company_id, lower(name));

-- contact_groups: internal tags/segments (distinct from WhatsApp groups)
CREATE TABLE IF NOT EXISTS public.contact_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#8B5CF6',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_groups TO authenticated;
GRANT ALL ON public.contact_groups TO service_role;

ALTER TABLE public.contact_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view contact groups"
  ON public.contact_groups FOR SELECT TO authenticated
  USING (is_master(auth.uid()) OR company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Tenant members can insert contact groups"
  ON public.contact_groups FOR INSERT TO authenticated
  WITH CHECK (is_master(auth.uid()) OR company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Tenant members can update contact groups"
  ON public.contact_groups FOR UPDATE TO authenticated
  USING (is_master(auth.uid()) OR company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Tenant members can delete contact groups"
  ON public.contact_groups FOR DELETE TO authenticated
  USING (is_master(auth.uid()) OR company_id = get_user_company_id(auth.uid()));

CREATE TRIGGER trg_contact_groups_updated_at
  BEFORE UPDATE ON public.contact_groups
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Add FK for contact_group_id
DO $$ BEGIN
  ALTER TABLE public.whatsapp_contacts
    ADD CONSTRAINT whatsapp_contacts_contact_group_fk
    FOREIGN KEY (contact_group_id) REFERENCES public.contact_groups(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- contact_imports: history of CSV/XLSX imports
CREATE TABLE IF NOT EXISTS public.contact_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by uuid,
  file_name text NOT NULL,
  total_rows integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  contact_group_id uuid REFERENCES public.contact_groups(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.contact_imports TO authenticated;
GRANT ALL ON public.contact_imports TO service_role;

ALTER TABLE public.contact_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view contact imports"
  ON public.contact_imports FOR SELECT TO authenticated
  USING (is_master(auth.uid()) OR company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Tenant members can create contact imports"
  ON public.contact_imports FOR INSERT TO authenticated
  WITH CHECK (is_master(auth.uid()) OR company_id = get_user_company_id(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_contact_imports_company ON public.contact_imports(company_id, created_at DESC);
