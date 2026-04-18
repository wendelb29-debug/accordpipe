import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";

export type OperatorStatusValue = "available" | "unavailable" | "busy" | "away";

export function useOperatorStatus() {
  const { user } = useAuth();
  const tenantId = useActiveCompanyId();
  const [status, setStatus] = useState<OperatorStatusValue>("unavailable");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id || !tenantId) return;
    setLoading(true);
    const { data } = await supabase
      .from("operator_status")
      .select("status")
      .eq("user_id", user.id)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    setStatus(((data?.status as OperatorStatusValue) || "unavailable"));
    setLoading(false);
  }, [user?.id, tenantId]);

  useEffect(() => { load(); }, [load]);

  const setOperatorStatus = useCallback(
    async (next: OperatorStatusValue) => {
      if (!user?.id || !tenantId) return;
      setUpdating(true);
      const { error } = await supabase
        .from("operator_status")
        .upsert(
          {
            user_id: user.id,
            tenant_id: tenantId,
            status: next,
            last_changed_at: new Date().toISOString(),
          },
          { onConflict: "user_id,tenant_id" }
        );
      if (!error) setStatus(next);
      setUpdating(false);
      return !error;
    },
    [user?.id, tenantId]
  );

  return { status, loading, updating, setOperatorStatus, isAvailable: status === "available", reload: load };
}
