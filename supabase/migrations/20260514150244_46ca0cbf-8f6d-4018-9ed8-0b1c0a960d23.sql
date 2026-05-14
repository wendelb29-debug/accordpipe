DO $$
BEGIN
  ALTER TABLE public.companies DISABLE TRIGGER USER;
  UPDATE public.companies
    SET brand_logo_url = NULL,
        brand_logo_path = NULL
    WHERE id = '0c4dcc3c-b9fa-446f-8213-c2eca7884dc5';
  ALTER TABLE public.companies ENABLE TRIGGER USER;
END $$;