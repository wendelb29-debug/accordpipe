-- Add new columns to proposal_catalog_items
ALTER TABLE public.proposal_catalog_items
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'servico',
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS recurrence_type text NOT NULL DEFAULT 'mensal',
  ADD COLUMN IF NOT EXISTS default_quantity integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS internal_code text,
  ADD COLUMN IF NOT EXISTS internal_notes text;

-- Index for filtering active items per tenant
CREATE INDEX IF NOT EXISTS idx_catalog_items_tenant_active 
  ON public.proposal_catalog_items(servidor_id, is_active);
