
-- Create vendas_webhook table
CREATE TABLE public.vendas_webhook (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id text NOT NULL,
  mentor_nome text NOT NULL,
  nome_aluno text NOT NULL,
  email_aluno text NOT NULL,
  produto text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  data_venda timestamp with time zone NOT NULL DEFAULT now(),
  origem text NOT NULL DEFAULT 'manual',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vendas_webhook ENABLE ROW LEVEL SECURITY;

-- Admins can view all sales
CREATE POLICY "Admins can view all sales"
ON public.vendas_webhook
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()) OR public.is_master(auth.uid()));

-- Service role inserts via webhook (anon for edge function with service role key)
CREATE POLICY "Service can insert sales"
ON public.vendas_webhook
FOR INSERT
TO anon
WITH CHECK (true);

-- Also allow service role insert for authenticated
CREATE POLICY "Admins can manage sales"
ON public.vendas_webhook
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()) OR public.is_master(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()) OR public.is_master(auth.uid()));
