import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2, Copy, Check, Shield, Zap, CheckCircle2, XCircle,
  Clock, RefreshCw, Eye, EyeOff, AlertTriangle, CreditCard,
  QrCode, FileText, Webhook, Wallet,
} from "lucide-react";

interface Props {
  companyId: string;
}

interface AsaasIntegration {
  id: string;
  tenant_id: string;
  provider: string;
  environment: string;
  api_key_masked: string | null;
  webhook_url: string | null;
  webhook_auth_token: string | null;
  webhook_remote_id: string | null;
  webhook_enabled: boolean;
  connection_status: string;
  last_connection_check_at: string | null;
  last_connection_error: string | null;
  last_webhook_event: string | null;
  last_webhook_received_at: string | null;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  connected: { label: "Conectado", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", icon: CheckCircle2 },
  disconnected: { label: "Desconectado", color: "bg-muted text-muted-foreground border-border", icon: XCircle },
  error: { label: "Erro", color: "bg-destructive/10 text-destructive border-destructive/30", icon: AlertTriangle },
};

export function AsaasIntegrationTab({ companyId }: Props) {
  const [integration, setIntegration] = useState<AsaasIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [environment, setEnvironment] = useState<string>("sandbox");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [creatingWebhook, setCreatingWebhook] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  const fetchIntegration = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("tenant_fintech_integrations")
        .select("*")
        .eq("tenant_id", companyId)
        .eq("provider", "asaas")
        .maybeSingle();
      setIntegration(data as any);
      if (data) {
        setEnvironment((data as any).environment || "sandbox");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchIntegration(); }, [fetchIntegration]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveCredentials = async () => {
    if (!apiKey.trim()) { toast.error("Informe a API Key do Asaas."); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("asaas-api", {
        body: { action: "save_credentials", tenant_id: companyId, api_key: apiKey, environment },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Credenciais salvas com sucesso!");
      setApiKey("");
      await fetchIntegration();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("asaas-api", {
        body: { action: "test_connection", tenant_id: companyId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data?.status === "connected" ? "Conexão estabelecida!" : "Teste concluído.");
      await fetchIntegration();
    } catch (err: any) {
      toast.error("Erro no teste: " + err.message);
      await fetchIntegration();
    } finally {
      setTesting(false);
    }
  };

  const handleCreateWebhook = async () => {
    setCreatingWebhook(true);
    try {
      const { data, error } = await supabase.functions.invoke("asaas-api", {
        body: { action: "create_webhook", tenant_id: companyId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Webhook criado no Asaas!");
      await fetchIntegration();
    } catch (err: any) {
      toast.error("Erro ao criar webhook: " + err.message);
    } finally {
      setCreatingWebhook(false);
    }
  };

  const handleGenerateToken = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("asaas-api", {
        body: { action: "generate_webhook_token", tenant_id: companyId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Token do webhook gerado!");
      await fetchIntegration();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const handleDisable = async () => {
    try {
      const { error } = await supabase
        .from("tenant_fintech_integrations")
        .update({ connection_status: "disconnected", webhook_enabled: false } as any)
        .eq("tenant_id", companyId)
        .eq("provider", "asaas");
      if (error) throw error;
      toast.success("Integração desativada.");
      await fetchIntegration();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const status = STATUS_MAP[integration?.connection_status || "disconnected"] || STATUS_MAP.disconnected;
  const StatusIcon = status.icon;
  const webhookUrl = integration?.webhook_url || `${window.location.origin.replace('localhost', 'SEU_DOMINIO')}/functions/v1/asaas-webhook?tenant=${companyId}`;

  return (
    <div className="space-y-6">
      {/* Card 1 — Status */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-lg">🟢</div>
              <div>
                <CardTitle className="text-base">Asaas</CardTitle>
                <CardDescription className="text-xs">Gateway de pagamentos</CardDescription>
              </div>
            </div>
            <Badge className={`${status.color} gap-1.5`}>
              <StatusIcon className="h-3.5 w-3.5" />
              {status.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <p className="text-muted-foreground">Ambiente</p>
              <p className="font-medium capitalize">{integration?.environment || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Última validação</p>
              <p className="font-medium">{integration?.last_connection_check_at ? new Date(integration.last_connection_check_at).toLocaleString("pt-BR") : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Webhook</p>
              <p className="font-medium">{integration?.webhook_enabled ? "Ativo" : "Inativo"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Último evento</p>
              <p className="font-medium">{integration?.last_webhook_received_at ? new Date(integration.last_webhook_received_at).toLocaleString("pt-BR") : "—"}</p>
            </div>
          </div>
          {integration?.last_connection_error && (
            <div className="mt-3 p-2.5 rounded-lg bg-destructive/5 border border-destructive/20 text-xs text-destructive flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              {integration.last_connection_error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 2 — Credenciais */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Credenciais</CardTitle>
          <CardDescription className="text-xs">Salve sua API Key do Asaas de forma segura.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Ambiente</Label>
              <Select value={environment} onValueChange={setEnvironment}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox (teste)</SelectItem>
                  <SelectItem value="production">Produção</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={integration?.api_key_masked || "Cole sua API Key aqui"}
                    className="pr-8"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {integration?.api_key_masked && (
                <p className="text-[10px] text-muted-foreground">Chave atual: <span className="font-mono">{integration.api_key_masked}</span></p>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={handleSaveCredentials} disabled={saving || !apiKey.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Salvar Credenciais
            </Button>
            <Button size="sm" variant="outline" onClick={handleTestConnection} disabled={testing || !integration?.api_key_masked}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Testar Conexão
            </Button>
            {integration && (
              <Button size="sm" variant="ghost" className="text-destructive" onClick={handleDisable}>
                Desativar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card 3 — Webhook */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Webhook className="h-4 w-4 text-primary" /> Webhook</CardTitle>
          <CardDescription className="text-xs">Configure o recebimento automático de eventos de pagamento.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">URL do Webhook</Label>
              <div className="flex gap-2">
                <Input value={webhookUrl} readOnly className="font-mono text-xs bg-muted/50" />
                <Button size="icon" variant="outline" className="shrink-0" onClick={() => copyToClipboard(webhookUrl, "url")}>
                  {copiedField === "url" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Token de Autenticação</Label>
              <div className="flex gap-2">
                <Input value={integration?.webhook_auth_token || "—"} readOnly className="font-mono text-xs bg-muted/50" />
                <Button size="icon" variant="outline" className="shrink-0" onClick={() => integration?.webhook_auth_token && copyToClipboard(integration.webhook_auth_token, "token")}>
                  {copiedField === "token" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-muted-foreground">Webhook cadastrado no Asaas</p>
              <p className="font-medium">{integration?.webhook_enabled ? "Sim ✅" : "Não"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Último evento recebido</p>
              <p className="font-medium">{integration?.last_webhook_event || "—"}</p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={handleGenerateToken}>
              <Zap className="h-4 w-4 mr-1" /> Gerar Token
            </Button>
            <Button size="sm" variant="outline" onClick={handleCreateWebhook} disabled={creatingWebhook || !integration?.api_key_masked}>
              {creatingWebhook ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Webhook className="h-4 w-4 mr-1" />}
              {integration?.webhook_remote_id ? "Atualizar Webhook" : "Criar Webhook no Asaas"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Card 4 — Recursos */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> Recursos Disponíveis</CardTitle>
          <CardDescription className="text-xs">Funcionalidades habilitadas nesta integração.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1.5 py-1.5 px-3"><FileText className="h-3.5 w-3.5" /> Geração de boleto</Badge>
            <Badge variant="outline" className="gap-1.5 py-1.5 px-3"><CreditCard className="h-3.5 w-3.5" /> Consulta de cobrança</Badge>
            <Badge variant="outline" className="gap-1.5 py-1.5 px-3"><QrCode className="h-3.5 w-3.5" /> Linha digitável</Badge>
            <Badge variant="outline" className="gap-1.5 py-1.5 px-3"><Webhook className="h-3.5 w-3.5" /> Webhook de pagamento</Badge>
            <Badge variant="outline" className="gap-1.5 py-1.5 px-3"><Wallet className="h-3.5 w-3.5" /> Carteira de recebimentos</Badge>
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">PIX e recorrência estarão disponíveis em versões futuras.</p>
        </CardContent>
      </Card>
    </div>
  );
}
