import { useState, useEffect, useCallback, useMemo } from "react";
import { Send, LogOut, MessageSquare, Radio, Activity, Wifi, Loader2, Save, Copy, Check, RefreshCw } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenantWhatsAppIntegration, type WhatsAppProvider } from "@/hooks/useTenantWhatsAppIntegration";
import { WhatsAppPillNav, type WhatsAppPill } from "./whatsapp/WhatsAppPillNav";
import { InstanceListTab } from "./whatsapp/InstanceListTab";
import { InstanceDetailTab } from "./whatsapp/InstanceDetailTab";
import { TemplatesTab, type WhatsAppTemplate } from "./whatsapp/TemplatesTab";
import { CreateTemplateTab } from "./whatsapp/CreateTemplateTab";
import { UazapiInstancePanel } from "./whatsapp/UazapiInstancePanel";
import { WhatsAppProfileSection } from "./whatsapp/WhatsAppProfileSection";
import { UazapiWebhookSection } from "./UazapiWebhookSection";
import { UazapiDiagnostics } from "./UazapiDiagnostics";

interface WebhookFieldDef {
  key: string;
  eventType: string;
  label: string;
  icon: React.ReactNode;
}

const webhookFields: WebhookFieldDef[] = [
  { key: "zapi_webhook_on_send", eventType: "on-send", label: "Ao enviar", icon: <Send className="h-4 w-4 text-primary" /> },
  { key: "zapi_webhook_chat_presence", eventType: "chat-presence", label: "Presença do chat", icon: <Radio className="h-4 w-4 text-primary" /> },
  { key: "zapi_webhook_on_disconnect", eventType: "on-disconnect", label: "Ao desconectar", icon: <LogOut className="h-4 w-4 text-primary" /> },
  { key: "zapi_webhook_message_status", eventType: "message-status", label: "Receber status da mensagem", icon: <Activity className="h-4 w-4 text-primary" /> },
  { key: "zapi_webhook_on_receive", eventType: "on-receive", label: "Ao receber", icon: <MessageSquare className="h-4 w-4 text-primary" /> },
  { key: "zapi_webhook_on_connect", eventType: "on-connect", label: "Ao conectar", icon: <Wifi className="h-4 w-4 text-primary" /> },
];

function generateHash(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("URL copiada!");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleCopy} title="Copiar URL">
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
    </Button>
  );
}

function buildUrl(baseUrl: string, companyId: string, eventType: string, hash: string): string {
  return `${baseUrl}/functions/v1/zapi-webhook/${companyId}/${eventType}/${hash}`;
}

