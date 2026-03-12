
-- Create payments table
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  kiwify_order_id text NOT NULL,
  produto text,
  forma_pagamento text,
  status text NOT NULL DEFAULT 'pending',
  valor numeric(10,2),
  customer_email text,
  customer_name text,
  raw_payload jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(kiwify_order_id)
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Only admins can view payments
CREATE POLICY "Admins can view payments"
ON public.payments FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Allow service role inserts (edge function uses service role)
-- No INSERT policy for anon/authenticated needed since webhook uses service role

-- Trigger for updated_at
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
