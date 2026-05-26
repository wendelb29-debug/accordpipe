import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type CertStatus = "valid" | "expiring" | "expired" | "none";

/**
 * Returns the worst certificate status visible to the current CEO/master user.
 * Only fetches when the user can actually manage certificates.
 */
export function useCertificateStatus(): CertStatus {
  const { role, isGlobalMaster } = useAuth();
  const enabled = role === "ceo" || role === "master" || isGlobalMaster;
  const [status, setStatus] = useState<CertStatus>("none");

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await (supabase as any)
        .from("tenant_certificates")
        .select("valid_until")
        .order("valid_until", { ascending: true });

      if (cancelled || error || !data || data.length === 0) return;

      const now = Date.now();
      const soon = now + 30 * 24 * 60 * 60 * 1000;
      let worst: CertStatus = "valid";
      for (const row of data as Array<{ valid_until: string | null }>) {
        if (!row.valid_until) continue;
        const t = new Date(row.valid_until).getTime();
        if (t < now) {
          worst = "expired";
          break;
        }
        if (t < soon) worst = "expiring";
      }
      setStatus(worst);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return enabled ? status : "none";
}
