
-- ============================================================
-- 1) client_contract_signers — restringir signing_token e signer_document
-- ============================================================
REVOKE SELECT ON public.client_contract_signers FROM authenticated;
GRANT SELECT (
  id, contract_id, name, email, signer_type, is_required, status, sign_order,
  signed_at, signer_ip, signature_photo_url, signature_address,
  signature_latitude, signature_longitude, created_at
) ON public.client_contract_signers TO authenticated;

-- ============================================================
-- 2) pdf_contract_signers — restringir signing_token
-- ============================================================
REVOKE SELECT ON public.pdf_contract_signers FROM authenticated;
GRANT SELECT (
  id, contract_id, name, email, phone, cpf_cnpj, address, status, sign_order,
  signed_at, signature_photo_url, signature_latitude, signature_longitude,
  signature_address, signer_ip, created_at
) ON public.pdf_contract_signers TO authenticated;

-- ============================================================
-- 3) document_signers — restringir auth_token e validation_code
-- ============================================================
REVOKE SELECT ON public.document_signers FROM authenticated;
GRANT SELECT (
  id, document_id, nome_completo, email, telefone, cpf, data_nascimento,
  papel, obrigatorio, ordem, status, validation_code_expires_at,
  viewed_at, validated_at, signed_at, rejected_at, reject_reason,
  ip_address, user_agent, location_text, location_lat, location_lng,
  selfie_url, created_at, updated_at
) ON public.document_signers TO authenticated;

-- service_role keeps full access (already granted ALL elsewhere; ensure it)
GRANT ALL ON public.client_contract_signers TO service_role;
GRANT ALL ON public.pdf_contract_signers TO service_role;
GRANT ALL ON public.document_signers TO service_role;

-- ============================================================
-- 4) Admin-only RPCs to return rows WITH tokens (for copy-link UIs)
-- ============================================================

-- Helper: is the current user an admin/ceo for the given tenant?
CREATE OR REPLACE FUNCTION public._is_signer_admin(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_master(auth.uid())
    OR (
      _company_id IS NOT NULL
      AND _company_id = public.get_user_company_id(auth.uid())
      AND (
        public.has_role(auth.uid(), 'ceo'::app_role)
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'administrativo'::app_role)
      )
    );
$$;

REVOKE ALL ON FUNCTION public._is_signer_admin(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public._is_signer_admin(uuid) TO authenticated, service_role;

-- Client contract signers (admin)
CREATE OR REPLACE FUNCTION public.get_client_contract_signers_admin(_contract_id uuid)
RETURNS SETOF public.client_contract_signers
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company_id uuid;
BEGIN
  _company_id := public.get_contract_company_id(_contract_id);
  IF NOT public._is_signer_admin(_company_id) THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT * FROM public.client_contract_signers
    WHERE contract_id = _contract_id
    ORDER BY sign_order;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_contract_signers_admin(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_client_contract_signers_admin(uuid) TO authenticated, service_role;

-- PDF contract signers (admin)
CREATE OR REPLACE FUNCTION public.get_pdf_contract_signers_admin(_contract_id uuid)
RETURNS SETOF public.pdf_contract_signers
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company_id uuid;
BEGIN
  SELECT servidor_id INTO _company_id
  FROM public.pdf_contracts WHERE id = _contract_id;

  IF NOT public._is_signer_admin(_company_id) THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT * FROM public.pdf_contract_signers
    WHERE contract_id = _contract_id
    ORDER BY sign_order;
END;
$$;

REVOKE ALL ON FUNCTION public.get_pdf_contract_signers_admin(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_pdf_contract_signers_admin(uuid) TO authenticated, service_role;

-- Document signers (admin)
CREATE OR REPLACE FUNCTION public.get_document_signers_admin(_document_id uuid)
RETURNS SETOF public.document_signers
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company_id uuid;
BEGIN
  SELECT servidor_id INTO _company_id
  FROM public.generated_documents WHERE id = _document_id;

  IF NOT public._is_signer_admin(_company_id) THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT * FROM public.document_signers
    WHERE document_id = _document_id
    ORDER BY ordem;
END;
$$;

REVOKE ALL ON FUNCTION public.get_document_signers_admin(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_document_signers_admin(uuid) TO authenticated, service_role;
