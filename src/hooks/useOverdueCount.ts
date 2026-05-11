import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";

/**
 * Counts the current user's overdue CRM activities for the active tenant.
 * Polls every 60s. Preserves the original Sidebar logic exactly.
 */
export function useOverdueCount() {
  const { profile } = useAuth();
  const activeCompanyId = useActiveCompanyId();
  const [overdueCount, setOverdueCount] = useState(0);

  const fetchOverdueActivities = useCallback(async () => {
    if (!profile?.user_id || !activeCompanyId) return;
    const { data, error } = await supabase
      .from("crm_lead_activities")
      .select("id, metadata")
      .eq("created_by_user_id", profile.user_id)
      .eq("servidor_id", activeCompanyId)
      .in("type", ["activity", "meeting", "call", "email", "internal", "whatsapp"]);
    if (error || !data) return;
    const now = new Date();
    const overdue = data.filter((a: any) => {
      const meta = a.metadata || {};
      const status = meta.status || meta.activity_status || "planejada";
      if (status === "concluida" || status === "no_show") return false;
      const scheduled = meta.scheduled_at || meta.scheduled_date;
      if (!scheduled) return false;
      return new Date(scheduled) < now;
    });
    setOverdueCount(overdue.length);
  }, [profile?.user_id, activeCompanyId]);

  useEffect(() => {
    fetchOverdueActivities();
    const interval = setInterval(fetchOverdueActivities, 60000);
    return () => clearInterval(interval);
  }, [fetchOverdueActivities]);

  return overdueCount;
}
