import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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

export interface InboxMessage {
  id: string;
  contact_id: string;
  phone: string;
  message: string;
  direction: string;
  status: string;
  message_type: string;
  media_url: string | null;
  created_at: string;
  company_id: string;
  external_message_id?: string | null;
  sent_at?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
}

function normalizePhone(rawPhone?: string | null) {
  return String(rawPhone || "").replace(/\D/g, "");
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
  const [filter, setFilter] = useState<InboxFilter>("mine");
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [unreadByContact, setUnreadByContact] = useState<Record<string, number>>({});
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

    console.log("[useWhatsAppInbox] fetched contacts:", data?.length ?? 0, "for tenant:", companyId);
    setContacts((data || []) as InboxContact[]);
    setLoading(false);
  }, [companyId, filter, user?.id]);

  const fetchMessages = useCallback(async (contactId: string, contactPhone?: string | null) => {
    if (!companyId) return;

    const phoneVariants = buildPhoneVariants(contactPhone);
    const phoneFilters = phoneVariants.map((phone) => `phone.eq.${phone}`);
    const orFilter = [`contact_id.eq.${contactId}`, ...phoneFilters].join(",");

    console.log("[inbox] fetchMessages", { contactId, contactPhone, phoneVariants, companyId, orFilter });

    const { data, error } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("company_id", companyId)
      .or(orFilter)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[inbox] Error fetching messages:", error);
      return;
    }

    const deduped = (data || []).reduce<InboxMessage[]>((acc, item) => {
      if (!acc.some((msg) => msg.id === item.id)) acc.push(item as InboxMessage);
      return acc;
    }, []);

    console.log("[inbox] fetched", deduped.length, "messages for contact", contactId);
    setMessages(deduped);
  }, [companyId]);

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
      fetchMessages(contactId, contact?.phone);
      // Fire-and-forget: sync name + avatar from UazAPI
      supabase.functions.invoke("whatsapp-sync-contact", { body: { contact_id: contactId } })
        .then((res: any) => {
          if (res?.data?.success && (res.data.avatar_url || res.data.name)) {
            fetchContacts();
          }
        })
        .catch(() => undefined);
    } else {
      setMessages([]);
    }
  }, [contacts, fetchMessages, fetchContacts]);

  const sendMessage = useCallback(async (
    text: string,
    options?: { messageType?: "text" | "image" | "audio" | "file"; mediaUrl?: string; fileName?: string }
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
      })
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
  }, [selectedContactId, companyId, contacts]);

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

    console.log("[checkConnection] querying for companyId:", companyId);

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
      console.log("[useWhatsAppInbox] active integration:", integData);

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

  const selectedContactIdRef = useRef<string | null>(null);
  const selectedContactPhoneRef = useRef<string | null>(null);

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

          console.log("[inbox realtime] INSERT received", {
            msgId: newMsg.id,
            msgContactId: newMsg.contact_id,
            msgPhone: newMsg.phone,
            msgDirection: newMsg.direction,
            selectedContactId: selectedContactIdRef.current,
            selectedContactPhone: selectedContactPhoneRef.current,
            matches,
          });

          if (matches) {
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
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
            setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
          }
        }
      )
      .subscribe((status) => {
        console.log("[inbox realtime] channel status:", status, "companyId:", companyId);
      });

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

  return {
    contacts,
    messages,
    selectedContactId,
    selectContact,
    sendMessage,
    filter,
    setFilter,
    loading,
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
  };
}
