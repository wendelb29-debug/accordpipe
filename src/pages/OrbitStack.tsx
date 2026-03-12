import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Rocket, Wifi, WifiOff, Send, RefreshCw, QrCode,
  MessageSquare, Clock, Webhook, ArrowDownLeft, ArrowUpRight, Bell,
} from "lucide-react";

interface SentMessage {
  number: string;
  text: string;
  status: "sent" | "error";
  timestamp: Date;
  error?: string;
}

interface WebhookEvent {
  id: string;
  event_type: string;
  phone: string | null;
  message_id: string | null;
  payload: any;
  created_at: string;
}

export default function OrbitStack() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [number, setNumber] = useState("");
  const [text, setText] = useState("");
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const webhookUrl = `https://${projectId}.supabase.co/functions/v1/zapi-webhook`;

  const invokeZapi = useCallback(async (action: string, params: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("zapi", {
      body: { action, ...params },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  // Fetch initial webhook events
  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from("zapi_webhook_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setWebhookEvents(data as unknown as WebhookEvent[]);
    };
    fetchEvents();
  }, []);

  // Realtime webhook events
  useEffect(() => {
    const channel = supabase
      .channel("zapi-webhook-events")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "zapi_webhook_events" },
        (payload) => {
          const newEvent = payload.new as unknown as WebhookEvent;
          setWebhookEvents((prev) => [newEvent, ...prev.slice(0, 49)]);

          // Update connection status based on events
          if (newEvent.event_type === "connected") {
            setConnectionStatus("connected");
            setQrCode(null);
            toast.success("WhatsApp conectado via webhook!");
          } else if (newEvent.event_type === "disconnected") {
            setConnectionStatus("disconnected");
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const generateQrCode = useCallback(async () => {
    setLoading(true);
    setConnectionStatus("connecting");
    try {
      const data = await invokeZapi("get-qrcode");
      const qr = data?.data?.value;
      if (qr) {
        const imgSrc = qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`;
        setQrCode(imgSrc);
        toast.success("QR Code gerado! Escaneie com seu WhatsApp.");
      } else if (data?.data?.connected === true) {
        setConnectionStatus("connected");
        setQrCode(null);
        toast.success("WhatsApp já conectado!");
      } else {
        toast.error("Não foi possível gerar o QR Code.");
        setConnectionStatus("disconnected");
      }
    } catch (err: any) {
      console.error("QR Code error:", err);
      toast.error(err.message || "Erro ao gerar QR Code");
      setConnectionStatus("disconnected");
    } finally {
      setLoading(false);
    }
  }, [invokeZapi]);

  const checkConnection = useCallback(async () => {
    try {
      const data = await invokeZapi("status");
      const connected = data?.data?.connected;
      setConnectionStatus(connected === true ? "connected" : "disconnected");
      if (connected === true) setQrCode(null);
    } catch {
      setConnectionStatus("disconnected");
    }
  }, [invokeZapi]);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  const handleSendMessage = async () => {
    if (!number.trim() || !text.trim()) {
      toast.error("Preencha o número e a mensagem.");
      return;
    }
    const cleanNumber = number.replace(/\D/g, "");
    if (cleanNumber.length < 10) {
      toast.error("Número inválido. Use formato: 5511999999999");
      return;
    }

    setSendingMessage(true);
    try {
      await invokeZapi("send-text", { phone: cleanNumber, message: text.trim() });
      setSentMessages((prev) => [
        { number: cleanNumber, text: text.trim(), status: "sent", timestamp: new Date() },
        ...prev,
      ]);
      toast.success("Mensagem enviada com sucesso!");
      setText("");
    } catch (err: any) {
      setSentMessages((prev) => [
        { number: cleanNumber, text: text.trim(), status: "error", timestamp: new Date(), error: err.message },
        ...prev,
      ]);
      toast.error(err.message || "Erro ao enviar mensagem");
    } finally {
      setSendingMessage(false);
    }
  };

  const getEventIcon = (type: string) => {
    if (type.includes("received") || type.includes("message_received")) return <ArrowDownLeft className="h-3.5 w-3.5 text-blue-500" />;
    if (type.includes("sent") || type.includes("sent_by_me")) return <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />;
    if (type === "connected") return <Wifi className="h-3.5 w-3.5 text-green-500" />;
    if (type === "disconnected") return <WifiOff className="h-3.5 w-3.5 text-destructive" />;
    return <Bell className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Rocket className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">WhatsApp Connect</h1>
          <p className="text-sm text-muted-foreground">Conecte seu WhatsApp e envie mensagens via Z-API</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* QR Code / Connection */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <QrCode className="h-4 w-4 text-primary" />
              Conexão WhatsApp
            </CardTitle>
            <Badge
              variant={connectionStatus === "connected" ? "default" : "secondary"}
              className={connectionStatus === "connected" ? "bg-green-500/10 text-green-600 border-green-500/20" : ""}
            >
              {connectionStatus === "connected" ? (
                <><Wifi className="h-3 w-3 mr-1" /> Conectado</>
              ) : connectionStatus === "connecting" ? (
                <><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Conectando...</>
              ) : (
                <><WifiOff className="h-3 w-3 mr-1" /> Desconectado</>
              )}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {qrCode ? (
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-xl border border-border p-3 bg-white">
                  <img src={qrCode} alt="QR Code WhatsApp" className="h-56 w-56 object-contain" />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Abra o WhatsApp → Aparelhos conectados → Conectar → Escaneie o QR Code
                </p>
              </div>
            ) : connectionStatus === "connected" ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                  <Wifi className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-sm font-medium text-foreground">WhatsApp conectado</p>
                <p className="text-xs text-muted-foreground">Pronto para enviar mensagens</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <WifiOff className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Nenhum WhatsApp conectado</p>
              </div>
            )}
            <Button onClick={generateQrCode} disabled={loading} className="w-full gap-2">
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
              {connectionStatus === "connected" ? "Reconectar" : "Gerar QR Code"}
            </Button>
          </CardContent>
        </Card>

        {/* Send Message */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              Enviar Mensagem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Número do WhatsApp</label>
              <Input placeholder="5511999999999" value={number} onChange={(e) => setNumber(e.target.value)} />
              <p className="text-[11px] text-muted-foreground">Formato: código do país + DDD + número</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Mensagem</label>
              <Textarea placeholder="Digite sua mensagem..." value={text} onChange={(e) => setText(e.target.value)} rows={4} />
            </div>
            <Button onClick={handleSendMessage} disabled={sendingMessage || connectionStatus !== "connected"} className="w-full gap-2">
              {sendingMessage ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar mensagem
            </Button>
            {connectionStatus !== "connected" && (
              <p className="text-xs text-destructive text-center">Conecte o WhatsApp antes de enviar mensagens</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Webhook Config */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Webhook className="h-4 w-4 text-primary" />
              Configuração de Webhook
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">URL do Webhook</label>
              <div className="flex gap-2">
                <Input value={webhookUrl} readOnly className="text-xs font-mono bg-muted" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                    toast.success("URL copiada!");
                  }}
                >
                  Copiar
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Cole esta URL no painel da Z-API → Configurações → Webhook
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Eventos suportados</label>
              <div className="flex flex-wrap gap-1.5">
                {["message_received", "message_status", "connected", "disconnected", "presence", "sent_by_me"].map((evt) => (
                  <Badge key={evt} variant="outline" className="text-[10px] font-mono">
                    {evt}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Webhook Events Realtime */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Eventos em Tempo Real
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">
              {webhookEvents.length} eventos
            </Badge>
          </CardHeader>
          <CardContent>
            {webhookEvents.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <Webhook className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Nenhum evento recebido</p>
                <p className="text-[11px] text-muted-foreground/60">Configure o webhook na Z-API para começar</p>
              </div>
            ) : (
              <ScrollArea className="h-[280px]">
                <div className="space-y-2">
                  {webhookEvents.map((evt) => (
                    <div key={evt.id} className="flex items-start gap-2.5 rounded-lg border border-border p-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                        {getEventIcon(evt.event_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] font-mono">{evt.event_type}</Badge>
                        </div>
                        {evt.phone && <p className="text-xs text-muted-foreground mt-0.5">{evt.phone}</p>}
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(evt.created_at).toLocaleTimeString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sent Messages */}
      {sentMessages.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Mensagens Enviadas ({sentMessages.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sentMessages.map((msg, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-border p-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${msg.status === "sent" ? "bg-green-500/10" : "bg-destructive/10"}`}>
                    {msg.status === "sent" ? <Send className="h-3.5 w-3.5 text-green-500" /> : <WifiOff className="h-3.5 w-3.5 text-destructive" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{msg.number}</p>
                      <Badge variant={msg.status === "sent" ? "default" : "destructive"} className="text-[10px]">
                        {msg.status === "sent" ? "Enviada" : "Erro"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{msg.text}</p>
                    {msg.error && <p className="text-[11px] text-destructive mt-0.5">{msg.error}</p>}
                    <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {msg.timestamp.toLocaleTimeString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
