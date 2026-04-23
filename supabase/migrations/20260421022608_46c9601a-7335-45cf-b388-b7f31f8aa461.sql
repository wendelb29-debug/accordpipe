CREATE OR REPLACE FUNCTION public.get_public_form_by_slug(p_slug text)
 RETURNS TABLE(id uuid, servidor_id uuid, workspace_id uuid, name text, description text, fields jsonb, tags text[], slug text, headline text, subheadline text, cta_text text, thank_you_message text, redirect_url_after_submit text, seo_title text, seo_description text, brand_logo_url text, brand_primary_color text, brand_secondary_color text, brand_accent_color text, brand_bg_color text, brand_text_color text, tenant_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    AND f.landing_page_enabled = true
  LIMIT 1;
$function$;