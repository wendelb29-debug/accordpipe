import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Building2, Palette, FileSignature, Search, Loader2, Save, Webhook,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast as sonnerToast } from "sonner";
import { BrandIdentityFields } from "@/components/empresas/BrandIdentityFields";
import { ContractTemplateTab } from "@/components/servidores/ContractTemplateTab";
import { WebhookConfig } from "@/components/atendimento/tabs/WebhookConfig";
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
};

export default function NovoServidor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("id");
  const { toast } = useToast();
  const { isMaster } = useAuth();

  const [activeTab, setActiveTab] = useState("cadastro");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);

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
        });
      }
      setLoadingEdit(false);
    };
    load();
  }, [editId]);

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
      };

      if (editId) {
        const { error } = await supabase.from("companies").update(payload).eq("id", editId);
        if (error) throw error;
        toast({ title: "Tenant atualizado", description: "Os dados foram salvos." });
      } else {
        const { error } = await supabase.from("companies").insert(payload);
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
            { value: "contrato", icon: FileSignature, label: "Contrato" },
            { value: "vendas", icon: Webhook, label: "Webhooks Z-API" },
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
                  }}
                  onChange={(d) => setFormData({
                    ...formData,
                    brandLogoUrl: d.brandLogoUrl, brandLogoPath: d.brandLogoPath,
                    brandPrimaryColor: d.brandPrimaryColor,
                    brandSecondaryColor: d.brandSecondaryColor,
                    brandAccentColor: d.brandAccentColor,
                    brandBgColor: d.brandBgColor, brandTextColor: d.brandTextColor,
                  })}
                />
              </CardContent>
            </Card>
          )}

          {activeTab === "contrato" && (
            <Card>
              <CardContent className="pt-6">
                <ContractTemplateTab companyId={editId || null} />
              </CardContent>
            </Card>
          )}

          {activeTab === "vendas" && (
            <Card>
              <CardContent className="pt-6">
                {editId ? (
                  <WebhookConfig companyIdOverride={editId} />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Salve o tenant primeiro para configurar webhooks de vendas.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
