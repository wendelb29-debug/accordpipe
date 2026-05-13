import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { mergeMessagesDedup, dedupMessages, getMessageUniqueKey } from "@/lib/messageDedup";

export type InboxFilter = "mine" | "all" | "unassigned";

export interface InboxContact {
  id: string;
  name: string;
  phone: string;
  avatar_url: string | null;
  last_message: string | null;
  last_message_at: string | null;
  assigned_to: string | null;
  labels: string[];
  company_id: string;
  workspace_id: string | null;
  lead_id: string | null;
  conversation_status: string;
  created_at: string;
  notes: string | null;
}

export interface MessageReaction {
  emoji: string;
  user_id: string;
  user_name?: string | null;
  at: string;
}

export interface InboxMessage {
  id: string;
  contact_id: string;
  phone: string;
  message: string;
  direction: string;
  status: string;
  message_type: string;
  media_url: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  company_id: string;
  external_message_id?: string | null;
  sent_at?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  reply_to_message_id?: string | null;
  reactions?: MessageReaction[];
}

function normalizePhone(rawPhone?: string | null) {
  return String(rawPhone || "").replace(/\D/g, "");
}

/** Short two-tone beep using Web Audio API (no asset required) */
function playInboxBeep() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    playTone(880, now, 0.12);
    playTone(1100, now + 0.14, 0.12);
  } catch { /* noop */ }
}

function buildPhoneVariants(rawPhone?: string | null) {
  const digits = normalizePhone(rawPhone);
  if (!digits) return [] as string[];

  const variants = new Set<string>([digits]);
  if (digits.startsWith("55") && digits.length > 11) {
    variants.add(digits.slice(2));
  } else if (!digits.startsWith("55") && digits.length >= 10) {
    variants.add(`55${digits}`);
  }

  return [...variants];
}

function matchesSelectedConversation(
  message: Pick<InboxMessage, "contact_id" | "phone">,
  selectedContactId: string | null,
  selectedContactPhone: string | null,
) {
  if (selectedContactId && message.contact_id === selectedContactId) return true;
  if (!selectedContactPhone) return false;

  const selectedVariants = new Set(buildPhoneVariants(selectedContactPhone));
  return buildPhoneVariants(message.phone).some((variant) => selectedVariants.has(variant));
}

