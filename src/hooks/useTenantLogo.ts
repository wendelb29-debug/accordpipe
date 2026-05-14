import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the brand logo URL for the active tenant.
 * - Master tenant (servidor_id === null) returns null so callers fall back to the Accord logo.
 * - Always generates a fresh signed URL from brand_logo_path (the documents bucket is private,
 *   so previously stored brand_logo_url values expire after 1h).
 * - Re-fetches when "brand-colors-updated" or "tenant-switched" events fire.
 */
export function useTenantLogo(activeCompanyId: string | null) {
  const [tenantLogoUrl, setTenantLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCompanyId) {
      setTenantLogoUrl(null);
      return;
    }

    const fetchLogo = async () => {
      const { data } = await supabase
        .from("companies")
        .select("brand_logo_url, brand_logo_path, servidor_id")
        .eq("id", activeCompanyId)
        .single();

      if (!data || data.servidor_id === null) {
        setTenantLogoUrl(null);
        return;
      }

      // Prefer a fresh signed URL from the stored path (private bucket safe).
      if (data.brand_logo_path) {
        const { data: signed } = await supabase.storage
          .from("documents")
          .createSignedUrl(data.brand_logo_path, 60 * 60 * 24);
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
      window.removeEventListener("brand-colors-updated", handler);
      window.removeEventListener("tenant-switched", handler);
    };
  }, [activeCompanyId]);

  return tenantLogoUrl;
}
