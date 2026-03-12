
-- WhatsApp Sessions
CREATE TABLE public.whatsapp_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected',
  phone_number TEXT,
  session_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/operador can manage sessions" ON public.whatsapp_sessions
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));

CREATE TRIGGER update_whatsapp_sessions_updated_at
  BEFORE UPDATE ON public.whatsapp_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- WhatsApp Contacts
CREATE TABLE public.whatsapp_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  avatar_url TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  assigned_to UUID,
  labels TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/operador can view contacts" ON public.whatsapp_contacts
  FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));

CREATE POLICY "Admin/operador can insert contacts" ON public.whatsapp_contacts
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));

CREATE POLICY "Admin/operador can update contacts" ON public.whatsapp_contacts
  FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));

CREATE POLICY "Admin/operador can delete contacts" ON public.whatsapp_contacts
  FOR DELETE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));

CREATE TRIGGER update_whatsapp_contacts_updated_at
  BEFORE UPDATE ON public.whatsapp_contacts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- WhatsApp Messages
CREATE TABLE public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE NOT NULL,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'inbound',
  status TEXT NOT NULL DEFAULT 'sent',
  message_type TEXT NOT NULL DEFAULT 'text',
  media_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/operador can view messages" ON public.whatsapp_messages
  FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));

CREATE POLICY "Admin/operador can insert messages" ON public.whatsapp_messages
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));

CREATE INDEX idx_whatsapp_messages_contact ON public.whatsapp_messages(contact_id, created_at DESC);
CREATE INDEX idx_whatsapp_messages_company ON public.whatsapp_messages(company_id, created_at DESC);

-- WhatsApp Labels
CREATE TABLE public.whatsapp_labels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/operador can manage labels" ON public.whatsapp_labels
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));

-- WhatsApp Automations
CREATE TABLE public.whatsapp_automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'keyword',
  trigger_value TEXT,
  response_text TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/operador can manage automations" ON public.whatsapp_automations
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));

CREATE TRIGGER update_whatsapp_automations_updated_at
  BEFORE UPDATE ON public.whatsapp_automations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
