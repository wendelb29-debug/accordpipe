import { useState, useEffect } from "react";
import { Send, LogOut, MessageSquare, Radio, Activity, Wifi, Loader2, Save, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WebhookField {
  key: string;
  label: string;
  icon: React.ReactNode;
  placeholder: string;
}

const webhookFields: WebhookField[] = [
  { key: "zapi_webhook_on_send", label: "Ao enviar", icon: <Send className="h-4 w-4 text-primary" />, placeholder: "Ao enviar" },
  { key: "zapi_webhook_chat_presence", label: "Presença do chat", icon: <Radio className="h-4 w-4 text-primary" />, placeholder: "Presença do chat" },
  { key: "zapi_webhook_on_disconnect", label: "Ao desconectar", icon: <LogOut className="h-4 w-4 text-primary" />, placeholder: "Ao desconectar" },
  { key: "zapi_webhook_message_status", label: "Receber status da mensagem", icon: <Activity className="h-4 w-4 text-primary" />, placeholder: "Receber status da mensagem" },
  { key: "zapi_webhook_on_receive", label: "Ao receber", icon: <MessageSquare className="h-4 w-4 text-primary" />, placeholder: "Ao receber" },
  { key: "zapi_webhook_on_connect", label: "Ao conectar", icon: <Wifi className="h-4 w-4 text-primary" />, placeholder: "Ao conectar" },
];

function isValidUrl(url: string): boolean {
  if (!url) return true;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
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
    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleCopy}>
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
    </Button>
  );
}

export function WebhookConfig({ companyIdOverride }: { companyIdOverride?: string | null } = {}) {
  const { profile } = useAuth();
  const companyId = companyIdOverride ?? profile?.company_id;

  const [values, setValues] = useState<Record<string, string>>({});
  const [notifyMe, setNotifyMe] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const webhookBaseUrl = supabaseUrl ? `${supabaseUrl}/functions/v1/zapi-webhook` : "";

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const { data } = await supabase
        .from("companies")
        .select("zapi_webhook_on_send, zapi_webhook_on_disconnect, zapi_webhook_on_receive, zapi_webhook_chat_presence, zapi_webhook_message_status, zapi_webhook_on_connect, zapi_webhook_notify_me")
        .eq("id", companyId)
        .single();
      if (data) {
        const vals: Record<string, string> = {};
        webhookFields.forEach(f => { vals[f.key] = (data as any)[f.key] || ""; });
        setValues(vals);
        setNotifyMe((data as any).zapi_webhook_notify_me || false);
      }
      setLoading(false);
    })();
  }, [companyId]);

  const handleChange = (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }));
    if (value && !isValidUrl(value)) {
      setErrors(prev => ({ ...prev, [key]: true }));
    } else {
      setErrors(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleSave = async () => {
    const hasErrors = Object.entries(values).some(([key, val]) => val && !isValidUrl(val));
    if (hasErrors) {
      toast.error("Corrija as URLs inválidas antes de salvar.");
      return;
    }
    if (!companyId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("companies")
        .update({
          ...values,
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
              onSend: values.zapi_webhook_on_send || null,
              onDisconnect: values.zapi_webhook_on_disconnect || null,
              onReceive: values.zapi_webhook_on_receive || null,
              chatPresence: values.zapi_webhook_chat_presence || null,
              messageStatus: values.zapi_webhook_message_status || null,
              onConnect: values.zapi_webhook_on_connect || null,
              notifyMe,
            },
          },
        });
      } catch {
        // Z-API sync is best-effort
      }

      toast.success("Configurações de webhooks salvas com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Integration URLs section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">URLs de Integração Z-API</h3>
          <p className="text-sm text-muted-foreground">
            Use estas URLs no painel da Z-API para receber os eventos da sua instância no Accord Stack.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
          {[
            { label: "Webhook URL (principal)", url: webhookBaseUrl },
            { label: "Ao receber mensagem", url: webhookBaseUrl },
            { label: "Ao enviar mensagem", url: webhookBaseUrl },
            { label: "Status da mensagem", url: webhookBaseUrl },
            { label: "Ao conectar", url: webhookBaseUrl },
            { label: "Ao desconectar", url: webhookBaseUrl },
            { label: "Presença do chat", url: webhookBaseUrl },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <Label className="text-xs text-muted-foreground w-44 shrink-0">{item.label}</Label>
              <div className="flex-1 flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
                <code className="text-xs text-foreground truncate flex-1">{item.url}</code>
                <CopyButton value={item.url} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom webhook overrides */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">Configure Webhooks</h3>
        <p className="text-sm text-muted-foreground">
          Opcionalmente, defina URLs personalizadas para encaminhar eventos para outros sistemas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {webhookFields.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">{field.label}</Label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                {field.icon}
              </div>
              <Input
                value={values[field.key] || ""}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className={`pl-10 bg-muted/30 border-border text-foreground placeholder:text-muted-foreground ${
                  errors[field.key] ? "border-destructive focus-visible:ring-destructive" : ""
                }`}
              />
            </div>
            {errors[field.key] && (
              <p className="text-xs text-destructive">URL inválida</p>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Switch checked={notifyMe} onCheckedChange={setNotifyMe} />
        <Label className="text-sm text-foreground cursor-pointer" onClick={() => setNotifyMe(!notifyMe)}>
          Notificar as enviadas por mim também
        </Label>
      </div>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Salvar Configurações
      </Button>
    </div>
  );
}
