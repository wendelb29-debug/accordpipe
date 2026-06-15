CREATE TABLE public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  servidor_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  subject text NOT NULL,
  body_html text NOT NULL,
  preview_text text,
  category text NOT NULL DEFAULT 'general',
  is_shared boolean NOT NULL DEFAULT false,
  is_favorite boolean NOT NULL DEFAULT false,
  variables text[] NOT NULL DEFAULT '{}',
  used_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_email_templates_servidor_id ON public.email_templates(servidor_id);
CREATE INDEX idx_email_templates_user_id ON public.email_templates(user_id);
CREATE INDEX idx_email_templates_category ON public.email_templates(category);
CREATE INDEX idx_email_templates_created_at ON public.email_templates(created_at DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Users can view own and tenant shared email templates"
ON public.email_templates
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_master(auth.uid())
  OR (
    is_shared = true
    AND public.user_has_tenant_access(auth.uid(), servidor_id)
  )
);

CREATE POLICY "Users can create email templates in accessible tenants"
ON public.email_templates
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.user_has_tenant_access(auth.uid(), servidor_id)
);

CREATE POLICY "Users can update own email templates"
ON public.email_templates
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_master(auth.uid())
)
WITH CHECK (
  (user_id = auth.uid() OR public.is_master(auth.uid()))
  AND public.user_has_tenant_access(auth.uid(), servidor_id)
);

CREATE POLICY "Users can delete own email templates"
ON public.email_templates
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_master(auth.uid())
);