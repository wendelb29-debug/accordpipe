
-- 1) contracts: tenant-scoped SELECT
DROP POLICY IF EXISTS "Authenticated can view contracts" ON public.contracts;
CREATE POLICY "Tenant members can view contracts"
ON public.contracts FOR SELECT TO authenticated
USING (
  is_master(auth.uid())
  OR (
    company_id = get_user_company_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role)
         OR has_role(auth.uid(), 'operador'::app_role)
         OR has_role(auth.uid(), 'ceo'::app_role)
         OR has_role(auth.uid(), 'leitura'::app_role))
  )
);

-- 2) contract_signatures: scope by parent contract.company_id
DROP POLICY IF EXISTS "Authenticated can view contract signatures" ON public.contract_signatures;
CREATE POLICY "Tenant members can view contract signatures"
ON public.contract_signatures FOR SELECT TO authenticated
USING (
  is_master(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = contract_signatures.contract_id
      AND c.company_id = get_user_company_id(auth.uid())
      AND (has_role(auth.uid(), 'admin'::app_role)
           OR has_role(auth.uid(), 'operador'::app_role)
           OR has_role(auth.uid(), 'ceo'::app_role)
           OR has_role(auth.uid(), 'leitura'::app_role))
  )
);

-- 3) pdf_contract_signers: remove the dangerous "token IS NOT NULL" SELECT
DROP POLICY IF EXISTS "Authenticated can view signer by token" ON public.pdf_contract_signers;
-- Public token-based access already goes through SECURITY DEFINER RPC get_pdf_signer_by_token;
-- internal access remains via "Users can view signers for their servidor".

-- 4) zapi_webhook_events: restrict to Master only (no tenant_id column)
DROP POLICY IF EXISTS "Admins can read webhook events" ON public.zapi_webhook_events;
CREATE POLICY "Master can read webhook events"
ON public.zapi_webhook_events FOR SELECT TO authenticated
USING (is_master(auth.uid()));

-- 5) paddle_subscriptions: fix broken column reference
DROP POLICY IF EXISTS "Tenant members can view own subscription" ON public.paddle_subscriptions;
CREATE POLICY "Tenant members can view own subscription"
ON public.paddle_subscriptions FOR SELECT TO authenticated
USING (
  tenant_id IN (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- 6) tenant_setup_requests: drop public anon SELECT/UPDATE; expose token-based RPCs
DROP POLICY IF EXISTS "Anyone can read by token" ON public.tenant_setup_requests;
DROP POLICY IF EXISTS "Anyone can update by token when pending" ON public.tenant_setup_requests;

CREATE OR REPLACE FUNCTION public.get_tenant_setup_by_token(p_token text)
RETURNS TABLE (
  id uuid, status text, cnpj text, razao_social text, nome_fantasia text,
  responsavel text, email text, telefone text, cep text, endereco text,
  numero text, complemento text, bairro text, cidade text, estado text,
  brand_primary_color text, brand_secondary_color text, brand_accent_color text,
  brand_bg_color text, brand_text_color text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, status, cnpj, razao_social, nome_fantasia, responsavel, email,
         telefone, cep, endereco, numero, complemento, bairro, cidade, estado,
         brand_primary_color, brand_secondary_color, brand_accent_color,
         brand_bg_color, brand_text_color
  FROM public.tenant_setup_requests
  WHERE token = p_token
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.submit_tenant_setup_by_token(p_token text, p_payload jsonb)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _id uuid; _status text;
BEGIN
  SELECT id, status INTO _id, _status
  FROM public.tenant_setup_requests WHERE token = p_token LIMIT 1;
  IF _id IS NULL THEN RETURN false; END IF;
  IF _status NOT IN ('pending', 'submitted') THEN RETURN false; END IF;

  UPDATE public.tenant_setup_requests SET
    cnpj = COALESCE(p_payload->>'cnpj', cnpj),
    razao_social = COALESCE(p_payload->>'razao_social', razao_social),
    nome_fantasia = COALESCE(p_payload->>'nome_fantasia', nome_fantasia),
    responsavel = COALESCE(p_payload->>'responsavel', responsavel),
    email = COALESCE(p_payload->>'email', email),
    telefone = COALESCE(p_payload->>'telefone', telefone),
    cep = COALESCE(p_payload->>'cep', cep),
    endereco = COALESCE(p_payload->>'endereco', endereco),
    numero = COALESCE(p_payload->>'numero', numero),
    complemento = COALESCE(p_payload->>'complemento', complemento),
    bairro = COALESCE(p_payload->>'bairro', bairro),
    cidade = COALESCE(p_payload->>'cidade', cidade),
    estado = COALESCE(p_payload->>'estado', estado),
    brand_primary_color = COALESCE(p_payload->>'brand_primary_color', brand_primary_color),
    brand_secondary_color = COALESCE(p_payload->>'brand_secondary_color', brand_secondary_color),
    brand_accent_color = COALESCE(p_payload->>'brand_accent_color', brand_accent_color),
    brand_bg_color = COALESCE(p_payload->>'brand_bg_color', brand_bg_color),
    brand_text_color = COALESCE(p_payload->>'brand_text_color', brand_text_color),
    status = 'submitted',
    submitted_at = now()
  WHERE id = _id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_setup_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_tenant_setup_by_token(text, jsonb) TO anon, authenticated;

-- 7) user_invitations: drop anon SELECT, expose token-based RPCs
DROP POLICY IF EXISTS "Anyone can read invitation by token" ON public.user_invitations;

CREATE OR REPLACE FUNCTION public.get_user_invitation_by_token(p_token text)
RETURNS TABLE (
  id uuid, status text, expires_at timestamptz, role text,
  invitee_name text, invitee_email text, invitee_cpf text,
  invitee_birth_date date, invitee_whatsapp text, company_id uuid
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, status, expires_at, role::text, invitee_name, invitee_email,
         invitee_cpf, invitee_birth_date, invitee_whatsapp, company_id
  FROM public.user_invitations
  WHERE token = p_token
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.accept_user_invitation_by_token(p_token text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _id uuid; _status text; _expires timestamptz;
BEGIN
  SELECT id, status, expires_at INTO _id, _status, _expires
  FROM public.user_invitations WHERE token = p_token LIMIT 1;
  IF _id IS NULL THEN RETURN false; END IF;
  IF _status IN ('accepted','aceito') THEN RETURN true; END IF;
  IF _expires IS NOT NULL AND _expires < now() THEN RETURN false; END IF;

  UPDATE public.user_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = _id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_invitation_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_user_invitation_by_token(text) TO anon, authenticated;
