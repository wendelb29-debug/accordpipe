ALTER TABLE public.companies DISABLE TRIGGER USER;
UPDATE public.companies SET brand_logo_url = NULL, brand_logo_path = NULL WHERE servidor_id IS NULL;
ALTER TABLE public.companies ENABLE TRIGGER USER;