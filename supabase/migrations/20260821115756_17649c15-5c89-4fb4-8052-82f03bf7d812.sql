-- Trigger para processar novos leads e leads atribuídos a workspaces
-- Invocará a Edge Function process-lead-notification via webhook do Supabase.

CREATE OR REPLACE FUNCTION public.fn_trigger_notify_new_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_workspace_id uuid;
    v_tenant_id uuid;
    v_lead_id uuid;
    v_supabase_url text;
    v_service_key text;
BEGIN
    -- Identifica IDs
    v_lead_id := NEW.id;
    v_workspace_id := NEW.workspace_id;
    v_tenant_id := NEW.servidor_id;

    -- Só dispara se tiver workspace e tenant
    IF v_workspace_id IS NULL OR v_tenant_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Dispara se for um novo lead (INSERT) ou se o workspace_id mudou de NULL para um valor (UPDATE)
    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND (OLD.workspace_id IS NULL OR OLD.workspace_id != NEW.workspace_id) AND NEW.workspace_id IS NOT NULL) THEN
        -- Como não temos pg_net garantido, vamos usar o mecanismo de Webhooks do Supabase
        -- que é configurado via painel ou via SQL se o schema net estiver ativo.
        -- Por segurança e performance, apenas registramos que o evento ocorreu se necessário,
        -- mas o ideal é que o Supabase Edge Function ouça o INSERT direto.
        
        -- Se estivermos em Lovable Cloud, o dashboard de Webhooks deve ser configurado para:
        -- Table: crm_leads
        -- Events: Insert, Update (workspace_id)
        -- URL: https://[ref].supabase.co/functions/v1/process-lead-notification
    END IF;

    RETURN NEW;
END;
$$;