export function useWhatsAppInbox() {
  const { user, profile, role, isMaster, activeCompanyId } = useAuth();
  const [contacts, setContacts] = useState<InboxContact[]>([]);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [unreadByContact, setUnreadByContact] = useState<Record<string, number>>({});

  // In-memory message cache, isolated per tenant (cleared on tenant switch).
  // Enables stale-while-revalidate: instant render of previously-loaded conversations.
  const messagesCacheRef = useRef<Map<string, InboxMessage[]>>(new Map());
  const cacheTenantRef = useRef<string | null>(null);
  const selectedContactIdRef = useRef<string | null>(null);
  const selectedContactPhoneRef = useRef<string | null>(null);
  const originalTitleRef = useRef<string>(typeof document !== "undefined" ? document.title : "Accord Stack");
  const [activeIntegration, setActiveIntegration] = useState<{
    id?: string;
    provider: string;
    provider_type: string;
    connected_phone: string | null;
    connection_status: string;
    last_sync_at: string | null;
    is_active: boolean;
    instance_name: string | null;
    server_url: string | null;
  } | null>(null);

  const companyId = activeCompanyId || profile?.company_id;
  const isAdminOrCeo = isMaster || role === "admin" || role === "ceo";

  const fetchContacts = useCallback(async () => {
    if (!companyId) return;

    let query = supabase
      .from("whatsapp_contacts")
      .select("*")
      .eq("company_id", companyId)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (filter === "mine" && user?.id) {
      query = query.eq("assigned_to", user.id);
    } else if (filter === "unassigned") {
      query = query.is("assigned_to", null);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[useWhatsAppInbox] Error fetching contacts:", error);
      setLoading(false);
      return;
    }

    
    setContacts((data || []) as InboxContact[]);
    setLoading(false);
  }, [companyId, filter, user?.id]);

  // Invalidate cache when tenant changes (multi-tenant isolation)
  useEffect(() => {
    if (cacheTenantRef.current !== companyId) {
      messagesCacheRef.current.clear();
      cacheTenantRef.current = companyId ?? null;
    }
  }, [companyId]);

  const fetchMessages = useCallback(async (
    contactId: string,
    contactPhone?: string | null,
    opts?: { background?: boolean },
  ) => {
    if (!companyId) return;

    const phoneVariants = buildPhoneVariants(contactPhone);
    const phoneFilters = phoneVariants.map((phone) => `phone.eq.${phone}`);
    const orFilter = [`contact_id.eq.${contactId}`, ...phoneFilters].join(",");

    const { data, error } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("company_id", companyId)
      .or(orFilter)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[inbox] Error fetching messages:", error);
      if (!opts?.background) setLoadingMessages(false);
      return;
    }

    const fetched = (data || []) as unknown as InboxMessage[];

    // CRITICAL: never wipe the chat on a refresh.
    // Merge fetched rows with whatever is already cached/on-screen so that
    // optimistic sends, realtime arrivals, or any rows the query may have
    // missed (RLS race, phone-variant edge case, etc.) are preserved.
    const existingCached = messagesCacheRef.current.get(contactId) || [];
    const existingOnScreen =
      selectedContactIdRef.current === contactId ? messages : [];
    const merged = mergeMessagesDedup(
      mergeMessagesDedup(existingCached, existingOnScreen),
      fetched,
    );

    messagesCacheRef.current.set(contactId, merged);

    // Only apply to UI if user is still on this contact (avoid race when switching fast)
    if (selectedContactIdRef.current === contactId) {
      setMessages(merged);
    }
    if (!opts?.background) setLoadingMessages(false);
  }, [companyId, messages]);

  const selectContact = useCallback((contactId: string | null) => {
    setSelectedContactId(contactId);
    if (contactId) {
      // Clear unread badge for this conversation
      setUnreadByContact(prev => {
        if (!prev[contactId]) return prev;
        const next = { ...prev };
        delete next[contactId];
        return next;
      });

      const contact = contacts.find((item) => item.id === contactId);
      const cached = messagesCacheRef.current.get(contactId);

      if (cached && cached.length > 0) {
        // Stale-while-revalidate: paint cached messages instantly, refresh in background
        setMessages(cached);
        setLoadingMessages(false);
        fetchMessages(contactId, contact?.phone, { background: true });
      } else {
        setMessages([]);
        setLoadingMessages(true);
        fetchMessages(contactId, contact?.phone);
      }

      // Fire-and-forget: sync name + avatar from provider
      supabase.functions.invoke("whatsapp-sync-contact", { body: { contact_id: contactId } })
        .then((res: any) => {
          if (res?.data?.success && (res.data.avatar_url || res.data.name)) {
            fetchContacts();
          }
        })
        .catch(() => undefined);
    } else {
      setMessages([]);
      setLoadingMessages(false);
    }
  }, [contacts, fetchMessages, fetchContacts]);

  const sendMessage = useCallback(async (
    text: string,
    options?: {
      messageType?: "text" | "image" | "audio" | "file";
      mediaUrl?: string;
      fileName?: string;
      replyToMessageId?: string | null;
    }
  ) => {
    if (!selectedContactId || !companyId) return;

    const contact = contacts.find(c => c.id === selectedContactId);
    if (!contact) return;

    if (contact.conversation_status === "encerrado") {
      toast.error("Atendimento encerrado. Reabra para enviar mensagens.");
      return;
    }

    const messageType = options?.messageType || "text";
    const mediaUrl = options?.mediaUrl || null;
    const replyToId = options?.replyToMessageId || null;

    // Resolve the provider-side message id of the message being replied to.
    // The provider needs the external id (Z-API messageId / Uazapi key.id) to
    // attach the new message as a real WhatsApp reply.
    let quotedExternalId: string | null = null;
    if (replyToId) {
      const original = messages.find((m) => m.id === replyToId);
      quotedExternalId =
        original?.external_message_id ||
        (original?.metadata as any)?.external_id ||
        (original?.metadata as any)?.zapi_message_id ||
        (original?.metadata as any)?.messageId ||
        null;
    }

    const { data: msgData, error: msgError } = await supabase
      .from("whatsapp_messages")
      .insert({
        company_id: companyId,
        contact_id: selectedContactId,
        phone: normalizePhone(contact.phone),
        message: text || options?.fileName || "",
        direction: "outbound",
        status: "sending",
        message_type: messageType,
        media_url: mediaUrl,
        reply_to_message_id: replyToId,
      } as any)
      .select()
      .single();

    if (msgError) {
      toast.error("Erro ao salvar mensagem");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-send", {
        body: {
          tenant_id: companyId,
          phone: contact.phone,
          text: text || options?.fileName || "",
          message_id: msgData.id,
          message_type: messageType,
          media_url: mediaUrl,
          file_name: options?.fileName,
          quoted_external_id: quotedExternalId,
        },
      });

      if (error || !data?.success) {
        await supabase
          .from("whatsapp_messages")
          .update({ status: "failed" })
          .eq("id", msgData.id);
        toast.error(data?.message || "Falha ao enviar mensagem via WhatsApp");
      }
    } catch {
      await supabase
        .from("whatsapp_messages")
        .update({ status: "failed" })
        .eq("id", msgData.id);
    }

    // Promove "fila"/"aguardando" → "em_atendimento" no primeiro outbound
    const updates: any = {
      last_message: text || options?.fileName || "[mídia]",
      last_message_at: new Date().toISOString(),
    };
    if (
      contact.conversation_status === "fila" ||
      contact.conversation_status === "aguardando" ||
      !contact.conversation_status
    ) {
      updates.conversation_status = "em_atendimento";
    }

    await supabase
      .from("whatsapp_contacts")
      .update(updates)
      .eq("id", selectedContactId);
  }, [selectedContactId, companyId, contacts, messages]);

  /**
   * Toggle a reaction on a message and forward it to the connected WhatsApp
   * provider so the contact receives the reaction in the real chat as well.
   */
  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user?.id || !companyId) return;

    const current = messages.find((m) => m.id === messageId);
    if (!current) return;

    const existing: MessageReaction[] = Array.isArray(current.reactions)
      ? (current.reactions as MessageReaction[])
      : [];

    const mine = existing.find((r) => r.user_id === user.id);
    const reactionMode = mine?.emoji === emoji ? "remove" : "add";

    if (reactionMode === "remove" && activeIntegration?.provider_type === "uazapi") {
      toast.error("Remover reação ainda não é suportado nesta integração.");
      return;
    }

    const targetMessageId =
      current.external_message_id ||
      current.metadata?.external_id ||
      current.metadata?.zapi_message_id ||
      current.metadata?.messageId ||
      null;

    if (!targetMessageId) {
      toast.error("Esta mensagem ainda não pode receber reação no WhatsApp.");
      return;
    }

    const next: MessageReaction[] = reactionMode === "remove"
      ? existing.filter((r) => r.user_id !== user.id)
      : [
          ...existing.filter((r) => r.user_id !== user.id),
          { emoji, user_id: user.id, user_name: profile?.name || null, at: new Date().toISOString() },
        ];

    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions: next } : m)));

    const { data: sendData, error: sendError } = await supabase.functions.invoke("whatsapp-send", {
      body: {
        tenant_id: companyId,
        phone: current.phone,
        message_type: "reaction",
        target_message_id: targetMessageId,
        reaction_mode: reactionMode,
        reaction_emoji: reactionMode === "add" ? emoji : null,
      },
    });

    if (sendError || !sendData?.success) {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions: existing } : m)));
      toast.error(sendData?.message || "Não foi possível enviar a reação para o contato.");
      return;
    }

    const { error } = await supabase
      .from("whatsapp_messages")
      .update({ reactions: next as any } as any)
      .eq("id", messageId);

    if (error) {
      toast.error("A reação foi enviada, mas não foi possível salvar no histórico.");
    }
  }, [messages, user?.id, companyId, profile?.name, activeIntegration?.provider_type]);

  const assignContact = useCallback(async (contactId: string, userId: string | null) => {
    const { error } = await supabase
      .from("whatsapp_contacts")
      .update({ assigned_to: userId })
      .eq("id", contactId);

    if (error) {
      toast.error("Erro ao atribuir conversa");
      return;
    }
    toast.success(userId ? "Conversa atribuída!" : "Conversa desatribuída!");
    fetchContacts();
  }, [fetchContacts]);

  const transferContact = useCallback(async (contactId: string, newUserId: string) => {
    await assignContact(contactId, newUserId);
  }, [assignContact]);

  const updateConversationStatus = useCallback(async (contactId: string, status: string) => {
    const { error } = await supabase
      .from("whatsapp_contacts")
      .update({ conversation_status: status } as any)
      .eq("id", contactId);

    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }
    toast.success(
      status === "encerrado" ? "Atendimento encerrado!" :
      status === "em_atendimento" ? "Atendimento reaberto!" :
      "Status atualizado!"
    );
    fetchContacts();
  }, [fetchContacts]);

  const checkConnection = useCallback(async () => {
    if (!companyId) {
      setConnectionStatus("disconnected");
      setActiveIntegration(null);
      return;
    }

    try {
      const { data: integ, error } = await supabase
        .from("tenant_whatsapp_integrations" as any)
        .select("id, provider_type, connected_phone, connection_status, last_sync_at, is_active, instance_name, server_url")
        .eq("tenant_id", companyId)
        .order("is_active", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn("[useWhatsAppInbox] checkConnection error:", error);
      }

      const integData = integ as any;

      const hasCredentials = !!integData && (
        integData.provider_type === "uazapi"
          ? !!integData.server_url
          : true
      );

      const normalized = integData
        ? { ...integData, provider: integData.provider_type }
        : null;

      setActiveIntegration(normalized);

      const isConnected = !!integData?.is_active && hasCredentials &&
        integData.connection_status !== "disconnected" && integData.connection_status !== "error";

      setConnectionStatus(isConnected ? "connected" : "disconnected");
    } catch (err) {
      console.error("[useWhatsAppInbox] checkConnection exception:", err);
      setConnectionStatus("disconnected");
      setActiveIntegration(null);
    }
  }, [companyId]);

  const generateQrCode = useCallback(async () => {
    if (!companyId) return null;
    setConnectionStatus("connecting");

    try {
      const { data, error } = await supabase.functions.invoke("zapi", {
        body: { action: "get-qrcode", company_id: companyId },
      });

      if (error) throw error;

      const qr = data?.data?.value;
      if (qr) {
        return qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`;
      } else if (data?.data?.connected === true) {
        setConnectionStatus("connected");
        return null;
      }

      setConnectionStatus("disconnected");
      return null;
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar QR Code");
      setConnectionStatus("disconnected");
      return null;
    }
  }, [companyId]);

  useEffect(() => {
    fetchContacts();
    checkConnection();

    const interval = setInterval(checkConnection, 15000);
    return () => clearInterval(interval);
  }, [fetchContacts, checkConnection]);

  useEffect(() => {
    selectedContactIdRef.current = selectedContactId;
    selectedContactPhoneRef.current = contacts.find((item) => item.id === selectedContactId)?.phone ?? null;
  }, [contacts, selectedContactId]);

  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel(`inbox-messages-${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_messages",
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          const newMsg = payload.new as InboxMessage;
          const matches = matchesSelectedConversation(
            newMsg,
            selectedContactIdRef.current,
            selectedContactPhoneRef.current,
          );

          const isOpen = matches && document.visibilityState === "visible" && document.hasFocus();
          const isInbound = newMsg.direction === "inbound";

          if (matches) {
            
            setMessages(prev => {
              const merged = mergeMessagesDedup(prev, [newMsg]);
              messagesCacheRef.current.set(newMsg.contact_id, merged);
              return merged;
            });
          } else {
            // Update cache silently for non-active conversation
            const cached = messagesCacheRef.current.get(newMsg.contact_id);
            if (cached) {
              messagesCacheRef.current.set(newMsg.contact_id, mergeMessagesDedup(cached, [newMsg]));
            }
          }

          // Inbound notifications: only when conversation isn't actively open
          if (isInbound && !isOpen) {
            // Increment unread badge
            setUnreadByContact(prev => ({
              ...prev,
              [newMsg.contact_id]: (prev[newMsg.contact_id] || 0) + 1,
            }));

            // Sound
            playInboxBeep();

            // Browser notification (uses existing permission)
            const contact = contacts.find(c => c.id === newMsg.contact_id);
            const title = contact?.name || newMsg.phone || "Nova mensagem";
            const previewByType: Record<string, string> = {
              audio: "🎵 Áudio",
              image: "📷 Imagem",
              file: "📄 Arquivo",
              document: "📄 Arquivo",
              video: "🎥 Vídeo",
            };
            const body = previewByType[newMsg.message_type] || newMsg.message || "Nova mensagem";
            try {
              if ("Notification" in window && Notification.permission === "granted") {
                const n = new Notification(title, {
                  body,
                  icon: contact?.avatar_url || "/favicon.ico",
                  badge: "/favicon.ico",
                  tag: `inbox-${newMsg.contact_id}`,
                });
                n.onclick = () => {
                  window.focus();
                  setSelectedContactId(newMsg.contact_id);
                  n.close();
                };
              }
            } catch { /* noop */ }
          }

          fetchContacts();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "whatsapp_messages",
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          const updated = payload.new as InboxMessage;
          if (matchesSelectedConversation(updated, selectedContactIdRef.current, selectedContactPhoneRef.current)) {
            
            setMessages(prev => {
              const merged = mergeMessagesDedup(prev, [updated]);
              messagesCacheRef.current.set(updated.contact_id, merged);
              return merged;
            });
          } else {
            const cached = messagesCacheRef.current.get(updated.contact_id);
            if (cached) {
              messagesCacheRef.current.set(updated.contact_id, mergeMessagesDedup(cached, [updated]));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, fetchContacts]);

  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel(`inbox-contacts-${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_contacts",
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          fetchContacts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, fetchContacts]);

  // Update browser tab title with total unread count
  const totalUnread = Object.values(unreadByContact).reduce((sum, n) => sum + n, 0);
  useEffect(() => {
    const original = originalTitleRef.current;
    document.title = totalUnread > 0 ? `(${totalUnread > 99 ? "99+" : totalUnread}) ${original}` : original;
    return () => { document.title = original; };
  }, [totalUnread]);

  return {
    contacts,
    messages,
    selectedContactId,
    selectContact,
    sendMessage,
    toggleReaction,
    filter,
    setFilter,
    loading,
    loadingMessages,
    isAdminOrCeo,
    connectionStatus,
    activeIntegration,
    generateQrCode,
    checkConnection,
    assignContact,
    transferContact,
    updateConversationStatus,
    companyId,
    refetchContacts: fetchContacts,
    unreadByContact,
  };
}
