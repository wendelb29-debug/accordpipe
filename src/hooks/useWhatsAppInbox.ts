import { useState, useEffect, useCallback } from "react";
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
}

export function useWhatsAppInbox() {
  const { user, profile, role, isMaster, activeCompanyId } = useAuth();
  const [contacts, setContacts] = useState<InboxContact[]>([]);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [filter, setFilter] = useState<InboxFilter>("mine");
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [activeIntegration, setActiveIntegration] = useState<{
    provider_type: string;
    connected_phone: string | null;
    connection_status: string;
    last_sync_at: string | null;
    is_active: boolean;
  } | null>(null);

  const companyId = activeCompanyId || profile?.company_id;
  const isAdminOrCeo = isMaster || role === "admin" || role === "ceo";

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    if (!companyId) return;

    let query = supabase
      .from("whatsapp_contacts")
      .select("*")
      .eq("company_id", companyId)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    // Apply filter based on role
    if (filter === "mine" && user?.id) {
      query = query.eq("assigned_to", user.id);
    } else if (filter === "unassigned") {
      query = query.is("assigned_to", null);
    }
    // "all" - no additional filter (RLS handles visibility)

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching contacts:", error);
      return;
    }
    setContacts((data || []) as InboxContact[]);
    setLoading(false);
  }, [companyId, filter, user?.id]);

  // Fetch messages for selected contact
  const fetchMessages = useCallback(async (contactId: string) => {
    if (!companyId) return;

    const { data, error } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("contact_id", contactId)
      .eq("company_id", companyId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return;
    }
    setMessages((data || []) as InboxMessage[]);
  }, [companyId]);

  // Select contact
  const selectContact = useCallback((contactId: string | null) => {
    setSelectedContactId(contactId);
    if (contactId) {
      fetchMessages(contactId);
    } else {
      setMessages([]);
    }
  }, [fetchMessages]);

  // Send message
  const sendMessage = useCallback(async (text: string) => {
    if (!selectedContactId || !companyId) return;

    const contact = contacts.find(c => c.id === selectedContactId);
    if (!contact) return;

    // Insert message locally first
    const { data: msgData, error: msgError } = await supabase
      .from("whatsapp_messages")
      .insert({
        company_id: companyId,
        contact_id: selectedContactId,
        phone: contact.phone,
        message: text,
        direction: "outbound",
        status: "sending",
        message_type: "text",
      })
      .select()
      .single();

    if (msgError) {
      toast.error("Erro ao salvar mensagem");
      return;
    }

    // Send via active provider (Uazapi or Z-API) — provider-agnostic
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-send", {
        body: {
          tenant_id: companyId,
          phone: contact.phone,
          text,
          message_id: msgData.id,
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

    // Update contact last message
    await supabase
      .from("whatsapp_contacts")
      .update({ last_message: text, last_message_at: new Date().toISOString() })
      .eq("id", selectedContactId);
  }, [selectedContactId, companyId, contacts]);

  // Assign contact to user
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

  // Transfer contact
  const transferContact = useCallback(async (contactId: string, newUserId: string) => {
    await assignContact(contactId, newUserId);
  }, [assignContact]);

  // Update conversation status
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

  // Check connection status from active provider integration
  const checkConnection = useCallback(async () => {
    if (!companyId) {
      setConnectionStatus("disconnected");
      setActiveIntegration(null);
      return;
    }
    try {
      const { data: integ, error } = await supabase
        .from("tenant_whatsapp_integrations" as any)
        .select("provider_type, connected_phone, connection_status, last_sync_at, is_active")
        .eq("tenant_id", companyId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) {
        console.warn("[useWhatsAppInbox] checkConnection error:", error);
      }
      const integData = integ as any;
      console.log("[useWhatsAppInbox] active integration:", integData);
      setActiveIntegration(integData || null);
      const status = integData?.connection_status;
      setConnectionStatus(status === "connected" ? "connected" : "disconnected");
    } catch (err) {
      console.error("[useWhatsAppInbox] checkConnection exception:", err);
      setConnectionStatus("disconnected");
      setActiveIntegration(null);
    }
  }, [companyId]);

  // Generate QR code
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

  // Initial fetch + realtime subscriptions
  useEffect(() => {
    fetchContacts();
    checkConnection();

    const interval = setInterval(checkConnection, 15000);
    return () => clearInterval(interval);
  }, [fetchContacts, checkConnection]);

  // Realtime for new messages
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
          if (newMsg.contact_id === selectedContactId) {
            setMessages(prev => [...prev, newMsg]);
          }
          // Refresh contacts to update last_message
          fetchContacts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, selectedContactId, fetchContacts]);

  // Realtime for contact updates
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
    generateQrCode,
    checkConnection,
    assignContact,
    transferContact,
    updateConversationStatus,
    companyId,
  };
}
