
-- 1. Create contract_fields table for storing draggable field positions on PDF
CREATE TABLE public.pdf_contract_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.pdf_contracts(id) ON DELETE CASCADE,
  field_type text NOT NULL DEFAULT 'signature',
  label text,
  pos_x double precision NOT NULL DEFAULT 0,
  pos_y double precision NOT NULL DEFAULT 0,
  width double precision NOT NULL DEFAULT 200,
  height double precision NOT NULL DEFAULT 50,
  page integer NOT NULL DEFAULT 0,
  signer_id uuid REFERENCES public.pdf_contract_signers(id) ON DELETE SET NULL,
  signer_color text DEFAULT '#3b82f6',
  required boolean NOT NULL DEFAULT true,
  value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pdf_contract_fields ENABLE ROW LEVEL SECURITY;

-- 2. Add sign_mode to pdf_contracts (sequential or parallel)
ALTER TABLE public.pdf_contracts ADD COLUMN IF NOT EXISTS sign_mode text NOT NULL DEFAULT 'parallel';

-- 3. RLS for pdf_contract_fields using security definer to avoid recursion
CREATE OR REPLACE FUNCTION public.get_pdf_contract_servidor(_contract_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT servidor_id FROM public.pdf_contracts WHERE id = _contract_id LIMIT 1
$$;

-- Fields: Master/CEO can manage
CREATE POLICY "Master/CEO can manage pdf contract fields"
ON public.pdf_contract_fields
FOR ALL
TO authenticated
USING (
  is_master(auth.uid()) OR (
    has_role(auth.uid(), 'ceo') AND 
    get_pdf_contract_servidor(contract_id) = get_user_company_id(auth.uid())
  )
)
WITH CHECK (
  is_master(auth.uid()) OR (
    has_role(auth.uid(), 'ceo') AND 
    get_pdf_contract_servidor(contract_id) = get_user_company_id(auth.uid())
  )
);

-- Fields: Users can view for their servidor
CREATE POLICY "Users can view pdf contract fields"
ON public.pdf_contract_fields
FOR SELECT
TO authenticated
USING (
  is_master(auth.uid()) OR 
  get_pdf_contract_servidor(contract_id) = get_user_company_id(auth.uid())
);

-- Fields: Anon can view via signing token
CREATE POLICY "Anon can view fields for signing"
ON public.pdf_contract_fields
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.pdf_contract_signers s
    WHERE s.contract_id = pdf_contract_fields.contract_id
    AND s.signing_token IS NOT NULL
  )
);

-- 4. Fix infinite recursion on pdf_contracts: Drop problematic policies and recreate using security definer
-- Drop the policies that cause recursion (they reference pdf_contract_signers which references back)
DROP POLICY IF EXISTS "Anon can update pdf contract status on sign" ON public.pdf_contracts;
DROP POLICY IF EXISTS "Authenticated can update pdf contract status on sign" ON public.pdf_contracts;
DROP POLICY IF EXISTS "Authenticated can view pdf contract for signing" ON public.pdf_contracts;

-- Security definer function to check if a contract has a valid signer token
CREATE OR REPLACE FUNCTION public.pdf_contract_has_signer_token(_contract_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pdf_contract_signers
    WHERE contract_id = _contract_id
    AND signing_token IS NOT NULL
  )
$$;

-- Recreate policies without recursion
CREATE POLICY "Anon can update pdf contract status on sign"
ON public.pdf_contracts
FOR UPDATE
TO anon
USING (pdf_contract_has_signer_token(id))
WITH CHECK (status = 'assinado');

CREATE POLICY "Authenticated can update pdf contract status on sign"
ON public.pdf_contracts
FOR UPDATE
TO authenticated
USING (pdf_contract_has_signer_token(id))
WITH CHECK (pdf_contract_has_signer_token(id));

CREATE POLICY "Authenticated can view pdf contract for signing"
ON public.pdf_contracts
FOR SELECT
TO authenticated
USING (pdf_contract_has_signer_token(id));

-- Anon can view pdf contract for signing
CREATE POLICY "Anon can view pdf contract for signing"
ON public.pdf_contracts
FOR SELECT
TO anon
USING (pdf_contract_has_signer_token(id));

-- Also fix pdf_contract_signers policies that might cause recursion
DROP POLICY IF EXISTS "Master/CEO can manage signers" ON public.pdf_contract_signers;
DROP POLICY IF EXISTS "Users can view signers for their servidor" ON public.pdf_contract_signers;

CREATE POLICY "Master/CEO can manage signers"
ON public.pdf_contract_signers
FOR ALL
TO authenticated
USING (
  is_master(auth.uid()) OR (
    has_role(auth.uid(), 'ceo') AND 
    get_pdf_contract_servidor(contract_id) = get_user_company_id(auth.uid())
  )
)
WITH CHECK (
  is_master(auth.uid()) OR (
    has_role(auth.uid(), 'ceo') AND 
    get_pdf_contract_servidor(contract_id) = get_user_company_id(auth.uid())
  )
);

CREATE POLICY "Users can view signers for their servidor"
ON public.pdf_contract_signers
FOR SELECT
TO authenticated
USING (
  is_master(auth.uid()) OR 
  get_pdf_contract_servidor(contract_id) = get_user_company_id(auth.uid())
);

-- Fix pdf_contract_history policies too
DROP POLICY IF EXISTS "Master/CEO can insert pdf contract history" ON public.pdf_contract_history;
DROP POLICY IF EXISTS "Users can view pdf contract history" ON public.pdf_contract_history;

CREATE POLICY "Master/CEO can insert pdf contract history"
ON public.pdf_contract_history
FOR INSERT
TO authenticated
WITH CHECK (
  is_master(auth.uid()) OR (
    has_role(auth.uid(), 'ceo') AND 
    get_pdf_contract_servidor(contract_id) = get_user_company_id(auth.uid())
  )
);

CREATE POLICY "Users can view pdf contract history"
ON public.pdf_contract_history
FOR SELECT
TO authenticated
USING (
  is_master(auth.uid()) OR 
  get_pdf_contract_servidor(contract_id) = get_user_company_id(auth.uid())
);

-- Also allow admin role to manage pdf contracts (not just CEO)
DROP POLICY IF EXISTS "Master/CEO can manage pdf contracts" ON public.pdf_contracts;
CREATE POLICY "Master/Admin/CEO can manage pdf contracts"
ON public.pdf_contracts
FOR ALL
TO authenticated
USING (
  is_master(auth.uid()) OR (
    (has_role(auth.uid(), 'ceo') OR has_role(auth.uid(), 'admin')) AND 
    servidor_id = get_user_company_id(auth.uid())
  )
)
WITH CHECK (
  is_master(auth.uid()) OR (
    (has_role(auth.uid(), 'ceo') OR has_role(auth.uid(), 'admin')) AND 
    servidor_id = get_user_company_id(auth.uid())
  )
);
