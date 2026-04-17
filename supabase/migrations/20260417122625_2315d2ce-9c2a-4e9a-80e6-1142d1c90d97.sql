-- 1. Backfill: vincular tenants extras ao Master oficial (desativando trigger temporariamente)
ALTER TABLE public.companies DISABLE TRIGGER USER;

UPDATE public.companies
SET servidor_id = '899e7258-0083-4169-ac9b-a2be5a632d97',
    updated_at = now()
WHERE servidor_id IS NULL
  AND id <> '899e7258-0083-4169-ac9b-a2be5a632d97';

ALTER TABLE public.companies ENABLE TRIGGER USER;

-- 2. Trigger: impedir criação de novos Masters
CREATE OR REPLACE FUNCTION public.prevent_additional_master_tenants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_master_id uuid;
BEGIN
  IF NEW.servidor_id IS NULL THEN
    SELECT id INTO existing_master_id
    FROM public.companies
    WHERE servidor_id IS NULL
    LIMIT 1;

    IF existing_master_id IS NOT NULL AND existing_master_id <> NEW.id THEN
      RAISE EXCEPTION 'Não é permitido criar mais de um Tenant Master. Já existe um Master ativo no sistema.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_single_master_tenant ON public.companies;
CREATE TRIGGER enforce_single_master_tenant
  BEFORE INSERT OR UPDATE OF servidor_id ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_additional_master_tenants();