import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ConversationList } from "@/components/atendimento/ConversationList";
import { ChatArea } from "@/components/atendimento/ChatArea";
import { ContactInfo } from "@/components/atendimento/ContactInfo";
import { mockContacts } from "@/components/atendimento/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  QrCode,
  MessageSquareText,
} from "lucide-react";

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

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#25D366]/10">
            <MessageSquareText className="h-5 w-5 text-[#25D366]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">
              Orbit Inbox – Central Inteligente de Conversas
            </h1>
            <p className="text-xs text-muted-foreground">
              Gerencie atendimentos, responda clientes e automatize conversas com
              inteligência artificial.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={
              connectionStatus === "connected"
                ? "border-green-500/30 text-green-600 bg-green-500/10"
                : "text-muted-foreground"
            }
          >
            {connectionStatus === "connected" ? (
              <>
                <Wifi className="h-3 w-3 mr-1" /> Conectado
              </>
            ) : connectionStatus === "connecting" ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Conectando…
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 mr-1" /> Desconectado
              </>
            )}
          </Badge>
          <Button
            size="sm"
            variant={connectionStatus === "connected" ? "outline" : "default"}
            className="gap-1.5"
            onClick={() => {
              setQrModalOpen(true);
              if (connectionStatus !== "connected") generateQrCode();
            }}
          >
            <QrCode className="h-4 w-4" />
            {connectionStatus === "connected"
              ? "Reconectar"
              : "Conectar WhatsApp"}
          </Button>
        </div>
      </div>

      {/* Main chat layout */}
      <div className="flex flex-1 min-h-0 border-b border-border">
        {/* Left: conversation list */}
        <div className="w-[340px] shrink-0 border-r border-border">
          <ConversationList
            contacts={mockContacts}
            selectedId={selectedId}
            onSelect={setSelectedId}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        </div>

        {/* Center: chat area */}
        <ChatArea contact={selectedContact} onSendMessage={() => {}} />

        {/* Right: contact info panel */}
        {showContactInfo && selectedContact && (
          <ContactInfo
            contact={selectedContact}
            onClose={() => setShowContactInfo(false)}
          />
        )}
      </div>

      {/* QR Code Modal */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-[#25D366]" />
              Conectar WhatsApp
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-4">
            {qrCode ? (
              <>
                <div className="rounded-xl border border-border p-3 bg-white">
                  <img
                    src={qrCode}
                    alt="QR Code WhatsApp"
                    className="h-56 w-56 object-contain"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center max-w-[280px]">
                  Abra o WhatsApp → Aparelhos conectados → Conectar → Escaneie o
                  QR Code acima
                </p>
                <Badge variant="secondary" className="gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" /> Aguardando
                  conexão…
                </Badge>
              </>
            ) : connectionStatus === "connected" ? (
              <>
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
                  <Wifi className="h-10 w-10 text-green-500" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  WhatsApp conectado!
                </p>
              </>
            ) : (
              <>
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                  <WifiOff className="h-10 w-10 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Nenhum WhatsApp conectado
                </p>
              </>
            )}

            <Button
              onClick={generateQrCode}
              disabled={loading}
              className="w-full gap-2"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <QrCode className="h-4 w-4" />
              )}
              {connectionStatus === "connected"
                ? "Reconectar"
                : "Gerar QR Code"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
