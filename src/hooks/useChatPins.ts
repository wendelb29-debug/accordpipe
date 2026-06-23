import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Per-user pinned WhatsApp chats. Persisted in whatsapp_chat_pins.
 * Each user manages only their own pins (RLS enforced).
 */
export function useChatPins(companyId: string | null | undefined) {
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUserId(data.user?.id ?? null);
    });
    return () => { mounted = false; };
  }, []);

  const reload = useCallback(async () => {
    if (!userId || !companyId) {
      setPinnedIds(new Set());
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("whatsapp_chat_pins" as any)
      .select("contact_id")
      .eq("user_id", userId)
      .eq("company_id", companyId);
    if (error) {
      console.error("[useChatPins] load error:", error.message);
      setLoading(false);
      return;
    }
    setPinnedIds(new Set(((data as any) || []).map((r: any) => r.contact_id as string)));
    setLoading(false);
  }, [userId, companyId]);

  useEffect(() => { reload(); }, [reload]);

  const togglePin = useCallback(async (contactId: string) => {
    if (!userId || !companyId) {
      toast.error("Sessão não identificada");
      return;
    }
    const isPinned = pinnedIds.has(contactId);
    // Optimistic
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (isPinned) next.delete(contactId); else next.add(contactId);
      return next;
    });
    if (isPinned) {
      const { error } = await supabase
        .from("whatsapp_chat_pins" as any)
        .delete()
        .eq("user_id", userId)
        .eq("contact_id", contactId);
      if (error) {
        toast.error("Erro ao desafixar chat");
        reload();
      } else {
        toast.success("Chat desafixado");
      }
    } else {
      const { error } = await supabase
        .from("whatsapp_chat_pins" as any)
        .insert({ user_id: userId, contact_id: contactId, company_id: companyId });
      if (error) {
        toast.error("Erro ao fixar chat");
        reload();
      } else {
        toast.success("Chat fixado no topo");
      }
    }
  }, [userId, companyId, pinnedIds, reload]);

  const isPinned = useCallback((contactId: string) => pinnedIds.has(contactId), [pinnedIds]);

  return useMemo(() => ({
    pinnedIds,
    isPinned,
    togglePin,
    loading,
    reload,
  }), [pinnedIds, isPinned, togglePin, loading, reload]);
}
