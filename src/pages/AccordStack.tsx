import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWhatsAppInbox } from "@/hooks/useWhatsAppInbox";
import { toast } from "sonner";
import { InboxSidebar, ConversationStatusFilter } from "@/components/accord-inbox/InboxSidebar";
import { InboxChat } from "@/components/accord-inbox/InboxChat";
import { TransferDialog } from "@/components/accord-inbox/TransferDialog";
import { ContactDetailSidebar } from "@/components/accord-inbox/ContactDetailSidebar";
import { CreateDemandModal } from "@/components/accord-inbox/CreateDemandModal";
import { WifiOff, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function AccordStack() {
  const {
    contacts, messages, selectedContactId, selectContact, sendMessage,
    filter, setFilter, loading, isAdminOrCeo, connectionStatus,
    generateQrCode, assignContact, transferContact, companyId,
    updateConversationStatus, activeIntegration,
  } = useWhatsAppInbox();

  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferContactId, setTransferContactId] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [demandModalOpen, setDemandModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ConversationStatusFilter>("em_atendimento");

  const selectedContact = contacts.find(c => c.id === selectedContactId) || null;

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

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

  const handleSelectContact = (id: string) => {
    selectContact(id);
  };

  const lastMessagesSummary = messages
    .slice(-5)
    .map(m => `${m.direction === "inbound" ? "Cliente" : "Atendente"}: ${m.message}`)
    .join("\n");

  // No integration configured at all → block UI and direct user to setup
  if (!activeIntegration && !loading && contacts.length === 0) {
    return (
      <div className="flex h-[calc(100vh-3rem)] bg-background items-center justify-center">
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
          <Button
            onClick={() => navigate("/perfil")}
            className="gap-2 h-10 px-6 rounded-xl"
          >
            <User className="h-4 w-4" />
            Ir para Configurações
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] bg-background">
      <InboxSidebar
        contacts={filteredContacts}
        selectedId={selectedContactId}
        onSelect={handleSelectContact}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filter={filter}
        onFilterChange={setFilter}
        isAdmin={isAdminOrCeo}
        loading={loading}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <InboxChat
        contact={selectedContact}
        messages={messages}
        onSendMessage={sendMessage}
        onTransfer={handleTransfer}
        onAssignToMe={handleAssignToMe}
        isAdmin={isAdminOrCeo}
        companyId={companyId}
        onToggleInfo={() => setShowInfo(!showInfo)}
        showInfo={showInfo}
        onCreateDemand={() => setDemandModalOpen(true)}
        onUpdateStatus={handleUpdateStatus}
      />

      {showInfo && selectedContact && (
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
    </div>
  );
}
