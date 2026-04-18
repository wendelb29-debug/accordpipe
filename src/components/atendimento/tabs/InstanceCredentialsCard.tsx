import { useEffect, useState } from "react";
import { Eye, EyeOff, Copy, Check, Loader2, Save, Wifi, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useTenantWhatsAppIntegration, WhatsAppProvider } from "@/hooks/useTenantWhatsAppIntegration";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  tenantId: string | null;
  provider?: WhatsAppProvider;
  onProviderChange?: (p: WhatsAppProvider) => void;
}

export function InstanceCredentialsCard({ tenantId, provider: providerProp, onProviderChange }: Props) {
  const {
    integrations,
    loading,
    saving,
    testing,
    getByProvider,
    save,
    setActive,
    testConnection,
    clearCredentials,
  } = useTenantWhatsAppIntegration(tenantId);

  const [providerState, setProviderState] = useState<WhatsAppProvider>("zapi");
  const provider = providerProp ?? providerState;
  const setProvider = (p: WhatsAppProvider) => {
    setProviderState(p);
    onProviderChange?.(p);
  };
  const [serverUrl, setServerUrl] = useState("");
  const [instanceToken, setInstanceToken] = useState("");
  const [instanceName, setInstanceName] = useState("");
  const [instanceId, setInstanceId] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);

  const current = getByProvider(provider);

  useEffect(() => {
    if (current) {
      setServerUrl(current.server_url || "");
      setInstanceToken(current.instance_token || "");
      setInstanceName(current.instance_name || "");
      setInstanceId(current.instance_id || "");
    } else {
      setServerUrl("");
      setInstanceToken("");
      setInstanceName("");
      setInstanceId("");
    }
    setShowToken(false);
  }, [current, provider]);

  // initial provider = active one
  useEffect(() => {
    const active = integrations.find((i) => i.is_active);
    if (active) setProvider(active.provider_type);
  }, [integrations.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const validateUrl = (url: string) => {
    if (!url) return true;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    if (!serverUrl.trim()) {
      toast.error("Informe a Server URL");
      return;
    }
    if (!validateUrl(serverUrl.trim())) {
      toast.error("Server URL inválida");
      return;
    }
    if (!instanceToken.trim()) {
      toast.error("Informe o Instance Token");
      return;
    }
    await save(provider, {
      server_url: serverUrl,
      instance_token: instanceToken,
      instance_name: instanceName,
      instance_id: instanceId,
    });
  };

  const handleTest = async () => {
    if (!current) {
      toast.error("Salve as credenciais antes de testar");
      return;
    }
    await testConnection(provider);
  };

  const handleClear = async () => {
    if (!confirm("Remover credenciais deste provider?")) return;
    await clearCredentials(provider);
  };

  const handleCopy = () => {
    if (!instanceToken) return;
    navigator.clipboard.writeText(instanceToken);
    setCopied(true);
    toast.success("Token copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSetActive = async () => {
    if (!current) return;
    await setActive(provider);
    toast.success(`${provider === "zapi" ? "Z-API" : "Uazapi"} definido como ativo`);
  };

  if (!tenantId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Selecione um tenant para configurar credenciais.
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const status = current?.last_test_status;
  const isActive = current?.is_active;

  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-base">Credenciais da Instância</CardTitle>
            <CardDescription className="mt-1">
              Configure os dados da instância do provider selecionado para permitir envio,
              leitura de status e recebimento de eventos.
            </CardDescription>
          </div>
          {current && (
            <div className="flex items-center gap-2">
              {isActive && <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Ativo</Badge>}
              {status === "success" && (
                <Badge variant="outline" className="gap-1 border-emerald-500/30 text-emerald-600">
                  <CheckCircle2 className="h-3 w-3" /> Conectado
                </Badge>
              )}
              {status === "error" && (
                <Badge variant="outline" className="gap-1 border-destructive/40 text-destructive">
                  <AlertCircle className="h-3 w-3" /> Falha
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <Tabs value={provider} onValueChange={(v) => setProvider(v as WhatsAppProvider)}>
          <TabsList className="grid w-full max-w-sm grid-cols-2">
            <TabsTrigger value="zapi">Z-API</TabsTrigger>
            <TabsTrigger value="uazapi">Uazapi</TabsTrigger>
          </TabsList>

          {(["zapi", "uazapi"] as const).map((p) => (
            <TabsContent key={p} value={p} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Server URL *</Label>
                  <Input
                    placeholder={p === "zapi" ? "https://api.z-api.io" : "https://free.uazapi.com"}
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label>Instance Token *</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showToken ? "text" : "password"}
                        placeholder="Cole aqui o token da instância"
                        value={instanceToken}
                        onChange={(e) => setInstanceToken(e.target.value)}
                        className="pr-20"
                      />
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setShowToken((s) => !s)}
                          title={showToken ? "Ocultar" : "Mostrar"}
                        >
                          {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={handleCopy}
                          disabled={!instanceToken}
                          title="Copiar"
                        >
                          {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Nome da Instância</Label>
                  <Input
                    placeholder="ex: vendas-principal"
                    value={instanceName}
                    onChange={(e) => setInstanceName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Instance ID / Session ID</Label>
                  <Input
                    placeholder="opcional"
                    value={instanceId}
                    onChange={(e) => setInstanceId(e.target.value)}
                  />
                </div>
              </div>

              {current?.last_tested_at && (
                <div className="text-xs text-muted-foreground">
                  Último teste {formatDistanceToNow(new Date(current.last_tested_at), { addSuffix: true, locale: ptBR })}
                  {current.last_test_message && <> — {current.last_test_message}</>}
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar Credenciais
                </Button>
                <Button onClick={handleTest} disabled={testing || !current} variant="outline" className="gap-2">
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                  Testar Conexão
                </Button>
                {current && !isActive && (
                  <Button onClick={handleSetActive} variant="secondary">
                    Definir como ativo
                  </Button>
                )}
                {current && (
                  <Button onClick={handleClear} variant="ghost" className="gap-2 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                    Limpar
                  </Button>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
