CREATE TABLE public.password_reset_otps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  consumed boolean not null default false,
  ip text,
  created_at timestamptz not null default now()
);

GRANT ALL ON public.password_reset_otps TO service_role;

ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_password_reset_otps_user_active
  ON public.password_reset_otps (user_id, consumed, expires_at DESC);

CREATE INDEX idx_password_reset_otps_created_at
  ON public.password_reset_otps (created_at DESC);