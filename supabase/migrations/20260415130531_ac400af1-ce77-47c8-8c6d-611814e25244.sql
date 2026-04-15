ALTER TABLE public.tenant_subscriptions
  ADD COLUMN IF NOT EXISTS monthly_price_snapshot numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS yearly_price_snapshot numeric NOT NULL DEFAULT 0;