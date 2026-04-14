
-- Adicionar coluna processing_status na tabela de eventos webhook
ALTER TABLE public.tenant_asaas_webhook_events
ADD COLUMN IF NOT EXISTS processing_status text NOT NULL DEFAULT 'pending';

-- Adicionar colunas de visualização na tabela de pagamentos
ALTER TABLE public.tenant_asaas_payments
ADD COLUMN IF NOT EXISTS boleto_viewed_at timestamptz,
ADD COLUMN IF NOT EXISTS checkout_viewed_at timestamptz;
