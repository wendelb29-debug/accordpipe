import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";

/**
 * Counts the current user's unread email messages across all connected
 * accounts (filtered by tenant). Combines a 60s poll with Supabase realtime
 * so the badge drops the moment a message is marked as read.
 *
 * Mirrors the shape of useOverdueCount so the Sidebar can consume it
 * identically.
 */
export function useUnreadEmailCount() {
  const { profile } = useAuth();
  const activeCompanyId = useActiveCompanyId();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    if (!profile?.user_id || !activeCompanyId) {
      setUnreadCount(0);
      return;
    }

    // 1) IDs das contas de email do usuário no tenant ativo
    const { data: accounts } = await supabase
      .from("email_accounts")
      .select("id")
      .eq("user_id", profile.user_id)
      .eq("servidor_id", activeCompanyId);

    const accountIds = (accounts || []).map((a: any) => a.id);
    if (accountIds.length === 0) {
      setUnreadCount(0);
      return;
    }

    // 2) Conta mensagens não lidas em todas essas contas (apenas INBOX,
    //    ignorando TRASH/SPAM/SENT). Folders are stored lowercase.
    const { count, error } = await supabase
      .from("email_messages")
      .select("id", { count: "exact", head: true })
      .in("account_id", accountIds)
      .eq("is_read", false)
      .or("folder.eq.inbox,folder.is.null");

    if (error) return;
    setUnreadCount(count || 0);
  }, [profile?.user_id, activeCompanyId]);

  useEffect(() => {
    fetchUnread();
    // fallback poll caso o realtime falhe
    const interval = setInterval(fetchUnread, 60000);

    // refresh imediato quando a página de email muda is_read em lote
    const onLocalChange = () => fetchUnread();
    window.addEventListener("email-unread-changed", onLocalChange);

    // realtime: qualquer mudança em email_messages refaz a contagem
    const channel = supabase
      .channel(`unread-email:${profile?.user_id || "anon"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "email_messages" },
        () => fetchUnread()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "email_accounts" },
        () => fetchUnread()
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      window.removeEventListener("email-unread-changed", onLocalChange);
      supabase.removeChannel(channel);
    };
  }, [fetchUnread, profile?.user_id]);

  return unreadCount;
}
