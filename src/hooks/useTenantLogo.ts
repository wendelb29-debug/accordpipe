import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the brand logo URL for the active tenant.
 * - Master tenant (servidor_id === null) returns null so callers fall back to the Accord logo.
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
        .select("brand_logo_url, servidor_id")
        .eq("id", activeCompanyId)
        .single();
      if (data && data.servidor_id !== null && data.brand_logo_url) {
        setTenantLogoUrl(data.brand_logo_url);
      } else {
        setTenantLogoUrl(null);
      }
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
