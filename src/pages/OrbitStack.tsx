import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWhatsAppInbox } from "@/hooks/useWhatsAppInbox";
import { toast } from "sonner";
import { QrCodeModal } from "@/components/orbit-inbox/QrCodeModal";
import { InboxHeader } from "@/components/orbit-inbox/InboxHeader";
import { InboxSidebar } from "@/components/orbit-inbox/InboxSidebar";
import { InboxChat } from "@/components/orbit-inbox/InboxChat";
import { TransferDialog } from "@/components/orbit-inbox/TransferDialog";

export default function OrbitStack() {
  const {
    contacts, messages, selectedContactId, selectContact, sendMessage,
    filter, setFilter, loading, isAdminOrCeo, connectionStatus,
    generateQrCode, assignContact, transferContact, companyId,
  } = useWhatsAppInbox();

  const [searchTerm, setSearchTerm] = useState("");
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferContactId, setTransferContactId] = useState<string | null>(null);

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
    }
  };

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
          onSelect={selectContact}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filter={filter}
          onFilterChange={setFilter}
          isAdmin={isAdminOrCeo}
          loading={loading}
        />

        <InboxChat
          contact={selectedContact}
          messages={messages}
          onSendMessage={sendMessage}
          onTransfer={handleTransfer}
          onAssignToMe={handleAssignToMe}
          isAdmin={isAdminOrCeo}
          companyId={companyId}
        />
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
    </div>
  );
}
