
-- Create tenant contract sequences table
CREATE TABLE IF NOT EXISTS public.tenant_contract_sequences (
  servidor_id uuid NOT NULL PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  last_number integer NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.tenant_contract_sequences ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write (controlled by trigger)
CREATE POLICY "Service access for tenant sequences"
  ON public.tenant_contract_sequences
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Seed existing data based on current contracts
INSERT INTO public.tenant_contract_sequences (servidor_id, last_number)
SELECT company_id, COUNT(*)::integer
FROM public.contracts
WHERE company_id IS NOT NULL
GROUP BY company_id
ON CONFLICT (servidor_id) DO NOTHING;

-- Create function to get next tenant contract code
CREATE OR REPLACE FUNCTION public.next_tenant_contract_code(_servidor_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _next integer;
BEGIN
  INSERT INTO public.tenant_contract_sequences (servidor_id, last_number)
  VALUES (_servidor_id, 1)
  ON CONFLICT (servidor_id) DO UPDATE SET last_number = tenant_contract_sequences.last_number + 1
  RETURNING last_number INTO _next;
  
  RETURN 'CTR-' || LPAD(_next::text, 4, '0');
END;
$$;

-- Replace the existing trigger function to use per-tenant sequence
CREATE OR REPLACE FUNCTION public.generate_contract_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    NEW.code := public.next_tenant_contract_code(NEW.company_id);
  ELSE
    NEW.code := 'CTR-' || LPAD(nextval('contract_code_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
