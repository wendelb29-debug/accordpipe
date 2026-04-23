import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWhatsAppInbox, InboxFilter } from "@/hooks/useWhatsAppInbox";
import { InboxSidebar, ConversationStatusFilter } from "@/components/accord-inbox/InboxSidebar";
import { InboxChat } from "@/components/accord-inbox/InboxChat";
import { TransferDialog } from "@/components/accord-inbox/TransferDialog";
import { ContactDetailSidebar } from "@/components/accord-inbox/ContactDetailSidebar";
import { CreateDemandModal } from "@/components/accord-inbox/CreateDemandModal";
import { NewConversationModal } from "@/components/accord-inbox/NewConversationModal";
import { WifiOff, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type UiFilter = "Todas" | "Não lidas";

export default function AccordStack() {
  const {
    contacts, messages, selectedContactId, selectContact, sendMessage, toggleReaction,
    filter, setFilter, loading, isAdminOrCeo, connectionStatus,
    assignContact, transferContact, companyId, refetchContacts,
    updateConversationStatus, activeIntegration, unreadByContact,
  } = useWhatsAppInbox();

  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferContactId, setTransferContactId] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [demandModalOpen, setDemandModalOpen] = useState(false);
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ConversationStatusFilter>("fila");
  const [uiFilter, setUiFilter] = useState<UiFilter>("Todas");

  const selectedContact = contacts.find((c) => c.id === selectedContactId) || null;
  // On mobile, show chat full-screen when a conversation is selected (hide list)
  const showChatOnly = isMobile && !!selectedContactId;
  const showListOnly = isMobile && !selectedContactId;

  const matchesStatus = (status: string | undefined, tab: ConversationStatusFilter) => {
    const s = status || "fila";
    if (tab === "fila") return s === "fila" || s === "aguardando";
    if (tab === "em_atendimento") return s === "em_atendimento";
    if (tab === "encerrado") return s === "encerrado" || s === "finalizado";
    return true;
  };

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm);
    const matchesUnread =
      uiFilter === "Todas" ? true : (unreadByContact[c.id] || 0) > 0;
    return matchesStatus(c.conversation_status, statusFilter) && matchesSearch && matchesUnread;
  });

  // Map InboxContact -> SidebarContact (with unread badge + unread-first ordering)
  const sidebarContacts = filteredContacts
    .map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      lastMessage: c.last_message || undefined,
      lastMessageTime: c.last_message_at
        ? new Date(c.last_message_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        : undefined,
      profilePicUrl: c.avatar_url || undefined,
      conversationStatus: c.conversation_status,
      assignedTo: c.assigned_to || undefined,
      unreadCount: unreadByContact[c.id] || 0,
      _lastAt: c.last_message_at ? new Date(c.last_message_at).getTime() : 0,
    }))
    .sort((a, b) => {
      // Unread conversations first, then most-recent
      if ((a.unreadCount > 0) !== (b.unreadCount > 0)) return a.unreadCount > 0 ? -1 : 1;
      return b._lastAt - a._lastAt;
    })
    .map(({ _lastAt, ...rest }) => rest);

  // Map InboxContact -> ChatContact
  const chatContact = selectedContact
    ? {
        id: selectedContact.id,
        name: selectedContact.name,
        phone: selectedContact.phone,
        profilePicUrl: selectedContact.avatar_url || undefined,
        conversationStatus: selectedContact.conversation_status,
        assignedTo: selectedContact.assigned_to || undefined,
      }
    : null;

  // Map InboxMessage -> ChatMessage (extracts attachment metadata when available)
  const chatMessages = messages.map((m) => {
    const meta = (m.metadata || {}) as Record<string, any>;
    const fileName =
      meta.fileName || meta.file_name || meta.filename ||
      meta.docName || meta.name || undefined;
    const fileSize = meta.fileSize || meta.file_size || meta.size || undefined;
    const mimeType = meta.mimeType || meta.mime_type || meta.mimetype || undefined;
    return {
      id: m.id,
      message: m.message,
      direction: m.direction,
      created_at: m.created_at,
      type: m.message_type,
      mediaUrl: m.media_url || undefined,
      fileName,
      fileSize,
      mimeType,
      status: m.status,
      replyToMessageId: m.reply_to_message_id || undefined,
      reactions: Array.isArray(m.reactions) ? m.reactions : [],
    };
  });

  console.log("[AccordStack] selectedContactId:", selectedContactId, "messages:", messages.length, "chatMessages:", chatMessages.length);

  const handleTransfer = (contactId: string) => {
    setTransferContactId(contactId);
    setTransferOpen(true);
  };

  const handleTransferConfirm = async (userId: string) => {
    if (transferContactId) {
      await transferContact(transferContactId, userId);
      setTransferOpen(false);
      setTransferContactId(null);
    }
  };

  const handleAssignToMe = async (contactId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await assignContact(contactId, user.id);
      await updateConversationStatus(contactId, "em_atendimento");
    }
  };

  const handleUpdateStatus = async (contactId: string, status: string) => {
    await updateConversationStatus(contactId, status);
  };

  const lastMessagesSummary = messages
    .slice(-5)
    .map((m) => `${m.direction === "inbound" ? "Cliente" : "Atendente"}: ${m.message}`)
    .join("\n");

  // Considera conectado se a integração está ativa OU explicitamente "connected".
  // Só bloqueia se status for explicitamente "disconnected"/"error".
  const isIntegrationConnected = !!activeIntegration && (
    activeIntegration.connection_status === "connected" ||
    (!!activeIntegration.is_active &&
      activeIntegration.connection_status !== "disconnected" &&
      activeIntegration.connection_status !== "error")
  );

  console.log("[AccordStack] activeIntegration:", activeIntegration, "→ isConnected:", isIntegrationConnected);

  const integrations = activeIntegration
    ? [
        {
          id: activeIntegration.id || "active",
          provider: (activeIntegration.provider_type === "zapi"
            ? "zapi"
            : activeIntegration.provider_type === "uazapi"
            ? "uazapi"
            : "cloud") as "zapi" | "uazapi" | "cloud",
          label: activeIntegration.instance_name || activeIntegration.connected_phone || "Instância ativa",
          phone: activeIntegration.connected_phone || undefined,
          serverUrl: activeIntegration.server_url || undefined,
          instanceName: activeIntegration.instance_name || undefined,
          isConnected: isIntegrationConnected,
        },
      ]
    : [];

  if (!loading && !activeIntegration && connectionStatus === "disconnected") {
    return (
      <div className="flex h-full min-h-0 bg-background items-center justify-center">
        <div className="text-center space-y-5 max-w-md px-6">
          <div className="h-20 w-20 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center">
            <WifiOff className="h-9 w-9 text-muted-foreground/50" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">WhatsApp não conectado</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Configure sua integração de WhatsApp (Uazapi ou Z-API) nas configurações do tenant para iniciar os atendimentos.
            </p>
          </div>
          <Button onClick={() => navigate("/perfil")} className="gap-2 h-10 px-6 rounded-xl">
            <User className="h-4 w-4" />
            Ir para Configurações
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 bg-background overflow-hidden">
      <div className={cn(
        "flex-shrink-0 w-full md:w-auto h-full",
        showChatOnly && "hidden md:block",
      )}>
        <InboxSidebar
          contacts={sidebarContacts}
          selectedId={selectedContactId}
          onSelect={selectContact}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filter={uiFilter}
          onFilterChange={(label) => setUiFilter((label as UiFilter) || "Todas")}
          isAdmin={isAdminOrCeo}
          loading={loading}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onNewConversation={() => setNewConvOpen(true)}
          tenantId={companyId}
          onAvatarsSynced={refetchContacts}
        />
      </div>

      <div className={cn("flex-1 min-w-0 min-h-0 overflow-hidden", showListOnly && "hidden md:flex")}>
        <InboxChat
          contact={chatContact}
          messages={chatMessages}
          onSendMessage={sendMessage}
          onReactToMessage={toggleReaction}
          onTransfer={handleTransfer}
          onAssignToMe={handleAssignToMe}
          isAdmin={isAdminOrCeo}
          companyId={companyId}
          onToggleInfo={() => setShowInfo(!showInfo)}
          showInfo={showInfo}
          onCreateDemand={() => setDemandModalOpen(true)}
          onUpdateStatus={handleUpdateStatus}
          onBack={isMobile ? () => selectContact(null) : undefined}
        />
      </div>

      {showInfo && selectedContact && !isMobile && (
        <ContactDetailSidebar
          contact={selectedContact}
          onClose={() => setShowInfo(false)}
          onCreateDemand={() => setDemandModalOpen(true)}
          companyId={companyId}
        />
      )}

      <TransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        onConfirm={handleTransferConfirm}
        companyId={companyId}
      />

      {selectedContact && companyId && (
        <CreateDemandModal
          open={demandModalOpen}
          onOpenChange={setDemandModalOpen}
          contact={selectedContact}
          companyId={companyId}
          lastMessages={lastMessagesSummary}
        />
      )}

      <NewConversationModal
        open={newConvOpen}
        onOpenChange={(open) => {
          setNewConvOpen(open);
          if (open) refetchContacts();
        }}
        integrations={integrations}
        onStart={async ({ phone, name, integrationId, initialMessage }) => {
          if (!companyId) {
            toast.error("Tenant não identificado");
            return;
          }
          if (!isIntegrationConnected) {
            toast.error("Integração WhatsApp não está conectada");
            return;
          }
          // Normaliza telefone (apenas dígitos)
          const normalizedPhone = phone.replace(/\D/g, "");
          if (normalizedPhone.length < 10) {
            toast.error("Número inválido");
            return;
          }
          console.log("[NewConversation] start", { normalizedPhone, name, integrationId, companyId });

          try {
            // Pega usuário atual para atribuir a conversa automaticamente
            const { data: { user: authUser } } = await supabase.auth.getUser();
            const currentUserId = authUser?.id ?? null;

            // 1. Localiza ou cria contato em whatsapp_contacts
            const { data: existing } = await supabase
              .from("whatsapp_contacts")
              .select("*")
              .eq("company_id", companyId)
              .eq("phone", normalizedPhone)
              .maybeSingle();

            let contactId: string;
            if (existing) {
              contactId = existing.id;
              const updates: Record<string, unknown> = {};
              if (name && name !== existing.name) updates.name = name;
              if ((existing as any).conversation_status === "encerrado") {
                updates.conversation_status = "em_atendimento";
              }
              // Atribui ao usuário atual se ainda estiver sem dono (garante visibilidade no filtro "Minhas")
              if (!existing.assigned_to && currentUserId) {
                updates.assigned_to = currentUserId;
              }
              if (Object.keys(updates).length > 0) {
                await supabase.from("whatsapp_contacts").update(updates as any).eq("id", contactId);
              }
            } else {
              const { data: created, error: createErr } = await supabase
                .from("whatsapp_contacts")
                .insert({
                  company_id: companyId,
                  phone: normalizedPhone,
                  name: name || normalizedPhone,
                  conversation_status: "em_atendimento",
                  assigned_to: currentUserId, // garante que aparece no filtro "Minhas"
                } as any)
                .select()
                .single();
              if (createErr || !created) {
                console.error("[NewConversation] create contact error:", createErr);
                toast.error(`Erro ao criar contato: ${createErr?.message ?? "desconhecido"}`);
                return;
              }
              contactId = created.id;
              console.log("[NewConversation] contato criado:", contactId);
            }

            // 2. Fecha modal, ajusta filtros para garantir visibilidade e abre conversa
            setNewConvOpen(false);
            setSearchTerm("");
            setStatusFilter("em_atendimento");
            if (currentUserId) setFilter("mine");
            await refetchContacts();
            // Pequeno delay para o estado de contatos atualizar antes da seleção
            setTimeout(() => selectContact(contactId), 50);

            // 3. Envia mensagem inicial via provider, se houver
            if (initialMessage?.trim()) {
              const { data: msgData, error: msgError } = await supabase
                .from("whatsapp_messages")
                .insert({
                  company_id: companyId,
                  contact_id: contactId,
                  phone: normalizedPhone,
                  message: initialMessage.trim(),
                  direction: "outbound",
                  status: "sending",
                  message_type: "text",
                })
                .select()
                .single();

              if (!msgError && msgData) {
                const { data: sendRes, error: sendErr } = await supabase.functions.invoke(
                  "whatsapp-send",
                  {
                    body: {
                      tenant_id: companyId,
                      phone: normalizedPhone,
                      text: initialMessage.trim(),
                      message_id: msgData.id,
                    },
                  }
                );
                if (sendErr || !sendRes?.success) {
                  await supabase
                    .from("whatsapp_messages")
                    .update({ status: "failed" })
                    .eq("id", msgData.id);
                  toast.error(sendRes?.message || "Falha ao enviar mensagem inicial");
                } else {
                  toast.success("Conversa iniciada!");
                }
              }

              await supabase
                .from("whatsapp_contacts")
                .update({
                  last_message: initialMessage.trim(),
                  last_message_at: new Date().toISOString(),
                })
                .eq("id", contactId);
            } else {
              toast.success("Conversa pronta para atendimento");
            }
          } catch (err: any) {
            console.error("[NewConversation] exception:", err);
            toast.error(err?.message || "Erro ao iniciar conversa");
          }
        }}
      />
    </div>
  );
}
