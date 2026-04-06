import { useState, useEffect } from "react";
import { Smartphone, QrCode, Wifi, WifiOff, RefreshCw, Settings, Loader2, Plus, Unplug, Webhook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useEvolutionApi } from "@/hooks/useEvolutionApi";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type ConnectionStatus = "disconnected" | "connecting" | "connected";

export function Configuracoes() {
  const { activeCompanyId, profile } = useAuth();
  const { loading, createInstance, connect, connectionState, logout } = useEvolutionApi();

  const companyId = activeCompanyId || profile?.company_id;
  const defaultInstanceName = companyId ? `accord-${companyId.slice(0, 8)}` : "accord-default";

  const [instanceName, setInstanceName] = useState(defaultInstanceName);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [instanceCreated, setInstanceCreated] = useState(false);

  useEffect(() => {
    setInstanceName(defaultInstanceName);
  }, [defaultInstanceName]);

  const handleCreateInstance = async () => {
    if (!instanceName.trim()) {
      toast.error("Nome da instância é obrigatório");
      return;
    }
    try {
      await createInstance(instanceName);
      setInstanceCreated(true);
      toast.success("Instância criada com sucesso!");
      // Auto-connect to get QR code
      handleConnect();
    } catch {
      // error handled in hook
    }
  };

  const handleConnect = async () => {
    try {
      setStatus("connecting");
      const result = await connect(instanceName);
      if (result?.data?.base64) {
        setQrCode(result.data.base64);
        setStatus("connecting");
        toast.info("Escaneie o QR Code com seu WhatsApp");
        // Start polling for connection
        pollConnectionState();
      } else if (result?.data?.instance?.state === "open") {
        setStatus("connected");
        setQrCode(null);
        toast.success("WhatsApp já está conectado!");
      } else {
        setQrCode(null);
        toast.info("QR Code não disponível. Tente novamente.");
        setStatus("disconnected");
      }
    } catch {
      setStatus("disconnected");
    }
  };

  const pollConnectionState = () => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 30) {
        clearInterval(interval);
        return;
      }
      try {
        const result = await connectionState(instanceName);
        const state = result?.data?.instance?.state;
        if (state === "open") {
          setStatus("connected");
          setQrCode(null);
          toast.success("WhatsApp conectado com sucesso!");
          clearInterval(interval);
        }
      } catch {
        // keep polling
      }
    }, 5000);
  };

  const handleCheckStatus = async () => {
    try {
      const result = await connectionState(instanceName);
      const state = result?.data?.instance?.state;
      if (state === "open") {
        setStatus("connected");
        setQrCode(null);
        toast.success("WhatsApp está conectado!");
      } else {
        setStatus("disconnected");
        toast.info(`Status: ${state || "desconhecido"}`);
      }
      setInstanceCreated(true);
    } catch {
      setStatus("disconnected");
    }
  };

  const handleDisconnect = async () => {
    try {
      await logout(instanceName);
      setStatus("disconnected");
      setQrCode(null);
      toast.success("WhatsApp desconectado!");
    } catch {
      // error handled in hook
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Configurações WhatsApp</h2>
        <p className="text-sm text-muted-foreground">Conecte via Evolution API para enviar e receber mensagens</p>
      </div>

      {/* Instance Name */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Instância Evolution API</CardTitle>
          <CardDescription>Nome da instância WhatsApp no seu servidor</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
              placeholder="Nome da instância (ex: accord-empresa)"
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={handleCheckStatus}
              disabled={loading || !instanceName.trim()}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Verificar
            </Button>
          </div>
          {!instanceCreated && (
            <Button
              onClick={handleCreateInstance}
              disabled={loading || !instanceName.trim()}
              className="gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Criar Instância
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Status da Conexão</CardTitle>
              <CardDescription>Conecte seu WhatsApp escaneando o QR Code</CardDescription>
            </div>
            <Badge
              variant={status === "connected" ? "default" : "secondary"}
              className="gap-1.5"
            >
              {status === "connected" ? (
                <><Wifi className="h-3 w-3" /> Conectado</>
              ) : status === "connecting" ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> Conectando</>
              ) : (
                <><WifiOff className="h-3 w-3" /> Desconectado</>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-6 space-y-4">
            {qrCode ? (
              <div className="rounded-2xl overflow-hidden border-2 border-primary/20 p-2 bg-white">
                <img src={qrCode} alt="QR Code WhatsApp" className="h-52 w-52" />
              </div>
            ) : (
              <div className="h-48 w-48 border-2 border-dashed border-border rounded-2xl flex items-center justify-center bg-muted/30">
                <div className="text-center space-y-2">
                  <QrCode className="h-16 w-16 text-muted-foreground/40 mx-auto" />
                  <p className="text-xs text-muted-foreground">
                    {status === "connected" ? "WhatsApp conectado ✓" : "QR Code aparecerá aqui"}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {status !== "connected" ? (
                <Button
                  className="gap-2"
                  onClick={handleConnect}
                  disabled={loading || !instanceName.trim()}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
                  Conectar WhatsApp
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  className="gap-2"
                  onClick={handleDisconnect}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
                  Desconectar
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center max-w-sm">
              Abra o WhatsApp no seu celular → Configurações → Aparelhos conectados → Escanear QR Code
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configurações Gerais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Reconexão automática</p>
              <p className="text-xs text-muted-foreground">Reconectar automaticamente se a sessão cair</p>
            </div>
            <Badge variant="default" className="text-[10px]">Ativo</Badge>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Notificações sonoras</p>
              <p className="text-xs text-muted-foreground">Tocar som ao receber novas mensagens</p>
            </div>
            <Badge variant="default" className="text-[10px]">Ativo</Badge>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Horário de atendimento</p>
              <p className="text-xs text-muted-foreground">Seg-Sex, 08:00 - 18:00</p>
            </div>
            <Button variant="outline" size="sm" className="text-xs h-7">
              <Settings className="h-3 w-3 mr-1" /> Editar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
