import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "./useActiveCompanyId";

export interface OnlineUser {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  status: "available" | "busy" | "away";
  online_at: string;
}

export function useOnlineUsers() {
  const { user, profile } = useAuth();
  const companyId = useActiveCompanyId();
  const [users, setUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    if (!user?.id || !companyId) return;

    const channel = supabase.channel(`presence:feed:${companyId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const list: OnlineUser[] = [];
        Object.values(state).forEach((entries: any) => {
          entries.forEach((entry: any) => list.push(entry));
        });
        setUsers(list);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user.id,
            name: profile?.name || null,
            avatar_url: profile?.avatar_url || null,
            status: "available",
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, companyId, profile?.name, profile?.avatar_url]);

  return users;
}
