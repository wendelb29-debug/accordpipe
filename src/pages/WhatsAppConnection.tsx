import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Save, QrCode, Wifi, LogOut, RefreshCw, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { useTenantWhatsAppIntegration } from "@/hooks/useTenantWhatsAppIntegration";

const QR_TTL = 40;

export default function WhatsAppConnection() {
  const tenantId = useActiveCompanyId();
  const { getByProvider, save, testConnection, loading, saving, testing, reload } =
    useTenantWhatsAppIntegration(tenantId);
  const integration = getByProvider("uazapi");

  const [serverUrl, setServerUrl] = useState("");
  const [instanceToken, setInstanceToken] = useState("");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [countdown, setCountdown] = useState(QR_TTL);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (integration) {
      setServerUrl(integration.server_url || "");
      setInstanceToken(integration.instance_token || "");
    }
  }, [integration?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!serverUrl.trim() || !instanceToken.trim()) {
      toast.error("Preencha Server URL e Instance Token");
      return;
    }
    await save("uazapi", { server_url: serverUrl, instance_token: instanceToken });
  };

  const normalizeQr = (raw: string) => {
    if (!raw) return raw;
    return raw.startsWith("data:image") ? raw : `data:image/png;base64,${raw}`;
  };

  const handleGenerateQr = async () => {
    if (!serverUrl || !instanceToken) {
      toast.error("Salve as credenciais antes");
      return;
    }
    setGeneratingQr(true);
    try {
      const base = serverUrl.replace(/\/$/, "");
      const headers = { token: instanceToken };

      try {
        const sres = await fetch(`${base}/instance/status`, { headers });
        if (sres.ok) {
          const sdata = await sres.json();
          const st = sdata?.status || sdata?.connection_status;
          if (st === "connected") {
            toast.info("Já conectado! Desconecte primeiro para escanear novo QR Code");
            await reload();
            return;
          }
        }
      } catch { /* segue */ }

      const res = await fetch(`${base}/instance/connect`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const qr = data.qrcode || data.base64 || data.qr;
      if (!qr) throw new Error("QR não retornado");
      setQrCode(normalizeQr(qr));
      setCountdown(QR_TTL);
      setQrOpen(true);
    } catch (err: any) {
      toast.error("Erro ao gerar QR: " + (err.message || "desconhecido"));
    } finally {
      setGeneratingQr(false);
    }
  };

  // countdown + auto polling while QR open
  useEffect(() => {
    if (!qrOpen) {
      if (pollRef.current) clearInterval(pollRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    tickRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (tickRef.current) clearInterval(tickRef.current);
          setQrCode(null);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    pollRef.current = setInterval(async () => {
      const result = await testConnection("uazapi");
      const status = result?.connection_status || result?.status;
      if (status === "connected") {
        toast.success("WhatsApp conectado com sucesso! 🎉");
        setQrOpen(false);
        setQrCode(null);
        await reload();
      }
    }, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [qrOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDisconnect = async () => {
    if (!confirm("Desconectar WhatsApp?")) return;
    setDisconnecting(true);
    try {
      const url = `${serverUrl.replace(/\/$/, "")}/instance/logout`;
      await fetch(url, { method: "POST", headers: { token: instanceToken } });
      await save("uazapi", { connection_status: "disconnected", connected_phone: null });
      toast.success("Desconectado");
      await reload();
    } catch (err: any) {
      toast.error("Erro ao desconectar: " + (err.message || "desconhecido"));
    } finally {
      setDisconnecting(false);
    }
  };

  const status = integration?.connection_status || "disconnected";
  const statusBadge =
    status === "connected" ? (
      <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">Conectado</Badge>
    ) : status === "disconnected" ? (
      <Badge className="bg-destructive/15 text-destructive border-destructive/30">Desconectado</Badge>
    ) : (
      <Badge variant="secondary">Desconhecido</Badge>
    );

  if (!tenantId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Selecione um tenant para configurar o WhatsApp.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Conexão WhatsApp</h1>
        <p className="text-sm text-muted-foreground">
          Conecte seu número via Uazapi escaneando o QR Code.
        </p>
      </div>

      {/* Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Status da Conexão</CardTitle>
              <CardDescription>Estado atual da instância</CardDescription>
            </div>
            {loading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : statusBadge}
          </div>
        </CardHeader>
        {integration?.connected_phone && (
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Número:</span>
              <span className="font-medium">{integration.connected_phone}</span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Credenciais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Credenciais Uazapi</CardTitle>
          <CardDescription>Servidor e token da sua instância</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Server URL</Label>
            <Input
              placeholder="https://free.uazapi.com"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Instance Token</Label>
            <Input
              type="password"
              placeholder="Cole o token da instância"
              value={instanceToken}
              onChange={(e) => setInstanceToken(e.target.value)}
            />
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Credenciais
          </Button>
        </CardContent>
      </Card>

      {/* Ações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ações</CardTitle>
          <CardDescription>Gere o QR Code, verifique ou desconecte</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={handleGenerateQr} disabled={generatingQr || !integration} className="gap-2">
            {generatingQr ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
            Gerar QR Code
          </Button>
          <Button
            onClick={() => testConnection("uazapi")}
            disabled={testing || !integration}
            variant="outline"
            className="gap-2"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
            Verificar Conexão
          </Button>
          {status === "connected" && (
            <Button
              onClick={handleDisconnect}
              disabled={disconnecting}
              variant="destructive"
              className="gap-2"
            >
              {disconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Desconectar
            </Button>
          )}
        </CardContent>
      </Card>

      {/* QR Modal */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Escaneie o QR Code
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            {qrCode && countdown > 0 ? (
              <>
                <div className="rounded-xl border border-border bg-white p-3">
                  <img src={qrCode} alt="QR Code" className="h-60 w-60 object-contain" />
                </div>
                <p className="text-xs text-muted-foreground text-center max-w-[280px]">
                  WhatsApp → Aparelhos conectados → Conectar um aparelho
                </p>
                <Badge variant="secondary" className="gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Expira em {countdown}s
                </Badge>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">QR Code expirado</p>
                <Button onClick={handleGenerateQr} disabled={generatingQr} className="gap-2">
                  {generatingQr ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <QrCode className="h-4 w-4" />
                  )}
                  Gerar Novo QR Code
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
