-- ============================================================
-- FIX 1: Remove overly permissive anon SELECT on contract tables
-- These exposed PII (names, CPF, addresses, signatures) to anyone
-- Edge functions using service_role bypass RLS anyway
-- ============================================================

-- pdf_contract_signers: remove anon SELECT that exposes all signers
DROP POLICY IF EXISTS "Anon can view signer by token" ON public.pdf_contract_signers;

-- contract_signatures: remove anon SELECT that exposes all signatures
DROP POLICY IF EXISTS "Anon can view by token" ON public.contract_signatures;

-- pdf_contracts: remove anon SELECT that exposes all contracts
DROP POLICY IF EXISTS "Anon can view pdf contract for signing" ON public.pdf_contracts;

-- client_contracts: remove anon SELECT that exposes all contracts
DROP POLICY IF EXISTS "Anon can view by signing token" ON public.client_contracts;

-- ============================================================
-- FIX 2: Remove anon INSERT on webhook tables
-- Edge functions use service_role which bypasses RLS
-- ============================================================

DROP POLICY IF EXISTS "Service can insert orbit sales" ON public.vendas_orbit;
DROP POLICY IF EXISTS "Service can insert sales" ON public.vendas_webhook;
DROP POLICY IF EXISTS "Service role can insert webhook events" ON public.zapi_webhook_events;
DROP POLICY IF EXISTS "Anon can insert messages via webhook" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Anon can insert contacts via webhook" ON public.whatsapp_contacts;

-- ============================================================
-- FIX 3: Remove unrestricted anon/auth inserts on history tables
-- ============================================================

DROP POLICY IF EXISTS "Anon can insert history via signing" ON public.pdf_contract_history;
DROP POLICY IF EXISTS "Authenticated can insert history via signing" ON public.pdf_contract_history;
DROP POLICY IF EXISTS "Anon can insert history via token" ON public.client_contract_history;

-- ============================================================
-- FIX 4: whatsapp_sessions - restrict to authenticated only
-- ============================================================

DROP POLICY IF EXISTS "Admin/operador can manage sessions" ON public.whatsapp_sessions;
CREATE POLICY "Admin/operador can manage sessions" ON public.whatsapp_sessions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

-- ============================================================
-- FIX 5: whatsapp_automations - restrict to authenticated + tenant
-- ============================================================

DROP POLICY IF EXISTS "Admin/operador can manage automations" ON public.whatsapp_automations;
CREATE POLICY "Admin/operador can manage automations" ON public.whatsapp_automations
  FOR ALL TO authenticated
  USING (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
    AND company_id = get_user_company_id(auth.uid())
  )
  WITH CHECK (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
    AND company_id = get_user_company_id(auth.uid())
  );

-- ============================================================
-- FIX 6: whatsapp_labels - restrict to authenticated + tenant
-- ============================================================

DROP POLICY IF EXISTS "Admin/operador can manage labels" ON public.whatsapp_labels;
CREATE POLICY "Admin/operador can manage labels" ON public.whatsapp_labels
  FOR ALL TO authenticated
  USING (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
    AND company_id = get_user_company_id(auth.uid())
  )
  WITH CHECK (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
    AND company_id = get_user_company_id(auth.uid())
  );

-- ============================================================
-- FIX 7: pdf_contracts authenticated update - restrict WITH CHECK
-- ============================================================

DROP POLICY IF EXISTS "Authenticated can update pdf contract status on sign" ON public.pdf_contracts;
CREATE POLICY "Authenticated can update pdf contract status on sign" ON public.pdf_contracts
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pdf_contract_signers s
      WHERE s.contract_id = pdf_contracts.id
      AND s.signing_token IS NOT NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pdf_contract_signers s
      WHERE s.contract_id = pdf_contracts.id
      AND s.signing_token IS NOT NULL
    )
  );