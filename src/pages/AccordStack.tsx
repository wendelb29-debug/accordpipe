import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWhatsAppInbox } from "@/hooks/useWhatsAppInbox";
import { InboxSidebar, ConversationStatusFilter } from "@/components/accord-inbox/InboxSidebar";
import { InboxChat } from "@/components/accord-inbox/InboxChat";
import { TransferDialog } from "@/components/accord-inbox/TransferDialog";
import { ContactDetailSidebar } from "@/components/accord-inbox/ContactDetailSidebar";
import { CreateDemandModal } from "@/components/accord-inbox/CreateDemandModal";
import { WifiOff, User, MessageSquare, Users, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

function NavIcon({
  icon, active, title, onClick,
}: {
  icon: React.ReactNode; active?: boolean; title?: string; onClick?: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={cn(
        "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      {icon}
    </button>
  );
}

export default function AccordStack() {
  const {
    contacts, messages, selectedContactId, selectContact, sendMessage,
    filter, setFilter, loading, isAdminOrCeo,
    assignContact, transferContact, companyId,
    updateConversationStatus, activeIntegration,
  } = useWhatsAppInbox();

  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferContactId, setTransferContactId] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [demandModalOpen, setDemandModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ConversationStatusFilter>("em_atendimento");

  const selectedContact = contacts.find((c) => c.id === selectedContactId) || null;

  const filteredContacts = contacts.filter((c) =>
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

  const lastMessagesSummary = messages
    .slice(-5)
    .map((m) => `${m.direction === "inbound" ? "Cliente" : "Atendente"}: ${m.message}`)
    .join("\n");

  if (!loading && !activeIntegration) {
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
          <Button onClick={() => navigate("/perfil")} className="gap-2 h-10 px-6 rounded-xl">
            <User className="h-4 w-4" />
            Ir para Configurações
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] bg-background overflow-hidden">
      {/* Nav Rail */}
      <div className="w-14 flex-shrink-0 border-r border-border/60 bg-background flex flex-col items-center py-3 gap-1">
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center mb-4 flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>

        <NavIcon icon={<MessageSquare size={16} />} active title="Atendimentos" />
        <NavIcon icon={<Users size={16} />} title="Contatos" />

        <div className="mt-auto flex flex-col items-center gap-2">
          <NavIcon icon={<Settings size={16} />} title="Configurações" onClick={() => navigate("/perfil")} />
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-[11px] font-medium text-primary-foreground cursor-pointer border-2 border-primary/30">
            A
          </div>
        </div>
      </div>

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
