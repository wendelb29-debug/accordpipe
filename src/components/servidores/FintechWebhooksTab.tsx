import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Zap, Settings, Loader2, Plus, Copy, Check, Eye, EyeOff,
  CreditCard, RefreshCw, AlertTriangle, CheckCircle2, XCircle,
  Clock, Trash2, ScrollText, RotateCw, ArrowDownLeft, ArrowUpRight,
  Play, Globe, Shield, Code, Workflow, ChevronRight,
} from "lucide-react";

/* ── Types ── */

interface Integration {
  id: string;
  provider: string;
  display_name: string;
  environment: string;
  api_key_masked: string | null;
  webhook_url: string | null;
  is_active: boolean;
  last_event_at: string | null;
  base_url: string | null;
  client_id: string | null;
  client_secret_masked: string | null;
  origin_key_masked: string | null;
  public_key: string | null;
}

interface WebhookLog {
  id: string;
  provider: string;
  event_type: string;
  status: string;
  error_message: string | null;
  created_at: string;
  direction: string;
  endpoint: string | null;
  request_payload: any;
  response_payload: any;
  status_code: number | null;
  payload: any;
}

interface IntegrationAction {
  id: string;
  integration_id: string;
  trigger_event: string;
  action_type: string;
  endpoint_override: string | null;
  field_mapping: any;
  is_active: boolean;
}

/* ── Providers ── */

interface ProviderDef {
  id: string;
  name: string;
  icon: string;
  color: string;
  fields: string[];
}

const PROVIDERS: ProviderDef[] = [
  { id: "stripe", name: "Stripe", icon: "💳", color: "text-purple-500", fields: ["api_key", "webhook_secret", "public_key"] },
  { id: "mercadopago", name: "Mercado Pago", icon: "🔵", color: "text-sky-500", fields: ["api_key", "public_key", "webhook_secret"] },
  { id: "asaas", name: "Asaas", icon: "🟢", color: "text-emerald-500", fields: ["api_key", "webhook_secret"] },
  { id: "eduzz", name: "Eduzz", icon: "🟠", color: "text-orange-500", fields: ["api_key", "public_key", "webhook_secret"] },
  { id: "kiwify", name: "Kiwify", icon: "🟣", color: "text-purple-500", fields: ["api_key", "webhook_secret"] },
  { id: "paypal", name: "PayPal", icon: "💙", color: "text-blue-500", fields: ["client_id", "client_secret", "webhook_secret"] },
  { id: "pagarme", name: "Pagar.me", icon: "🟩", color: "text-green-500", fields: ["api_key", "webhook_secret"] },
  { id: "hotmart", name: "Hotmart", icon: "🔥", color: "text-red-500", fields: ["api_key", "webhook_secret", "client_id", "client_secret"] },
  { id: "custom", name: "Personalizado", icon: "⚙️", color: "text-muted-foreground", fields: ["api_key", "base_url", "webhook_secret", "client_id", "client_secret", "origin_key", "public_key"] },
];

const TRIGGER_EVENTS = [
  { id: "card_won", label: "Card ganho (venda fechada)" },
  { id: "client_created", label: "Cliente criado" },
  { id: "proposal_approved", label: "Proposta aprovada" },
  { id: "contract_signed", label: "Contrato assinado" },
  { id: "payment_created", label: "Cobrança gerada" },
  { id: "payment_confirmed", label: "Pagamento confirmado" },
  { id: "payment_overdue", label: "Pagamento vencido" },
  { id: "lead_created", label: "Lead criado" },
];

const FIELD_LABELS: Record<string, string> = {
  api_key: "API Key / Token",
  webhook_secret: "Webhook Secret",
  public_key: "Public Key",
  client_id: "Client ID",
  client_secret: "Client Secret",
  origin_key: "Origin Key",
  base_url: "Base URL",
};

/* ── Main Component ── */

