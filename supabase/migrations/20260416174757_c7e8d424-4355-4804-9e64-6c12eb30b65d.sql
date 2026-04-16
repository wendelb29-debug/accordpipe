ALTER TABLE public.crm_forms
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS landing_page_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS subheadline TEXT,
  ADD COLUMN IF NOT EXISTS cta_text TEXT,
  ADD COLUMN IF NOT EXISTS thank_you_message TEXT,
  ADD COLUMN IF NOT EXISTS redirect_url_after_submit TEXT,
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS crm_forms_servidor_slug_unique
  ON public.crm_forms (servidor_id, slug)
  WHERE slug IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_public_form_by_slug(p_slug TEXT)
RETURNS TABLE (
  id UUID,
  servidor_id UUID,
  workspace_id UUID,
  name TEXT,
  description TEXT,
  fields JSONB,
  tags TEXT[],
  slug TEXT,
  headline TEXT,
  subheadline TEXT,
  cta_text TEXT,
  thank_you_message TEXT,
  redirect_url_after_submit TEXT,
  seo_title TEXT,
  seo_description TEXT,
  brand_logo_url TEXT,
  brand_primary_color TEXT,
  brand_secondary_color TEXT,
  brand_accent_color TEXT,
  brand_bg_color TEXT,
  brand_text_color TEXT,
  tenant_name TEXT
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    f.id, f.servidor_id, f.workspace_id, f.name, f.description, f.fields, f.tags,
    f.slug, f.headline, f.subheadline, f.cta_text, f.thank_you_message,
    f.redirect_url_after_submit, f.seo_title, f.seo_description,
    c.brand_logo_url, c.brand_primary_color, c.brand_secondary_color,
    c.brand_accent_color, c.brand_bg_color, c.brand_text_color,
    COALESCE(c.nome_fantasia, c.razao_social) AS tenant_name
  FROM public.crm_forms f
  JOIN public.companies c ON c.id = f.servidor_id
  WHERE f.slug = p_slug
    AND f.is_active = true
    AND f.landing_page_enabled = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_form_by_slug(TEXT) TO anon, authenticated;