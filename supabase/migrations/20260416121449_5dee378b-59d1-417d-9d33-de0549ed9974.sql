ALTER TABLE public.tenant_asaas_payments
  ADD COLUMN IF NOT EXISTS pix_payload TEXT,
  ADD COLUMN IF NOT EXISTS pix_qrcode_url TEXT,
  ADD COLUMN IF NOT EXISTS pix_expiration TIMESTAMPTZ;