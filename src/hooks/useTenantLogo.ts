import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the brand logo URL for the active tenant.
 * - Master tenant (servidor_id === null) returns null so callers fall back to the Accord logo.
 * - Always generates a fresh signed URL from brand_logo_path (documents bucket is private).
 * - Clears state immediately on tenant switch and guards against race conditions so a slow
 *   response from a previous tenant never overwrites the current one.
 * - Re-fetches when "brand-colors-updated" or "tenant-switched" events fire.
 */
export function useTenantLogo(effectiveCompanyId: string | null) {
  const [tenantLogoUrl, setTenantLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    // Always clear stale logo from a previous tenant before fetching.
    setTenantLogoUrl(null);

    if (!effectiveCompanyId) return;

    let cancelled = false;
    const requestedCompanyId = effectiveCompanyId;

    const fetchLogo = async () => {
      const { data } = await supabase
        .from("companies")
        .select("id, brand_logo_url, brand_logo_path, servidor_id")
        .eq("id", requestedCompanyId)
        .single();

      // Discard responses from a tenant that is no longer active.
      if (cancelled || requestedCompanyId !== effectiveCompanyId) return;
      if (!data || data.id !== requestedCompanyId) return;

      // Master tenant always falls back to the Accord logo.
      if (data.servidor_id === null) {
        setTenantLogoUrl(null);
        return;
      }

      if (data.brand_logo_path) {
        const { data: signed } = await supabase.storage
          .from("documents")
          .createSignedUrl(data.brand_logo_path, 60 * 60 * 24);
        if (cancelled || requestedCompanyId !== effectiveCompanyId) return;
        if (signed?.signedUrl) {
          setTenantLogoUrl(signed.signedUrl);
          return;
        }
      }

      setTenantLogoUrl(data.brand_logo_url || null);
    };

    fetchLogo();
    const handler = () => fetchLogo();
    window.addEventListener("brand-colors-updated", handler);
    window.addEventListener("tenant-switched", handler);
    return () => {
      cancelled = true;
      window.removeEventListener("brand-colors-updated", handler);
      window.removeEventListener("tenant-switched", handler);
    };
  }, [effectiveCompanyId]);
  return tenantLogoUrl;
}

export function useTenantBranding(effectiveCompanyId: string | null) {
  const [branding, setBranding] = useState<{
    primary_color: string | null;
    secondary_color: string | null;
    accent_color: string | null;
    bg_color: string | null;
    text_color: string | null;
    nome_fantasia: string | null;
    razao_social: string | null;
  } | null>(null);

  useEffect(() => {
    if (!effectiveCompanyId) {
      setBranding(null);
      return;
    }

    const fetchBranding = async () => {
      const { data } = await supabase
        .from("companies")
        .select("brand_primary_color, brand_secondary_color, brand_accent_color, brand_bg_color, brand_text_color, nome_fantasia, razao_social")
        .eq("id", effectiveCompanyId)
        .single();

      if (data) {
        setBranding({
          primary_color: data.brand_primary_color,
          secondary_color: data.brand_secondary_color,
          accent_color: data.brand_accent_color,
          bg_color: data.brand_bg_color,
          text_color: data.brand_text_color,
          nome_fantasia: data.nome_fantasia,
          razao_social: data.razao_social,
        });
      }
    };

    fetchBranding();
    window.addEventListener("brand-colors-updated", fetchBranding);
    window.addEventListener("tenant-switched", fetchBranding);
    return () => {
      window.removeEventListener("brand-colors-updated", fetchBranding);
      window.removeEventListener("tenant-switched", fetchBranding);
    };
  }, [effectiveCompanyId]);

  return branding;
}
