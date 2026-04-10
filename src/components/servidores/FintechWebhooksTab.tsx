import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Zap, Settings, Loader2, Plus, Copy, Check, Eye, EyeOff,
  CreditCard, RefreshCw, AlertTriangle, CheckCircle2, XCircle,
  Clock, Trash2, TestTube, ScrollText,
} from "lucide-react";

interface Integration {
  id: string;
  provider: string;
  display_name: string;
  environment: string;
  api_key_masked: string | null;
  webhook_url: string | null;
  is_active: boolean;
  last_event_at: string | null;
}

interface WebhookLog {
  id: string;
  provider: string;
  event_type: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

const PROVIDERS = [
  { id: "paypal", name: "PayPal", icon: "💳", color: "text-blue-500" },
  { id: "eduzz", name: "Eduzz", icon: "🟢", color: "text-emerald-500" },
  { id: "kiwify", name: "Kiwify", icon: "🟣", color: "text-purple-500" },
  { id: "mercadopago", name: "Mercado Pago", icon: "🔵", color: "text-sky-500" },
  { id: "custom", name: "Personalizado", icon: "⚙️", color: "text-muted-foreground" },
];

export function FintechWebhooksTab({ companyId }: { companyId: string | null }) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    provider: "",
    display_name: "",
    environment: "sandbox",
    api_key: "",
    webhook_secret: "",
  });

  const webhookBaseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fintech-webhook`;

  const fetchData = async () => {
    if (!companyId) return;
    setLoading(true);
    const [{ data: intData }, { data: logData }] = await Promise.all([
      supabase.from("fintech_integrations" as any).select("*").eq("servidor_id", companyId).order("created_at"),
      supabase.from("fintech_webhook_logs" as any).select("*").eq("servidor_id", companyId).order("created_at", { ascending: false }).limit(50),
    ]);
    setIntegrations((intData as any) || []);
    setLogs((logData as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [companyId]);

  const handleSave = async () => {
    if (!companyId || !form.provider || !form.display_name) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setSaving(true);

    const masked = form.api_key ? `${"•".repeat(Math.max(0, form.api_key.length - 4))}${form.api_key.slice(-4)}` : null;
    const secretMasked = form.webhook_secret ? `${"•".repeat(Math.max(0, form.webhook_secret.length - 4))}${form.webhook_secret.slice(-4)}` : null;

    const { error } = await supabase.from("fintech_integrations" as any).upsert({
      servidor_id: companyId,
      provider: form.provider,
      display_name: form.display_name,
      environment: form.environment,
      api_key_masked: masked,
      api_key_encrypted: form.api_key || null,
      webhook_secret_masked: secretMasked,
      webhook_secret_encrypted: form.webhook_secret || null,
      webhook_url: `${webhookBaseUrl}?provider=${form.provider}&tenant=${companyId}`,
      is_active: true,
    }, { onConflict: "servidor_id,provider" });

    if (error) {
      toast.error("Erro ao salvar integração");
      console.error(error);
    } else {
      toast.success("Integração salva com sucesso!");
      setDialogOpen(false);
      setForm({ provider: "", display_name: "", environment: "sandbox", api_key: "", webhook_secret: "" });
      await fetchData();
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("fintech_integrations" as any).update({ is_active: !current }).eq("id", id);
    toast.success(!current ? "Integração ativada" : "Integração desativada");
    await fetchData();
  };

  const removeIntegration = async (id: string) => {
    await supabase.from("fintech_integrations" as any).delete().eq("id", id);
    toast.success("Integração removida");
    await fetchData();
  };

  const copyWebhookUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("URL copiada!");
  };

  const statusIcon = (status: string) => {
    if (status === "processed") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    if (status === "error") return <XCircle className="h-3.5 w-3.5 text-red-500" />;
    return <Clock className="h-3.5 w-3.5 text-amber-500" />;
  };

  if (!companyId) {
    return <p className="text-sm text-muted-foreground">Salve o tenant primeiro para configurar integrações.</p>;
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Webhooks Fintech
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure integrações com gateways de pagamento e receba eventos automaticamente.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => setLogsOpen(true)}>
            <ScrollText className="h-3.5 w-3.5" /> Logs
          </Button>
          <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Nova Integração
          </Button>
        </div>
      </div>

      {/* Webhook receive URL */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <Label className="text-xs text-muted-foreground">Webhook URL (recebimento de eventos)</Label>
          <div className="flex items-center gap-2 mt-1.5">
            <Input
              value={webhookBaseUrl}
              readOnly
              className="h-8 text-xs font-mono bg-muted/30"
            />
            <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={() => copyWebhookUrl(webhookBaseUrl)}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Configure esta URL no painel do gateway para receber notificações de pagamento automaticamente.
          </p>
        </CardContent>
      </Card>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PROVIDERS.map((p) => {
          const integration = integrations.find((i) => i.provider === p.id);
          const isConnected = integration?.is_active;

          return (
            <Card key={p.id} className={`border-border/50 transition-colors ${isConnected ? "border-emerald-500/30" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{p.icon}</div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      {integration ? (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500"}`} />
                          <span className={`text-[10px] ${isConnected ? "text-emerald-500" : "text-red-500"}`}>
                            {isConnected ? "Conectado" : "Desconectado"}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-1">
                            ({integration.environment})
                          </span>
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground mt-0.5">Não configurado</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {integration ? (
                      <>
                        <Switch
                          checked={isConnected}
                          onCheckedChange={() => toggleActive(integration.id, !!isConnected)}
                          className="scale-75"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setForm({
                              provider: integration.provider,
                              display_name: integration.display_name,
                              environment: integration.environment,
                              api_key: "",
                              webhook_secret: "",
                            });
                            setDialogOpen(true);
                          }}
                        >
                          <Settings className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive"
                          onClick={() => removeIntegration(integration.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => {
                          setForm({ ...form, provider: p.id, display_name: p.name });
                          setDialogOpen(true);
                        }}
                      >
                        <Zap className="h-3 w-3" /> Conectar
                      </Button>
                    )}
                  </div>
                </div>

                {integration?.api_key_masked && (
                  <div className="mt-3 pt-3 border-t border-border/30">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">API Key:</span>
                      <code className="text-[10px] font-mono text-muted-foreground">{integration.api_key_masked}</code>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Ações automáticas */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5 text-primary" />
            Ações Automáticas (Webhook)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { event: "Pagamento aprovado", action: "Atualiza cobrança para 'Pago'", icon: CheckCircle2, color: "text-emerald-500" },
              { event: "Pagamento recusado", action: "Marca como 'Vencido' e notifica", icon: XCircle, color: "text-red-500" },
              { event: "Assinatura criada", action: "Registra recorrência no Fintech", icon: CreditCard, color: "text-primary" },
              { event: "Assinatura cancelada", action: "Atualiza cliente como 'Cancelado'", icon: AlertTriangle, color: "text-amber-500" },
            ].map((item) => (
              <div key={item.event} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/30 border border-border/30">
                <item.icon className={`h-4 w-4 mt-0.5 shrink-0 ${item.color}`} />
                <div>
                  <p className="text-xs font-medium text-foreground">{item.event}</p>
                  <p className="text-[10px] text-muted-foreground">{item.action}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* New Integration Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Configurar Integração</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Gateway</Label>
              <Select value={form.provider} onValueChange={(v) => {
                const p = PROVIDERS.find((pr) => pr.id === v);
                setForm({ ...form, provider: v, display_name: p?.name || v });
              }}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">{p.icon} {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Nome de exibição</Label>
              <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} className="h-9 text-xs" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Ambiente</Label>
              <Select value={form.environment} onValueChange={(v) => setForm({ ...form, environment: v })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox" className="text-xs">🧪 Sandbox</SelectItem>
                  <SelectItem value="production" className="text-xs">🚀 Produção</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">API Key / Token</Label>
              <div className="relative">
                <Input
                  type={showSecret ? "text" : "password"}
                  value={form.api_key}
                  onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                  className="h-9 text-xs pr-9"
                  placeholder="sk_live_..."
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-9 w-9 p-0"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Webhook Secret (opcional)</Label>
              <Input
                type="password"
                value={form.webhook_secret}
                onChange={(e) => setForm({ ...form, webhook_secret: e.target.value })}
                className="h-9 text-xs"
                placeholder="whsec_..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logs Dialog */}
      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <ScrollText className="h-4 w-4" /> Logs de Webhooks
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px]">Data</TableHead>
                  <TableHead className="text-[10px]">Gateway</TableHead>
                  <TableHead className="text-[10px]">Evento</TableHead>
                  <TableHead className="text-[10px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-8">
                      Nenhum evento registrado
                    </TableCell>
                  </TableRow>
                ) : logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-xs font-medium">{log.provider}</TableCell>
                    <TableCell className="text-xs">{log.event_type}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {statusIcon(log.status)}
                        <span className="text-[10px]">{log.status}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