/** Legacy Z-API URL-per-event UI, preserved 100%. Kept as a sub-panel inside the new layout. */
function ZapiEventUrlsPanel({ companyId }: { companyId: string | null }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [notifyMe, setNotifyMe] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const initializeUrls = useCallback(() => {
    if (!supabaseUrl || !companyId) return {};
    const newUrls: Record<string, string> = {};
    webhookFields.forEach((f) => {
      newUrls[f.key] = buildUrl(supabaseUrl, companyId, f.eventType, generateHash());
    });
    return newUrls;
  }, [supabaseUrl, companyId]);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const { data } = await supabase.rpc("get_company_webhook_config" as any, { _company_id: companyId });
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        const vals: Record<string, string> = {};
        let hasAnyUrl = false;
        webhookFields.forEach((f) => {
          const stored = (row as any)[f.key];
          if (stored) {
            vals[f.key] = stored;
            hasAnyUrl = true;
          }
        });
        if (hasAnyUrl) {
          webhookFields.forEach((f) => {
            if (!vals[f.key] && supabaseUrl) {
              vals[f.key] = buildUrl(supabaseUrl, companyId, f.eventType, generateHash());
            }
          });
          setUrls(vals);
        } else {
          setUrls(initializeUrls());
        }
        setNotifyMe((row as any).zapi_webhook_notify_me || false);
      } else {
        setUrls(initializeUrls());
      }
      setLoading(false);
    })();
  }, [companyId, supabaseUrl, initializeUrls]);

  const refreshUrl = (key: string) => {
    const field = webhookFields.find((f) => f.key === key);
    if (!field || !supabaseUrl || !companyId) return;
    setUrls((prev) => ({
      ...prev,
      [key]: buildUrl(supabaseUrl, companyId, field.eventType, generateHash()),
    }));
    toast.success("URL atualizada!");
  };

  const refreshAllUrls = () => {
    setUrls(initializeUrls());
    toast.success("Todas as URLs foram atualizadas!");
  };

  const handleSave = async () => {
    if (!companyId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("companies")
        .update({
          ...urls,
          zapi_webhook_notify_me: notifyMe,
        } as any)
        .eq("id", companyId);
      if (error) throw error;

      try {
        await supabase.functions.invoke("zapi", {
          body: {
            action: "update-webhooks",
            company_id: companyId,
            webhooks: {
              onSend: urls.zapi_webhook_on_send || null,
              onDisconnect: urls.zapi_webhook_on_disconnect || null,
              onReceive: urls.zapi_webhook_on_receive || null,
              chatPresence: urls.zapi_webhook_chat_presence || null,
              messageStatus: urls.zapi_webhook_message_status || null,
              onConnect: urls.zapi_webhook_on_connect || null,
              notifyMe,
            },
          },
        });
      } catch {
        /* best-effort */
      }
      toast.success("Configurações de webhooks salvas!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
            URLs Z-API por evento
          </h4>
          <p className="text-xs text-muted-foreground">
            Cada URL é exclusiva deste tenant. Cole no painel da Z-API.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={refreshAllUrls}>
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar todas
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {webhookFields.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">{field.label}</Label>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 px-3 py-2">
              <div className="shrink-0">{field.icon}</div>
              <code className="text-xs text-foreground truncate flex-1 ml-2">
                {urls[field.key] || field.label}
              </code>
              <CopyButton value={urls[field.key] || ""} />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => refreshUrl(field.key)}
                title="Gerar nova URL"
              >
                <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Switch checked={notifyMe} onCheckedChange={setNotifyMe} />
        <Label className="text-sm text-foreground cursor-pointer" onClick={() => setNotifyMe(!notifyMe)}>
          Notificar as enviadas por mim também
        </Label>
      </div>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Salvar
      </Button>
    </div>
  );
}

export function WebhookConfig({ companyIdOverride }: { companyIdOverride?: string | null } = {}) {
  const activeCompany = useActiveCompanyId();
  const companyId = companyIdOverride ?? activeCompany;

  const [pill, setPill] = useState<WhatsAppPill>("list");
  const [activeProvider, setActiveProvider] = useState<WhatsAppProvider>("zapi");
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [tplRefresh, setTplRefresh] = useState(0);

  const { integrations, loading, getByProvider } = useTenantWhatsAppIntegration(companyId);
  const currentIntegration = getByProvider(activeProvider);
  const channelName = useMemo(() => {
    const meta = (currentIntegration?.provider_metadata || {}) as any;
    return meta.display_name || currentIntegration?.instance_name || null;
  }, [currentIntegration]);

  return (
    <div className="space-y-6">
      <WhatsAppPillNav active={pill} onChange={setPill} channelName={channelName} />

      {pill === "list" && (
        <InstanceListTab
          integrations={integrations}
          loading={loading}
          onOpenInstance={() => setPill("instance")}
          onAddNew={() => setPill("instance")}
        />
      )}

      {pill === "instance" && (
        <InstanceDetailTab
          tenantId={companyId}
          companyId={companyId}
          provider={activeProvider}
          onProviderChange={setActiveProvider}
          legacyZapiWebhookConfig={<ZapiEventUrlsPanel companyId={companyId} />}
        />
      )}

      {pill === "templates" && (
        <TemplatesTab
          refreshKey={tplRefresh}
          onCreate={() => { setEditingTemplate(null); setPill("create-template"); }}
          onEdit={(t) => { setEditingTemplate(t); setPill("create-template"); }}
        />
      )}

      {pill === "uazapi" && (
        <div className="space-y-6">
          <UazapiInstancePanel tenantId={companyId} />
          <WhatsAppProfileSection tenantId={companyId} />
          <UazapiWebhookSection tenantId={companyId} />
          <UazapiDiagnostics tenantId={companyId} />
        </div>
      )}

      {pill === "create-template" && (
        <CreateTemplateTab
          editing={editingTemplate}
          onPublished={() => {
            setEditingTemplate(null);
            setTplRefresh((n) => n + 1);
            setPill("templates");
          }}
        />
      )}
    </div>
  );
}
