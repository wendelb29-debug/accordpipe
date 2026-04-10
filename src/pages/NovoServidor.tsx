import { useState } from "react";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import {
  Building2, Palette, FileSignature, Search, Loader2, Save, Webhook,
  Send, LogOut, MessageSquare, Radio, Activity, Wifi, Copy, Check, RefreshCw, LayoutGrid,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast as sonnerToast } from "sonner";
import { BrandIdentityFields } from "@/components/empresas/BrandIdentityFields";
import { ContractTemplateTab } from "@/components/servidores/ContractTemplateTab";
import { WebhookConfig } from "@/components/atendimento/tabs/WebhookConfig";
import { WorkspacesTab } from "@/components/servidores/WorkspacesTab";
import { FintechWebhooksTab } from "@/components/servidores/FintechWebhooksTab";
import { useEffect } from "react";

const cleanDigits = (v: string) => v.replace(/\D/g, "");

const formatCnpj = (v: string) => {
  const d = cleanDigits(v).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

const formatCep = (v: string) => {
  const d = cleanDigits(v).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
};

const formatPhone = (v: string) => {
  const d = cleanDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const defaultBrand = {
  brandLogoUrl: "", brandLogoPath: "",
  brandPrimaryColor: "#1E2952", brandSecondaryColor: "#4F46E5",
  brandAccentColor: "#10B981", brandBgColor: "#F3F4F6", brandTextColor: "#1F2937",
  docPrimaryColor: "#1E2952", docSecondaryColor: "#4F46E5",
  docAccentColor: "#10B981", docBgColor: "#F3F4F6", docTextColor: "#1F2937",
};

const previewWebhookFields = [
  { key: "zapi_webhook_on_send", eventType: "on-send", label: "Ao enviar", icon: <Send className="h-4 w-4 text-primary" /> },
  { key: "zapi_webhook_chat_presence", eventType: "chat-presence", label: "Presença do chat", icon: <Radio className="h-4 w-4 text-primary" /> },
  { key: "zapi_webhook_on_disconnect", eventType: "on-disconnect", label: "Ao desconectar", icon: <LogOut className="h-4 w-4 text-primary" /> },
  { key: "zapi_webhook_message_status", eventType: "message-status", label: "Receber status da mensagem", icon: <Activity className="h-4 w-4 text-primary" /> },
  { key: "zapi_webhook_on_receive", eventType: "on-receive", label: "Ao receber", icon: <MessageSquare className="h-4 w-4 text-primary" /> },
  { key: "zapi_webhook_on_connect", eventType: "on-connect", label: "Ao conectar", icon: <Wifi className="h-4 w-4 text-primary" /> },
];

const genHash = () => Array.from(crypto.getRandomValues(new Uint8Array(8))).map((b) => b.toString(16).padStart(2, "0")).join("");

function WebhookConfigPreview({
  urls, setUrls, notifyMe, setNotifyMe,
}: {
  urls: Record<string, string>;
  setUrls: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  notifyMe: boolean;
  setNotifyMe: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const tempId = "TENANT_ID";

  useEffect(() => {
    if (Object.keys(urls).length === 0 && supabaseUrl) {
      const initial: Record<string, string> = {};
      previewWebhookFields.forEach((f) => {
        initial[f.key] = `${supabaseUrl}/functions/v1/zapi-webhook/${tempId}/${f.eventType}/${genHash()}`;
      });
      setUrls(initial);
    }
  }, []);

  const refreshUrl = (key: string) => {
    const field = previewWebhookFields.find((f) => f.key === key);
    if (!field || !supabaseUrl) return;
    setUrls((prev) => ({
      ...prev,
      [key]: `${supabaseUrl}/functions/v1/zapi-webhook/${tempId}/${field.eventType}/${genHash()}`,
    }));
    sonnerToast.success("URL atualizada!");
  };

  const refreshAll = () => {
    if (!supabaseUrl) return;
    const newUrls: Record<string, string> = {};
    previewWebhookFields.forEach((f) => {
      newUrls[f.key] = `${supabaseUrl}/functions/v1/zapi-webhook/${tempId}/${f.eventType}/${genHash()}`;
    });
    setUrls(newUrls);
    sonnerToast.success("Todas as URLs foram atualizadas!");
  };

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const handleCopy = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    sonnerToast.success("URL copiada!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
            Webhooks Z-API — Pré-configuração
          </h3>
          <p className="text-sm text-muted-foreground">
            As URLs serão geradas com o ID real ao criar o tenant.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={refreshAll}>
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar Todas
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {previewWebhookFields.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">{field.label}</Label>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <div className="shrink-0">{field.icon}</div>
              <code className="text-xs text-foreground truncate flex-1 ml-2">
                {urls[field.key] || field.label}
              </code>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleCopy(field.key, urls[field.key] || "")} title="Copiar URL">
                {copiedKey === field.key ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => refreshUrl(field.key)} title="Gerar nova URL">
                <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Switch checked={notifyMe} onCheckedChange={setNotifyMe} />
        <Label className="text-sm text-foreground cursor-pointer" onClick={() => setNotifyMe(!notifyMe)}>
          Notificar as enviadas por mim também
        </Label>
      </div>

      <p className="text-xs text-muted-foreground">
        As configurações de webhook serão salvas automaticamente ao criar o tenant.
      </p>
    </div>
  );
}

export default function NovoServidor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("id");
  const { toast } = useToast();
  // Pre-generate ID for new tenants so child components can use it
  const [pendingNewId] = useState(() => editId ? null : crypto.randomUUID());
  const { isMaster, isMasterTenantAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState("cadastro");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [companyPreCreated, setCompanyPreCreated] = useState(false);

  // Webhook state for new tenants
  const [webhookUrls, setWebhookUrls] = useState<Record<string, string>>({});
  const [webhookNotifyMe, setWebhookNotifyMe] = useState(false);

  // Called by ContractTemplateTab to ensure company exists before upload
  const handleEnsureCompany = async (): Promise<boolean> => {
    if (editId || companyPreCreated) return true;
    if (!formData.cnpj || !formData.razao_social) {
      sonnerToast.error("Preencha Razão Social e CNPJ antes de configurar o contrato");
      setActiveTab("cadastro");
      return false;
    }
    try {
      const { error } = await supabase.from("companies").insert({
        id: pendingNewId,
        cnpj: formData.cnpj,
        razao_social: formData.razao_social,
        nome_fantasia: formData.nome_fantasia || null,
      } as any);
      if (error) throw error;
      setCompanyPreCreated(true);
      return true;
    } catch (err: any) {
      console.error("Failed to pre-create company:", err);
      sonnerToast.error("Erro ao preparar tenant: " + (err.message || ""));
      return false;
    }
  };

  const [formData, setFormData] = useState({
    razao_social: "", nome_fantasia: "", cnpj: "", email: "", telefone: "",
    responsavel: "", cidade: "", estado: "", endereco: "", bairro: "",
    cep: "", numero: "", complemento: "", ...defaultBrand,
  });

  // Load existing company for editing
  useEffect(() => {
    if (!editId) return;
    const load = async () => {
      const { data } = await supabase.from("companies").select("*").eq("id", editId).single();
      if (data) {
        setFormData({
          razao_social: data.razao_social,
          nome_fantasia: data.nome_fantasia || "",
          cnpj: data.cnpj,
          email: data.email || "",
          telefone: data.telefone || "",
          responsavel: data.responsavel || "",
          cidade: data.cidade || "",
          estado: data.estado || "",
          endereco: data.endereco || "",
          bairro: data.bairro || "",
          cep: data.cep || "",
          numero: data.numero || "",
          complemento: data.complemento || "",
          brandLogoUrl: data.brand_logo_url || "",
          brandLogoPath: data.brand_logo_path || "",
          brandPrimaryColor: data.brand_primary_color || "#1E2952",
          brandSecondaryColor: data.brand_secondary_color || "#4F46E5",
          brandAccentColor: data.brand_accent_color || "#10B981",
          brandBgColor: data.brand_bg_color || "#F3F4F6",
          brandTextColor: data.brand_text_color || "#1F2937",
          docPrimaryColor: (data as any).doc_primary_color || data.brand_primary_color || "#1E2952",
          docSecondaryColor: (data as any).doc_secondary_color || data.brand_secondary_color || "#4F46E5",
          docAccentColor: (data as any).doc_accent_color || data.brand_accent_color || "#10B981",
          docBgColor: (data as any).doc_bg_color || data.brand_bg_color || "#F3F4F6",
          docTextColor: (data as any).doc_text_color || data.brand_text_color || "#1F2937",
        });
      }
      setLoadingEdit(false);
    };
    load();
  }, [editId]);

  // Block access for non-master-tenant users (after all hooks)
  if (!isMasterTenantAdmin) {
    return <Navigate to="/home" replace />;
  }

  const handleCnpjSearch = async () => {
    const digits = cleanDigits(formData.cnpj);
    if (digits.length !== 14) { sonnerToast.error("Digite um CNPJ válido"); return; }
    setCnpjLoading(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFormData((prev) => ({
        ...prev,
        razao_social: data.razao_social || prev.razao_social,
        nome_fantasia: data.nome_fantasia || data.razao_social || prev.nome_fantasia,
        email: data.email || prev.email,
        telefone: data.ddd_telefone_1 ? formatPhone(data.ddd_telefone_1) : prev.telefone,
        cep: data.cep ? formatCep(data.cep) : prev.cep,
        endereco: data.logradouro || prev.endereco,
        numero: data.numero || prev.numero,
        complemento: data.complemento || prev.complemento,
        bairro: data.bairro || prev.bairro,
        cidade: data.municipio || prev.cidade,
        estado: data.uf || prev.estado,
      }));
      sonnerToast.success("Dados do CNPJ carregados!");
    } catch { sonnerToast.error("CNPJ não encontrado."); }
    finally { setCnpjLoading(false); }
  };

  const handleCepSearch = async (cep: string) => {
    const digits = cleanDigits(cep);
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) throw new Error();
      setFormData((prev) => ({
        ...prev, cep: formatCep(digits),
        endereco: data.logradouro || prev.endereco,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        estado: data.uf || prev.estado,
        complemento: data.complemento || prev.complemento,
      }));
      sonnerToast.success("Endereço carregado!");
    } catch { sonnerToast.error("CEP não encontrado."); }
    finally { setCepLoading(false); }
  };

  const handleSave = async () => {
    if (!formData.razao_social || !formData.cnpj) {
      toast({ title: "Campos obrigatórios", description: "Razão Social e CNPJ são obrigatórios.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        razao_social: formData.razao_social,
        nome_fantasia: formData.nome_fantasia || null,
        cnpj: formData.cnpj,
        email: formData.email || null,
        telefone: formData.telefone || null,
        responsavel: formData.responsavel || null,
        cidade: formData.cidade || null,
        estado: formData.estado || null,
        endereco: formData.endereco || null,
        bairro: formData.bairro || null,
        cep: formData.cep || null,
        numero: formData.numero || null,
        complemento: formData.complemento || null,
        brand_logo_url: formData.brandLogoUrl || null,
        brand_logo_path: formData.brandLogoPath || null,
        brand_primary_color: formData.brandPrimaryColor,
        brand_secondary_color: formData.brandSecondaryColor,
        brand_accent_color: formData.brandAccentColor,
        brand_bg_color: formData.brandBgColor,
        brand_text_color: formData.brandTextColor,
        doc_primary_color: formData.docPrimaryColor,
        doc_secondary_color: formData.docSecondaryColor,
        doc_accent_color: formData.docAccentColor,
        doc_bg_color: formData.docBgColor,
        doc_text_color: formData.docTextColor,
      };

      if (editId) {
        const { error } = await supabase.from("companies").update(payload).eq("id", editId);
        if (error) throw error;
        toast({ title: "Tenant atualizado", description: "Os dados foram salvos." });
      } else {
        // Use the pre-generated ID
        const newId = pendingNewId!;
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const generateHash = () => Array.from(crypto.getRandomValues(new Uint8Array(8))).map((b) => b.toString(16).padStart(2, "0")).join("");
        
        const webhookPayload: Record<string, any> = {};
        if (supabaseUrl) {
          const events = [
            { key: "zapi_webhook_on_send", type: "on-send" },
            { key: "zapi_webhook_chat_presence", type: "chat-presence" },
            { key: "zapi_webhook_on_disconnect", type: "on-disconnect" },
            { key: "zapi_webhook_message_status", type: "message-status" },
            { key: "zapi_webhook_on_receive", type: "on-receive" },
            { key: "zapi_webhook_on_connect", type: "on-connect" },
          ];
          events.forEach((e) => {
            webhookPayload[e.key] = webhookUrls[e.key] || `${supabaseUrl}/functions/v1/zapi-webhook/${newId}/${e.type}/${generateHash()}`;
          });
          webhookPayload.zapi_webhook_notify_me = webhookNotifyMe;
        }

        const { error } = await supabase.from("companies").upsert({ id: newId, ...payload, ...webhookPayload }, { onConflict: "id" });
        if (error) throw error;
        toast({ title: "Tenant criado", description: "O novo tenant foi criado com sucesso." });
      }
      navigate("/configuracoes/usuarios");
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMaster) {
    navigate("/home");
    return null;
  }

  if (loadingEdit) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      {/* Top bar */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {editId ? "Editar Tenant" : "Novo Tenant"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {editId ? "Atualize os dados do ambiente." : "Configure um novo ambiente independente para uma empresa."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting} className="gap-2">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSubmitting ? "Salvando..." : editId ? "Salvar Alterações" : "Criar Tenant"}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex gap-0 h-[calc(100vh-3.5rem-73px)]">
        {/* Vertical sidebar navigation */}
        <div className="w-56 shrink-0 border-r border-border bg-card p-4 space-y-1 overflow-y-auto">
          {[
            { value: "cadastro", icon: Building2, label: "Dados Cadastrais" },
            { value: "identidade", icon: Palette, label: "Identidade Visual" },
            { value: "workspaces", icon: LayoutGrid, label: "Workspaces" },
            { value: "contrato", icon: FileSignature, label: "Contrato" },
            { value: "vendas", icon: Webhook, label: "Webhooks Z-API" },
            { value: "fintech", icon: CreditCard, label: "Webhooks Fintech" },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setActiveTab(item.value)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
                activeTab === item.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0 overflow-y-auto p-6">
          {activeTab === "cadastro" && (
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <Label className="font-semibold">CNPJ *</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.cnpj}
                      onChange={(e) => setFormData({ ...formData, cnpj: formatCnpj(e.target.value) })}
                      placeholder="00.000.000/0000-00"
                      className="flex-1"
                      disabled={!!editId}
                    />
                    {!editId && (
                      <Button variant="secondary" size="icon" onClick={handleCnpjSearch} disabled={cnpjLoading} title="Buscar CNPJ">
                        {cnpjLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-semibold">Razão Social *</Label>
                    <Input value={formData.razao_social} onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })} placeholder="Razão Social" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nome Fantasia</Label>
                    <Input value={formData.nome_fantasia} onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })} placeholder="Nome Fantasia" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Responsável</Label>
                    <Input value={formData.responsavel} onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })} placeholder="Nome do responsável" />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@empresa.com" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: formatPhone(e.target.value) })} placeholder="(00) 00000-0000" />
                  </div>
                  <div className="space-y-2">
                    <Label>CEP</Label>
                    <div className="flex gap-2">
                      <Input
                        value={formData.cep}
                        onChange={(e) => {
                          const formatted = formatCep(e.target.value);
                          setFormData({ ...formData, cep: formatted });
                          if (cleanDigits(formatted).length === 8) handleCepSearch(formatted);
                        }}
                        placeholder="00000-000"
                        className="flex-1"
                      />
                      {cepLoading && <Loader2 className="h-4 w-4 animate-spin self-center text-muted-foreground" />}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Endereço</Label>
                    <Input value={formData.endereco} onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} placeholder="Rua, Avenida..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Número</Label>
                    <Input value={formData.numero} onChange={(e) => setFormData({ ...formData, numero: e.target.value })} placeholder="Nº" />
                  </div>
                  <div className="space-y-2">
                    <Label>Complemento</Label>
                    <Input value={formData.complemento} onChange={(e) => setFormData({ ...formData, complemento: e.target.value })} placeholder="Sala, Andar..." />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Bairro</Label>
                    <Input value={formData.bairro} onChange={(e) => setFormData({ ...formData, bairro: e.target.value })} placeholder="Bairro" />
                  </div>
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input value={formData.cidade} onChange={(e) => setFormData({ ...formData, cidade: e.target.value })} placeholder="Cidade" />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Input value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })} placeholder="UF" maxLength={2} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "identidade" && (
            <Card>
              <CardContent className="pt-6">
                <BrandIdentityFields
                  formData={{
                    cnpj: formData.cnpj, razaoSocial: formData.razao_social,
                    nomeFantasia: formData.nome_fantasia, responsavel: formData.responsavel,
                    email: formData.email, telefone: formData.telefone, cep: formData.cep,
                    endereco: formData.endereco, numero: formData.numero,
                    complemento: formData.complemento, bairro: formData.bairro,
                    cidade: formData.cidade, estado: formData.estado,
                    brandLogoUrl: formData.brandLogoUrl, brandLogoPath: formData.brandLogoPath,
                    brandPrimaryColor: formData.brandPrimaryColor,
                    brandSecondaryColor: formData.brandSecondaryColor,
                    brandAccentColor: formData.brandAccentColor,
                    brandBgColor: formData.brandBgColor, brandTextColor: formData.brandTextColor,
                    docPrimaryColor: formData.docPrimaryColor || formData.brandPrimaryColor,
                    docSecondaryColor: formData.docSecondaryColor || formData.brandSecondaryColor,
                    docAccentColor: formData.docAccentColor || formData.brandAccentColor,
                    docBgColor: formData.docBgColor || formData.brandBgColor,
                    docTextColor: formData.docTextColor || formData.brandTextColor,
                  }}
                  onChange={(d) => setFormData({
                    ...formData,
                    brandLogoUrl: d.brandLogoUrl, brandLogoPath: d.brandLogoPath,
                    brandPrimaryColor: d.brandPrimaryColor,
                    brandSecondaryColor: d.brandSecondaryColor,
                    brandAccentColor: d.brandAccentColor,
                    brandBgColor: d.brandBgColor, brandTextColor: d.brandTextColor,
                    docPrimaryColor: d.docPrimaryColor,
                    docSecondaryColor: d.docSecondaryColor,
                    docAccentColor: d.docAccentColor,
                    docBgColor: d.docBgColor, docTextColor: d.docTextColor,
                  })}
                />
              </CardContent>
            </Card>
          )}

          {activeTab === "workspaces" && (
            <Card>
              <CardContent className="pt-6">
                <WorkspacesTab companyId={editId || pendingNewId} />
              </CardContent>
            </Card>
          )}

          {activeTab === "contrato" && (
            <Card>
              <CardContent className="pt-6">
                <ContractTemplateTab companyId={editId || pendingNewId} onEnsureCompany={editId ? undefined : handleEnsureCompany} />
              </CardContent>
            </Card>
          )}

          {activeTab === "vendas" && (
            <Card>
              <CardContent className="pt-6">
                {editId ? (
                  <WebhookConfig companyIdOverride={editId} />
                ) : (
                  <WebhookConfigPreview
                    urls={webhookUrls}
                    setUrls={setWebhookUrls}
                    notifyMe={webhookNotifyMe}
                    setNotifyMe={setWebhookNotifyMe}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
