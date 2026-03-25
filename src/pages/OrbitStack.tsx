import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ConversationList } from "@/components/atendimento/ConversationList";
import { ChatArea } from "@/components/atendimento/ChatArea";
import { ContactInfo } from "@/components/atendimento/ContactInfo";
import { mockContacts } from "@/components/atendimento/mock-data";
import { QrCodeModal } from "@/components/orbit-inbox/QrCodeModal";
import { InboxHeader } from "@/components/orbit-inbox/InboxHeader";

export default function OrbitStack() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected"
  >("disconnected");
  const [loading, setLoading] = useState(false);

  const selectedContact = mockContacts.find((c) => c.id === selectedId) || null;

  const invokeZapi = useCallback(
    async (action: string, params: Record<string, any> = {}) => {
      const { data, error } = await supabase.functions.invoke("zapi", {
        body: { action, ...params },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    []
  );

  const checkConnection = useCallback(async () => {
    try {
      const data = await invokeZapi("status");
      const connected = data?.data?.connected;
      setConnectionStatus(connected === true ? "connected" : "disconnected");
    } catch {
      setConnectionStatus("disconnected");
    }
  }, [invokeZapi]);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  const generateQrCode = useCallback(async () => {
    setLoading(true);
    setConnectionStatus("connecting");
    try {
      const data = await invokeZapi("get-qrcode");
      const qr = data?.data?.value;
      if (qr) {
        setQrCode(qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`);
        toast.success("QR Code gerado! Escaneie com seu WhatsApp.");
      } else if (data?.data?.connected === true) {
        setConnectionStatus("connected");
        setQrCode(null);
        setQrModalOpen(false);
        toast.success("WhatsApp já conectado!");
      } else {
        toast.error("Não foi possível gerar o QR Code.");
        setConnectionStatus("disconnected");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar QR Code");
      setConnectionStatus("disconnected");
    } finally {
      setLoading(false);
    }
  }, [invokeZapi]);

  const handleConnectClick = () => {
    setQrModalOpen(true);
    if (connectionStatus !== "connected") generateQrCode();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <InboxHeader
        connectionStatus={connectionStatus}
        onConnectClick={handleConnectClick}
      />

      {/* Main chat layout */}
      <div className="flex flex-1 min-h-0 border-b border-border">
        <div className="w-[340px] shrink-0 border-r border-border">
          <ConversationList
            contacts={mockContacts}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              setShowContactInfo(false);
            }}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        </div>

        <ChatArea
          contact={selectedContact}
          onSendMessage={() => {}}
        />

        {showContactInfo && selectedContact && (
          <ContactInfo
            contact={selectedContact}
            onClose={() => setShowContactInfo(false)}
          />
        )}
      </div>

      <QrCodeModal
        open={qrModalOpen}
        onOpenChange={setQrModalOpen}
        qrCode={qrCode}
        connectionStatus={connectionStatus}
        loading={loading}
        onGenerateQrCode={generateQrCode}
      />
    </div>
  );
}
