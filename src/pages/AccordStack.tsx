import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWhatsAppInbox } from "@/hooks/useWhatsAppInbox";
import { toast } from "sonner";
import { QrCodeModal } from "@/components/accord-inbox/QrCodeModal";
import { InboxHeader } from "@/components/accord-inbox/InboxHeader";
import { InboxSidebar, ConversationStatusFilter } from "@/components/accord-inbox/InboxSidebar";
import { InboxChat } from "@/components/accord-inbox/InboxChat";
import { TransferDialog } from "@/components/accord-inbox/TransferDialog";
import { ContactDetailSidebar } from "@/components/accord-inbox/ContactDetailSidebar";
import { CreateDemandModal } from "@/components/accord-inbox/CreateDemandModal";

export default function AccordStack() {
  const {
    contacts, messages, selectedContactId, selectContact, sendMessage,
    filter, setFilter, loading, isAdminOrCeo, connectionStatus,
    generateQrCode, assignContact, transferContact, companyId,
    updateConversationStatus,
  } = useWhatsAppInbox();

  const [searchTerm, setSearchTerm] = useState("");
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
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

  const handleConnectClick = async () => {
    setQrModalOpen(true);
    if (connectionStatus !== "connected") {
      setQrLoading(true);
      const qr = await generateQrCode();
      if (qr) {
        setQrCode(qr);
        toast.success("QR Code gerado! Escaneie com seu WhatsApp.");
      } else {
        setQrCode(null);
        setQrModalOpen(false);
        toast.success("WhatsApp já conectado!");
      }
      setQrLoading(false);
    }
  };

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
      // Auto-set status to em_atendimento when assigning
      await updateConversationStatus(contactId, "em_atendimento");
    }
  };

  const handleUpdateStatus = async (contactId: string, status: string) => {
    await updateConversationStatus(contactId, status);
  };

  const handleSelectContact = (id: string) => {
    selectContact(id);
    // Don't auto-close info panel
  };

  // Get last messages summary for demand creation
  const lastMessagesSummary = messages
    .slice(-5)
    .map(m => `${m.direction === "inbound" ? "Cliente" : "Atendente"}: ${m.message}`)
    .join("\n");

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-background">
      <InboxHeader
        connectionStatus={connectionStatus}
        onConnectClick={handleConnectClick}
      />

      <div className="flex flex-1 min-h-0">
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
      </div>

      <QrCodeModal
        open={qrModalOpen}
        onOpenChange={setQrModalOpen}
        qrCode={qrCode}
        connectionStatus={connectionStatus}
        loading={qrLoading}
        onGenerateQrCode={async () => {
          setQrLoading(true);
          const qr = await generateQrCode();
          if (qr) setQrCode(qr);
          setQrLoading(false);
        }}
      />

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