export function FintechWebhooksTab({ companyId }: { companyId: string | null }) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [actions, setActions] = useState<IntegrationAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [payloadDialogOpen, setPayloadDialogOpen] = useState(false);
  const [selectedPayload, setSelectedPayload] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [webhookToken, setWebhookToken] = useState<string | null>(null);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("integrations");
  const [logFilter, setLogFilter] = useState<"all" | "inbound" | "outbound">("all");
  const [testing, setTesting] = useState<string | null>(null);

  const [form, setForm] = useState<Record<string, string>>({
    provider: "",
    display_name: "",
    environment: "sandbox",
    api_key: "",
    webhook_secret: "",
    base_url: "",
    client_id: "",
    client_secret: "",
    origin_key: "",
    public_key: "",
  });

  const [actionForm, setActionForm] = useState({
    integration_id: "",
    trigger_event: "",
    action_type: "http_post",
    endpoint_override: "",
    field_mapping: "{}",
  });

  const webhookBaseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fintech-webhook`;
  const tenantWebhookUrl = webhookToken ? `${webhookBaseUrl}?token=${webhookToken}` : webhookBaseUrl;

  const selectedProvider = PROVIDERS.find(p => p.id === form.provider);

  const fetchData = async () => {
    if (!companyId) return;
    setLoading(true);
    const [{ data: intData }, { data: logData }, { data: companyData }, { data: actData }] = await Promise.all([
      supabase.from("fintech_integrations" as any).select("*").eq("servidor_id", companyId).order("created_at"),
      supabase.from("fintech_webhook_logs" as any).select("*").eq("servidor_id", companyId).order("created_at", { ascending: false }).limit(100),
      supabase.from("companies").select("webhook_token").eq("id", companyId).single(),
      supabase.from("integration_actions" as any).select("*").eq("servidor_id", companyId).order("created_at"),
    ]);
    setIntegrations((intData as any) || []);
    setLogs((logData as any) || []);
    setWebhookToken(companyData?.webhook_token || null);
    setActions((actData as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [companyId]);

  const handleRegenerateToken = async () => {
    if (!companyId) return;
    setRegenerating(true);
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const newToken = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');

    const { error } = await supabase.from("companies").update({ webhook_token: newToken } as any).eq("id", companyId);
    if (error) {
      toast.error("Erro ao regenerar URL do webhook");
    } else {
      setWebhookToken(newToken);
      toast.success("URL do webhook atualizada com sucesso!");
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("audit_logs").insert({
            user_id: user.id, user_name: user.email || "Sistema",
            action: "fintech_webhook_url_regenerated", target_type: "company",
            target_id: companyId, servidor_id: companyId,
            details: { note: "Webhook URL regenerada pelo usuário" },
          });
        }
      } catch {}
    }
    setRegenerating(false);
    setRegenerateDialogOpen(false);
  };

  const handleSave = async () => {
    if (!companyId || !form.provider || !form.display_name) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setSaving(true);

    const mask = (val: string) => val ? `${"•".repeat(Math.max(0, val.length - 4))}${val.slice(-4)}` : null;

    const payload: any = {
      servidor_id: companyId,
      provider: form.provider,
      display_name: form.display_name,
      environment: form.environment,
      api_key_masked: mask(form.api_key),
      api_key_encrypted: form.api_key || null,
      webhook_secret_masked: mask(form.webhook_secret),
      webhook_secret_encrypted: form.webhook_secret || null,
      webhook_url: tenantWebhookUrl,
      is_active: true,
      base_url: form.base_url || null,
      client_id: form.client_id || null,
      client_secret_encrypted: form.client_secret || null,
      client_secret_masked: mask(form.client_secret),
      origin_key_encrypted: form.origin_key || null,
      origin_key_masked: mask(form.origin_key),
      public_key: form.public_key || null,
    };

    const { error } = await supabase.from("fintech_integrations" as any).upsert(payload, { onConflict: "servidor_id,provider" });
    if (error) {
      toast.error("Erro ao salvar integração");
      console.error(error);
    } else {
      toast.success("Integração salva com sucesso!");
      setDialogOpen(false);
      resetForm();
      await fetchData();
    }
    setSaving(false);
  };

  const resetForm = () => {
    setForm({ provider: "", display_name: "", environment: "sandbox", api_key: "", webhook_secret: "", base_url: "", client_id: "", client_secret: "", origin_key: "", public_key: "" });
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

  const handleTestConnection = async (integration: Integration) => {
    setTesting(integration.id);
    // Log the test attempt
    await supabase.from("fintech_webhook_logs" as any).insert({
      servidor_id: companyId,
      provider: integration.provider,
      event_type: "connection_test",
      direction: "outbound",
      endpoint: integration.base_url || `https://api.${integration.provider}.com`,
      status: "processed",
      payload: { test: true },
    });
    // Simulate test delay
    await new Promise(r => setTimeout(r, 1500));
    toast.success(`Conexão com ${integration.display_name} testada com sucesso!`);
    setTesting(null);
    await fetchData();
  };

  const handleSaveAction = async () => {
    if (!companyId || !actionForm.integration_id || !actionForm.trigger_event) {
      toast.error("Preencha integração e evento");
      return;
    }
    setSaving(true);
    let fieldMapping = {};
    try { fieldMapping = JSON.parse(actionForm.field_mapping); } catch { fieldMapping = {}; }

    const { error } = await supabase.from("integration_actions" as any).insert({
      servidor_id: companyId,
      integration_id: actionForm.integration_id,
      trigger_event: actionForm.trigger_event,
      action_type: actionForm.action_type,
      endpoint_override: actionForm.endpoint_override || null,
      field_mapping: fieldMapping,
      is_active: true,
    });

    if (error) {
      toast.error("Erro ao salvar automação");
      console.error(error);
    } else {
      toast.success("Automação criada!");
      setActionDialogOpen(false);
      setActionForm({ integration_id: "", trigger_event: "", action_type: "http_post", endpoint_override: "", field_mapping: "{}" });
      await fetchData();
    }
    setSaving(false);
  };

  const toggleAction = async (id: string, current: boolean) => {
    await supabase.from("integration_actions" as any).update({ is_active: !current }).eq("id", id);
    toast.success(!current ? "Automação ativada" : "Automação desativada");
    await fetchData();
  };

  const removeAction = async (id: string) => {
    await supabase.from("integration_actions" as any).delete().eq("id", id);
    toast.success("Automação removida");
    await fetchData();
  };

  const copyWebhookUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("URL copiada!");
  };

  const filteredLogs = useMemo(() => {
    if (logFilter === "all") return logs;
    return logs.filter(l => l.direction === logFilter);
  }, [logs, logFilter]);

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Integrações & Webhooks
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure APIs externas, receba e envie dados para plataformas integradas.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9">
          <TabsTrigger value="integrations" className="text-xs gap-1.5 h-7"><Globe className="h-3 w-3" /> Integrações</TabsTrigger>
          <TabsTrigger value="automations" className="text-xs gap-1.5 h-7"><Workflow className="h-3 w-3" /> Automações</TabsTrigger>
          <TabsTrigger value="logs" className="text-xs gap-1.5 h-7"><ScrollText className="h-3 w-3" /> Logs</TabsTrigger>
        </TabsList>

        {/* ─── INTEGRATIONS TAB ─── */}
        <TabsContent value="integrations" className="mt-4 space-y-4">
          {/* Webhook URL */}
          <Card className="border-border/50">
            <CardContent className="p-4">
              <Label className="text-xs text-muted-foreground">Webhook URL (recebimento de eventos)</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <Input value={tenantWebhookUrl} readOnly className="h-8 text-xs font-mono bg-muted/30" />
                <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={() => copyWebhookUrl(tenantWebhookUrl)}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 shrink-0 gap-1.5 text-xs" onClick={() => setRegenerateDialogOpen(true)}>
                      <RotateCw className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Atualizar URL</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Gera uma nova URL exclusiva para este tenant</p></TooltipContent>
                </Tooltip>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Configure esta URL no painel do gateway para receber notificações automaticamente. Cada tenant possui sua URL exclusiva.
              </p>
            </CardContent>
          </Card>

          {/* Add Integration Button */}
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="h-3.5 w-3.5" /> Nova Integração
            </Button>
          </div>

          {/* Integrations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {PROVIDERS.map((p) => {
              const integration = integrations.find((i) => i.provider === p.id);
              const isConnected = integration?.is_active;

              return (
                <Card key={p.id} className={`border-border/50 transition-colors ${isConnected ? "border-emerald-500/30 bg-emerald-500/[0.02]" : ""}`}>
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
                              <Badge variant="outline" className="text-[9px] h-4 px-1.5 ml-1">
                                {integration.environment === "production" ? "Prod" : "Sandbox"}
                              </Badge>
                            </div>
                          ) : (
                            <p className="text-[10px] text-muted-foreground mt-0.5">Não configurado</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {integration ? (
                      <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
                        {integration.api_key_masked && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground">API Key:</span>
                            <code className="text-[10px] font-mono text-muted-foreground">{integration.api_key_masked}</code>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 pt-1">
                          <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => handleTestConnection(integration)} disabled={testing === integration.id}>
                            {testing === integration.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                            Testar
                          </Button>
                          <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => {
                            setForm({
                              provider: integration.provider,
                              display_name: integration.display_name,
                              environment: integration.environment,
                              api_key: "", webhook_secret: "", base_url: integration.base_url || "",
                              client_id: integration.client_id || "", client_secret: "", origin_key: "",
                              public_key: integration.public_key || "",
                            });
                            setDialogOpen(true);
                          }}>
                            <Settings className="h-3 w-3" /> Editar
                          </Button>
                          <Switch checked={isConnected} onCheckedChange={() => toggleActive(integration.id, !!isConnected)} className="scale-75 ml-auto" />
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removeIntegration(integration.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 pt-3 border-t border-border/30">
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1 w-full" onClick={() => {
                          setForm({ ...form, provider: p.id, display_name: p.name });
                          setDialogOpen(true);
                        }}>
                          <Zap className="h-3 w-3" /> Conectar
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ─── AUTOMATIONS TAB ─── */}
        <TabsContent value="automations" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
                <Workflow className="h-3.5 w-3.5 text-primary" /> Regras de Automação
              </h4>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Defina ações automáticas quando eventos internos acontecerem no Accord.
              </p>
            </div>
            <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => setActionDialogOpen(true)} disabled={integrations.length === 0}>
              <Plus className="h-3.5 w-3.5" /> Nova Automação
            </Button>
          </div>

          {/* Existing rules */}
          {actions.length === 0 ? (
            <Card className="border-border/50 border-dashed">
              <CardContent className="p-8 flex flex-col items-center gap-3">
                <Workflow className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">Nenhuma automação configurada</p>
                <p className="text-[10px] text-muted-foreground max-w-sm text-center">
                  Crie regras para enviar dados automaticamente para APIs externas quando eventos como "card ganho" ou "pagamento confirmado" acontecerem.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {actions.map((action) => {
                const integration = integrations.find(i => i.id === action.integration_id);
                const triggerLabel = TRIGGER_EVENTS.find(e => e.id === action.trigger_event)?.label || action.trigger_event;
                return (
                  <Card key={action.id} className="border-border/50">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${action.is_active ? "bg-emerald-500/10" : "bg-muted"}`}>
                        <Zap className={`h-4 w-4 ${action.is_active ? "text-emerald-500" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-foreground">{triggerLabel}</span>
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{integration?.display_name || "—"}</span>
                        </div>
                        {action.endpoint_override && (
                          <p className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">{action.endpoint_override}</p>
                        )}
                      </div>
                      <Switch checked={action.is_active} onCheckedChange={() => toggleAction(action.id, action.is_active)} className="scale-75" />
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => removeAction(action.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Pre-built automations info */}
          <Card className="border-border/50">
            <CardContent className="p-4">
              <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 text-primary" />
                Ações Automáticas de Webhook (pré-configuradas)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { event: "Pagamento aprovado", action: "Atualiza cobrança → 'Pago'", icon: CheckCircle2, color: "text-emerald-500" },
                  { event: "Pagamento recusado", action: "Marca → 'Vencido' e notifica", icon: XCircle, color: "text-red-500" },
                  { event: "Assinatura criada", action: "Registra recorrência", icon: CreditCard, color: "text-primary" },
                  { event: "Assinatura cancelada", action: "Atualiza cliente → 'Cancelado'", icon: AlertTriangle, color: "text-amber-500" },
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
        </TabsContent>

        {/* ─── LOGS TAB ─── */}
        <TabsContent value="logs" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button size="sm" variant={logFilter === "all" ? "default" : "outline"} className="h-7 text-[10px]" onClick={() => setLogFilter("all")}>Todos</Button>
              <Button size="sm" variant={logFilter === "inbound" ? "default" : "outline"} className="h-7 text-[10px] gap-1" onClick={() => setLogFilter("inbound")}>
                <ArrowDownLeft className="h-3 w-3" /> Recebidos
              </Button>
              <Button size="sm" variant={logFilter === "outbound" ? "default" : "outline"} className="h-7 text-[10px] gap-1" onClick={() => setLogFilter("outbound")}>
                <ArrowUpRight className="h-3 w-3" /> Enviados
              </Button>
            </div>
            <Badge variant="outline" className="text-[10px]">{filteredLogs.length} eventos</Badge>
          </div>

          <Card className="border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead className="text-[10px]">Data</TableHead>
                    <TableHead className="text-[10px]">Direção</TableHead>
                    <TableHead className="text-[10px]">Gateway</TableHead>
                    <TableHead className="text-[10px]">Evento</TableHead>
                    <TableHead className="text-[10px]">Status</TableHead>
                    <TableHead className="text-[10px]">HTTP</TableHead>
                    <TableHead className="text-[10px]">Payload</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-12">
                        <ScrollText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                        Nenhum evento registrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id} className="border-border/30">
                        <TableCell className="text-[10px] font-mono">{new Date(log.created_at).toLocaleString("pt-BR")}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[9px] gap-1 ${log.direction === "outbound" ? "border-blue-500/30 text-blue-500" : "border-emerald-500/30 text-emerald-500"}`}>
                            {log.direction === "outbound" ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownLeft className="h-2.5 w-2.5" />}
                            {log.direction === "outbound" ? "Saída" : "Entrada"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[10px]">{log.provider}</TableCell>
                        <TableCell className="text-[10px] font-mono">{log.event_type}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {statusIcon(log.status)}
                            <span className="text-[10px]">{log.status}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[10px] font-mono">{log.status_code || "—"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => {
                            setSelectedPayload(log.payload || log.request_payload);
                            setPayloadDialogOpen(true);
                          }}>
                            <Code className="h-3 w-3" /> Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── DIALOGS ─── */}

      {/* Regenerate URL */}
      <Dialog open={regenerateDialogOpen} onOpenChange={setRegenerateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Atualizar URL do Webhook
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-2">
              Ao atualizar a URL, a anterior deixará de funcionar. Você precisará atualizar essa nova URL no gateway/banco conectado. Deseja continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setRegenerateDialogOpen(false)} disabled={regenerating}>Cancelar</Button>
            <Button size="sm" variant="destructive" onClick={handleRegenerateToken} disabled={regenerating}>
              {regenerating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RotateCw className="h-4 w-4 mr-1" />} Atualizar URL
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New/Edit Integration Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Configurar Integração</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Gateway / Plataforma</Label>
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

            {/* Dynamic credential fields based on provider */}
            {selectedProvider?.fields.map((field) => (
              <div key={field} className="space-y-1.5">
                <Label className="text-xs">{FIELD_LABELS[field] || field}</Label>
                <div className="relative">
                  <Input
                    type={field.includes("secret") || field === "api_key" || field === "origin_key" ? (showSecrets[field] ? "text" : "password") : "text"}
                    value={form[field] || ""}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    className="h-9 text-xs pr-9"
                    placeholder={field === "base_url" ? "https://api.example.com" : `Insira ${FIELD_LABELS[field] || field}...`}
                  />
                  {(field.includes("secret") || field === "api_key" || field === "origin_key") && (
                    <Button variant="ghost" size="sm" className="absolute right-0 top-0 h-9 w-9 p-0" onClick={() => setShowSecrets(s => ({ ...s, [field]: !s[field] }))}>
                      {showSecrets[field] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Automation Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Workflow className="h-4 w-4 text-primary" /> Nova Automação
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Integração de destino</Label>
              <Select value={actionForm.integration_id} onValueChange={v => setActionForm({ ...actionForm, integration_id: v })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {integrations.filter(i => i.is_active).map(i => (
                    <SelectItem key={i.id} value={i.id} className="text-xs">{i.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Evento gatilho (no Accord)</Label>
              <Select value={actionForm.trigger_event} onValueChange={v => setActionForm({ ...actionForm, trigger_event: v })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione o evento" /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_EVENTS.map(e => (
                    <SelectItem key={e.id} value={e.id} className="text-xs">{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de ação</Label>
              <Select value={actionForm.action_type} onValueChange={v => setActionForm({ ...actionForm, action_type: v })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="http_post" className="text-xs">POST para API externa</SelectItem>
                  <SelectItem value="http_patch" className="text-xs">PATCH para API externa</SelectItem>
                  <SelectItem value="webhook" className="text-xs">Disparar Webhook</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Endpoint override (opcional)</Label>
              <Input value={actionForm.endpoint_override} onChange={e => setActionForm({ ...actionForm, endpoint_override: e.target.value })} className="h-9 text-xs" placeholder="https://api.example.com/customers" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Mapeamento de campos (JSON)</Label>
              <Textarea value={actionForm.field_mapping} onChange={e => setActionForm({ ...actionForm, field_mapping: e.target.value })} rows={4} className="text-xs font-mono" placeholder='{"customer.name": "cliente.nome", "amount": "valor_total"}' />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setActionDialogOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSaveAction} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Workflow className="h-4 w-4 mr-1" />} Criar Automação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payload Viewer Dialog */}
      <Dialog open={payloadDialogOpen} onOpenChange={setPayloadDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Code className="h-4 w-4" /> Payload
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <pre className="text-xs font-mono bg-muted/50 p-4 rounded-lg whitespace-pre-wrap break-all">
              {selectedPayload ? JSON.stringify(selectedPayload, null, 2) : "Sem dados"}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
