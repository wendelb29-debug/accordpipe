import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";

/**
 * Counts unread emails across the current user's email accounts in the
 * active tenant. Polls every 30s and subscribes to realtime updates so the
 * sidebar badge decreases as the user opens / marks messages as read.
 */
export function useUnreadEmailCount() {
  const { profile } = useAuth();
  const activeCompanyId = useActiveCompanyId();
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!profile?.user_id || !activeCompanyId) {
      setCount(0);
      return;
    }
    const query: any = supabase
      .from("email_messages")
      .select("id", { count: "exact", head: true });
    const { count: c, error } = await query
      .eq("user_id", profile.user_id)
      .eq("servidor_id", activeCompanyId)
      .eq("is_read", false);
    if (!error) setCount(c || 0);
  }, [profile?.user_id, activeCompanyId]);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);

    const channel = supabase
      .channel("email_messages_unread_badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "email_messages" },
        () => fetchCount(),
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchCount]);

  return count;
}
