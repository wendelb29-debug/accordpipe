-- Módulo de Notificação de Leads
-- Implementa controle de idempotência, logs de notificação e regras de disparo seguro.

-- 1. Tabela de logs e idempotência para notificações
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
    lead_id uuid REFERENCES public.crm_leads(id) ON DELETE CASCADE,
    event_type text NOT NULL, -- 'new_lead', 'lead_transferred'
    idempotency_key text UNIQUE NOT NULL,
    recipient_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_email text NOT NULL,
    status text NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'suppressed'
    attempts integer NOT NULL DEFAULT 0,
    error_message text,
    created_at timestamptz DEFAULT now(),
    sent_at timestamptz
);

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.notification_logs TO authenticated;
GRANT ALL ON public.notification_logs TO service_role;

-- RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own notification logs"
ON public.notification_logs
FOR SELECT
TO authenticated
USING (recipient_user_id = auth.uid());

-- Índices para performance e segurança
CREATE INDEX IF NOT EXISTS idx_notif_logs_idempotency ON public.notification_logs(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_notif_logs_tenant_lead ON public.notification_logs(tenant_id, lead_id);
