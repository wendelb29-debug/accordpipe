import { useState } from "react";
import { ConversationList } from "../ConversationList";
import { ChatArea } from "../ChatArea";
import { ContactInfo } from "../ContactInfo";
import { mockContacts } from "../mock-data";

export function CaixaDeEntrada() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const selectedContact = mockContacts.find((c) => c.id === selectedId) || null;

  return (
    <div className="flex h-full w-full bg-white dark:bg-[#111b21] overflow-hidden rounded-lg shadow-sm border border-[#e9edef] dark:border-[#222d34]">
      {/* Sidebar */}
      <div className="w-[300px] xl:w-[340px] shrink-0 border-r border-[#e9edef] dark:border-[#222d34]">
        <ConversationList
          contacts={mockContacts}
          selectedId={selectedId}
          onSelect={(id) => { setSelectedId(id); setShowInfo(false); }}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />
      </div>

      {/* Chat */}
      <div className="flex-1 min-w-0">
        <ChatArea contact={selectedContact} />
      </div>

      {/* Contact Info Panel */}
      {showInfo && selectedContact && (
        <ContactInfo contact={selectedContact} onClose={() => setShowInfo(false)} />
      )}
    </div>
  );
}
