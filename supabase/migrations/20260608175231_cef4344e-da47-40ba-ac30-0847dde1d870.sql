
-- ============================================================
-- ACCORD MARKETING — campanhas de disparo em massa
-- ============================================================

-- 1) marketing_campaigns
CREATE TABLE public.marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servidor_id uuid NOT NULL,
  created_by uuid NOT NULL,
  name text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('whatsapp','email')),
  subject text,
  body text NOT NULL DEFAULT '',
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  audience_source text NOT NULL DEFAULT 'manual' CHECK (audience_source IN ('clients','leads','csv','manual')),
  audience_filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','queued','running','paused','completed','failed','cancelled')),
  email_provider text CHECK (email_provider IN ('gmail','outlook')),
  email_connection_id uuid,
  throttle_min_ms integer NOT NULL DEFAULT 5000,
  throttle_max_ms integer NOT NULL DEFAULT 15000,
  total_recipients integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  media_url text,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_campaigns TO authenticated;
GRANT ALL ON public.marketing_campaigns TO service_role;

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master/Admin/CEO can view tenant campaigns"
ON public.marketing_campaigns FOR SELECT TO authenticated
USING (
  public.is_master(auth.uid())
  OR (
    servidor_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'ceo'::app_role))
  )
);

CREATE POLICY "Master/Admin/CEO can insert tenant campaigns"
ON public.marketing_campaigns FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    public.is_master(auth.uid())
    OR (
      servidor_id = public.get_user_company_id(auth.uid())
      AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'ceo'::app_role))
    )
  )
);

CREATE POLICY "Master/Admin/CEO can update tenant campaigns"
ON public.marketing_campaigns FOR UPDATE TO authenticated
USING (
  public.is_master(auth.uid())
  OR (
    servidor_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'ceo'::app_role))
  )
);

CREATE POLICY "Master/Admin/CEO can delete tenant campaigns"
ON public.marketing_campaigns FOR DELETE TO authenticated
USING (
  public.is_master(auth.uid())
  OR (
    servidor_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'ceo'::app_role))
  )
);

CREATE INDEX idx_marketing_campaigns_servidor ON public.marketing_campaigns(servidor_id, status);
CREATE INDEX idx_marketing_campaigns_status ON public.marketing_campaigns(status) WHERE status IN ('running','queued');

CREATE TRIGGER tg_marketing_campaigns_updated_at
  BEFORE UPDATE ON public.marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2) marketing_campaign_recipients
CREATE TABLE public.marketing_campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  servidor_id uuid NOT NULL,
  name text,
  contact text NOT NULL,
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','skipped')),
  sent_at timestamptz,
  error_message text,
  provider_message_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_campaign_recipients TO authenticated;
GRANT ALL ON public.marketing_campaign_recipients TO service_role;

ALTER TABLE public.marketing_campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master/Admin/CEO can view tenant recipients"
ON public.marketing_campaign_recipients FOR SELECT TO authenticated
USING (
  public.is_master(auth.uid())
  OR (
    servidor_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'ceo'::app_role))
  )
);

CREATE POLICY "Master/Admin/CEO can insert tenant recipients"
ON public.marketing_campaign_recipients FOR INSERT TO authenticated
WITH CHECK (
  public.is_master(auth.uid())
  OR (
    servidor_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'ceo'::app_role))
  )
);

CREATE POLICY "Master/Admin/CEO can update tenant recipients"
ON public.marketing_campaign_recipients FOR UPDATE TO authenticated
USING (
  public.is_master(auth.uid())
  OR (
    servidor_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'ceo'::app_role))
  )
);

CREATE POLICY "Master/Admin/CEO can delete tenant recipients"
ON public.marketing_campaign_recipients FOR DELETE TO authenticated
USING (
  public.is_master(auth.uid())
  OR (
    servidor_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'ceo'::app_role))
  )
);

CREATE INDEX idx_mkt_recipients_campaign ON public.marketing_campaign_recipients(campaign_id, status);
CREATE INDEX idx_mkt_recipients_servidor ON public.marketing_campaign_recipients(servidor_id);

CREATE TRIGGER tg_mkt_recipients_updated_at
  BEFORE UPDATE ON public.marketing_campaign_recipients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3) marketing_email_connections (OAuth Gmail/Outlook por usuário)
CREATE TABLE public.marketing_email_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  servidor_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('gmail','outlook')),
  email_address text NOT NULL,
  display_name text,
  access_token text,
  refresh_token text,
  token_type text,
  scope text,
  expires_at timestamptz,
  daily_send_limit integer NOT NULL DEFAULT 300,
  sent_today integer NOT NULL DEFAULT 0,
  last_reset_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider, email_address)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_email_connections TO authenticated;
GRANT ALL ON public.marketing_email_connections TO service_role;

ALTER TABLE public.marketing_email_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own email connections"
ON public.marketing_email_connections FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_mkt_email_conn_user ON public.marketing_email_connections(user_id);
CREATE INDEX idx_mkt_email_conn_servidor ON public.marketing_email_connections(servidor_id);

CREATE TRIGGER tg_mkt_email_conn_updated_at
  BEFORE UPDATE ON public.marketing_email_connections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- FK marketing_campaigns -> marketing_email_connections (after table exists)
ALTER TABLE public.marketing_campaigns
  ADD CONSTRAINT fk_marketing_campaigns_email_conn
  FOREIGN KEY (email_connection_id) REFERENCES public.marketing_email_connections(id) ON DELETE SET NULL;

-- Realtime for campaign progress
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketing_campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketing_campaign_recipients;
