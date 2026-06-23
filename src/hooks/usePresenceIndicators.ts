import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PresenceIndicator {
  userId: string;
  userName: string;
  presenceType: "typing" | "recording" | "paused";
  startedAt: string;
}

export function usePresenceIndicators(contactId: string, excludeUserId?: string) {
  const [indicators, setIndicators] = useState<PresenceIndicator[]>([]);

  useEffect(() => {
    if (!contactId) {
      setIndicators([]);
      return;
    }

    let cancelled = false;

    const fetchInitial = async () => {
      const { data } = await supabase
        .from("whatsapp_presence" as any)
        .select("user_id, presence_type, started_at")
        .eq("contact_id", contactId)
        .gte("last_updated", new Date(Date.now() - 5 * 60_000).toISOString());

      if (!data || cancelled) return;
      const rows = data as any[];
      const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
      const nameMap = new Map<string, string>();
      (profs || []).forEach((p: any) => nameMap.set(p.user_id, p.name));

      if (cancelled) return;
      setIndicators(
        rows
          .filter((r) => r.user_id !== excludeUserId)
          .map((r) => ({
            userId: r.user_id,
            userName: nameMap.get(r.user_id) || "Usuário",
            presenceType: r.presence_type,
            startedAt: r.started_at,
          }))
      );
    };
    fetchInitial();

    const channel = supabase
      .channel(`presence:${contactId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_presence",
          filter: `contact_id=eq.${contactId}`,
        },
        async (payload: any) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as any;
            setIndicators((prev) => prev.filter((i) => i.userId !== oldRow.user_id));
            return;
          }
          const row = payload.new as any;
          if (excludeUserId && row.user_id === excludeUserId) return;

          let name = "Usuário";
          const { data: prof } = await supabase
            .from("profiles")
            .select("name")
            .eq("user_id", row.user_id)
            .maybeSingle();
          if (prof?.name) name = prof.name;

          setIndicators((prev) => {
            const filtered = prev.filter((i) => i.userId !== row.user_id);
            return [
              ...filtered,
              {
                userId: row.user_id,
                userName: name,
                presenceType: row.presence_type,
                startedAt: row.started_at,
              },
            ];
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [contactId, excludeUserId]);

  return { indicators };
}
