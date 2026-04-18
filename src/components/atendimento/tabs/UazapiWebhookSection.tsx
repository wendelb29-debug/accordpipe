import { useEffect, useState } from "react";
import { Loader2, Save, Copy, Check, RefreshCw, Send, Wifi, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenantWhatsAppIntegration } from "@/hooks/useTenantWhatsAppIntegration";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  tenantId: string | null;
}

const DEFAULTS = {
  webhook_enabled: true,
  add_events_in_url: false,
  add_message_types_in_url: false,
  listen_events: "messages",
  exclude_events: "wasSentByApi",
};

export function UazapiWebhookSection({ tenantId }: Props) {
  const { getByProvider, reload } = useTenantWhatsAppIntegration(tenantId);
  const current = getByProvider("uazapi");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const [webhookToken, setWebhookToken] = useState<string | null>(null);

  // Load webhook_token from companies (used to authenticate the webhook)
  useEffect(() => {
    if (!tenantId) {
      setWebhookToken(null);
      return;
    }
    supabase
      .from("companies")
      .select("webhook_token")
      .eq("id", tenantId)
      .maybeSingle()
      .then(({ data }) => setWebhookToken((data as any)?.webhook_token ?? null));
  }, [tenantId]);

  const defaultWebhookUrl =
    tenantId && supabaseUrl && webhookToken
      ? `${supabaseUrl}/functions/v1/whatsapp-webhook?provider=uazapi&token=${webhookToken}`
      : "";

  const [enabled, setEnabled] = useState(DEFAULTS.webhook_enabled);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookUrlFinal, setWebhookUrlFinal] = useState("");
  const [addEvents, setAddEvents] = useState(DEFAULTS.add_events_in_url);
  const [addMsgTypes, setAddMsgTypes] = useState(DEFAULTS.add_message_types_in_url);
  const [listenEvents, setListenEvents] = useState(DEFAULTS.listen_events);
  const [excludeEvents, setExcludeEvents] = useState(DEFAULTS.exclude_events);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (current) {
      const c = current as any;
      setEnabled(c.webhook_enabled ?? DEFAULTS.webhook_enabled);
      setWebhookUrl(c.webhook_url || defaultWebhookUrl);
      setWebhookUrlFinal(c.webhook_url_final || "");
      setAddEvents(c.add_events_in_url ?? DEFAULTS.add_events_in_url);
      setAddMsgTypes(c.add_message_types_in_url ?? DEFAULTS.add_message_types_in_url);
      setListenEvents(c.listen_events ?? DEFAULTS.listen_events);
      setExcludeEvents(c.exclude_events ?? DEFAULTS.exclude_events);
    } else {
      setWebhookUrl(defaultWebhookUrl);
    }
  }, [current, defaultWebhookUrl]);

  const ensureRecord = async () => {
    if (!tenantId) throw new Error("Tenant inválido");
    if (current) return current.id;
    const { data, error } = await supabase
      .from("tenant_whatsapp_integrations" as any)
      .insert({ tenant_id: tenantId, provider_type: "uazapi" })
      .select()
      .single();
    if (error) throw error;
    return (data as any).id;
  };

  const handleSave = async (publish = false) => {
    if (!tenantId) {
      toast.error("Selecione um tenant");
      return;
    }
    setSaving(true);
    try {
      const id = await ensureRecord();
      const payload: any = {
        webhook_enabled: enabled,
        webhook_url: webhookUrl.trim() || null,
        webhook_url_final: publish ? webhookUrl.trim() : webhookUrlFinal,
        add_events_in_url: addEvents,
        add_message_types_in_url: addMsgTypes,
        listen_events: listenEvents.trim() || DEFAULTS.listen_events,
        exclude_events: excludeEvents.trim(),
        publish_status: publish ? "publicado" : "pendente",
      };
      const { error } = await supabase
        .from("tenant_whatsapp_integrations" as any)
        .update(payload)
        .eq("id", id);
      if (error) throw error;
      toast.success(publish ? "Webhook publicado!" : "Configuração salva!");
      await reload();
    } catch (err: any) {
      toast.error("Erro: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!webhookUrl.trim()) {
      toast.error("Defina a URL do webhook antes de testar");
      return;
    }
    if (!tenantId) return;
    setTesting(true);
    try {
      const id = await ensureRecord();
      let status = "sucesso";
      let ok = true;
      try {
        const res = await fetch(webhookUrl.trim(), { method: "HEAD" });
        ok = res.ok || res.status === 405; // some webhooks reject HEAD
        status = ok ? "sucesso" : `falha_${res.status}`;
      } catch {
        ok = false;
        status = "falha_rede";
      }
      await supabase
        .from("tenant_whatsapp_integrations" as any)
        .update({
          last_webhook_test_at: new Date().toISOString(),
          last_webhook_test_status: status,
        })
        .eq("id", id);
      ok ? toast.success("Webhook respondeu com sucesso") : toast.error("Webhook não respondeu corretamente");
      await reload();
    } catch (err: any) {
      toast.error("Erro no teste: " + (err.message || ""));
    } finally {
      setTesting(false);
    }
  };

  const handleRestoreDefaults = () => {
    setEnabled(DEFAULTS.webhook_enabled);
    setAddEvents(DEFAULTS.add_events_in_url);
    setAddMsgTypes(DEFAULTS.add_message_types_in_url);
    setListenEvents(DEFAULTS.listen_events);
    setExcludeEvents(DEFAULTS.exclude_events);
    setWebhookUrl(defaultWebhookUrl);
    toast.success("Padrões restaurados (lembre de salvar)");
  };

  const handleCopy = () => {
    if (!webhookUrl) return;
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success("URL copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  const publishStatus = (current as any)?.publish_status as string | undefined;
  const lastTest = (current as any)?.last_webhook_test_at as string | undefined;
  const lastTestStatus = (current as any)?.last_webhook_test_status as string | undefined;

  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-primary">
              Webhook Uazapi — Configuração por Tenant
            </CardTitle>
            <CardDescription className="mt-1">
              Configure a URL e os eventos exigidos pela Uazapi para esta instância. Cada configuração é exclusiva deste tenant.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {publishStatus === "publicado" && (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Publicado</Badge>
            )}
            {publishStatus === "pendente" && <Badge variant="outline">Pendente</Badge>}
            {lastTestStatus === "sucesso" && (
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-600">Teste OK</Badge>
            )}
            {lastTestStatus && lastTestStatus !== "sucesso" && (
              <Badge variant="outline" className="border-destructive/40 text-destructive">Teste falhou</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bloco 1 — Publicação */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <Label className="cursor-pointer" onClick={() => setEnabled(!enabled)}>
              Webhook habilitado
            </Label>
          </div>

          <div className="space-y-1.5">
            <Label>URL do Webhook</Label>
            <div className="flex gap-2">
              <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={handleCopy} title="Copiar">
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>URL final publicada</Label>
            <Input value={webhookUrlFinal || "—"} readOnly className="font-mono text-xs bg-muted/40" />
          </div>
        </div>

        {/* Bloco 2 — Opções */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/40">
          <div className="flex items-center gap-3 pt-3">
            <Switch checked={addEvents} onCheckedChange={setAddEvents} />
            <Label className="cursor-pointer text-sm" onClick={() => setAddEvents(!addEvents)}>
              Adicionar eventos na URL
            </Label>
          </div>
          <div className="flex items-center gap-3 pt-3">
            <Switch checked={addMsgTypes} onCheckedChange={setAddMsgTypes} />
            <Label className="cursor-pointer text-sm" onClick={() => setAddMsgTypes(!addMsgTypes)}>
              Adicionar tipos de mensagem na URL
            </Label>
          </div>
        </div>

        {/* Bloco 3 — Eventos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/40">
          <div className="space-y-1.5 pt-3">
            <Label>Escutar eventos</Label>
            <Input
              value={listenEvents}
              onChange={(e) => setListenEvents(e.target.value)}
              placeholder="messages"
            />
            <p className="text-[11px] text-muted-foreground">Separe múltiplos por vírgula. Padrão: messages</p>
          </div>
          <div className="space-y-1.5 pt-3">
            <Label>Excluir eventos escutados</Label>
            <Input
              value={excludeEvents}
              onChange={(e) => setExcludeEvents(e.target.value)}
              placeholder="wasSentByApi"
            />
            <p className="text-[11px] text-muted-foreground">Ex.: wasSentByApi, isGroupYes</p>
          </div>
        </div>

        {lastTest && (
          <div className="text-xs text-muted-foreground">
            Último teste {formatDistanceToNow(new Date(lastTest), { addSuffix: true, locale: ptBR })}
            {lastTestStatus && <> — {lastTestStatus}</>}
          </div>
        )}

        {/* Ações */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
          <Button onClick={() => handleSave(true)} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Publicar
          </Button>
          <Button onClick={() => handleSave(false)} disabled={saving} variant="secondary" className="gap-2">
            <Save className="h-4 w-4" /> Salvar configuração
          </Button>
          <Button onClick={handleTest} disabled={testing} variant="outline" className="gap-2">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
            Testar webhook
          </Button>
          <Button onClick={handleRestoreDefaults} variant="ghost" className="gap-2">
            <RotateCcw className="h-4 w-4" /> Restaurar padrão
          </Button>
          <Button onClick={handleCopy} variant="ghost" className="gap-2" disabled={!webhookUrl}>
            <Copy className="h-4 w-4" /> Copiar URL
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
