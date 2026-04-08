
-- Add workspace_id and lead_id to whatsapp_contacts
ALTER TABLE public.whatsapp_contacts 
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_workspace ON public.whatsapp_contacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_lead ON public.whatsapp_contacts(lead_id);

-- WhatsApp workspace config table
CREATE TABLE IF NOT EXISTS public.whatsapp_workspace_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, workspace_id)
);

ALTER TABLE public.whatsapp_workspace_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage whatsapp workspace config"
  ON public.whatsapp_workspace_config FOR ALL
  TO authenticated
  USING (is_master(auth.uid()) OR ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role)) AND company_id = get_user_company_id(auth.uid())))
  WITH CHECK (is_master(auth.uid()) OR ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role)) AND company_id = get_user_company_id(auth.uid())));

CREATE POLICY "Users can view whatsapp workspace config"
  ON public.whatsapp_workspace_config FOR SELECT
  TO authenticated
  USING (is_master(auth.uid()) OR company_id = get_user_company_id(auth.uid()));

-- WhatsApp routing rules table
CREATE TABLE IF NOT EXISTS public.whatsapp_routing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  rule_type text NOT NULL DEFAULT 'keyword',
  rule_value text NOT NULL,
  priority integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_routing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage routing rules"
  ON public.whatsapp_routing_rules FOR ALL
  TO authenticated
  USING (is_master(auth.uid()) OR ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role)) AND company_id = get_user_company_id(auth.uid())))
  WITH CHECK (is_master(auth.uid()) OR ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role)) AND company_id = get_user_company_id(auth.uid())));

CREATE POLICY "Users can view routing rules"
  ON public.whatsapp_routing_rules FOR SELECT
  TO authenticated
  USING (is_master(auth.uid()) OR company_id = get_user_company_id(auth.uid()));

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_workspace_config;
