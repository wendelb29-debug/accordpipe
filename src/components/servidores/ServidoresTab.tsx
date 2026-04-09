import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Search, Building2, MoreHorizontal, Pencil, Power, Users, Globe, Loader2, Palette, FileSignature, Shield, Webhook, Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContractTemplateTab } from "./ContractTemplateTab";
import { WorkspacesTab } from "./WorkspacesTab";
import { WebhookConfig } from "@/components/atendimento/tabs/WebhookConfig";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast as sonnerToast } from "sonner";
import { BrandIdentityFields } from "@/components/empresas/BrandIdentityFields";
import { CompanyFormData } from "@/components/empresas/types";

interface Company {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  email: string | null;
  telefone: string | null;
  responsavel: string | null;
  status: string;
  cidade: string | null;
  estado: string | null;
  endereco: string | null;
  bairro: string | null;
  cep: string | null;
  numero: string | null;
  complemento: string | null;
  created_at: string;
  user_count?: number;
}

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

export default function ServidoresTab() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);
  const [usersDialogCompany, setUsersDialogCompany] = useState<Company | null>(null);
  const [tenantUsers, setTenantUsers] = useState<{ user_id: string; name: string; email: string; is_active: boolean; role: string; status: string }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const { toast } = useToast();
  const { isMaster, profile } = useAuth();

  const [formData, setFormData] = useState({
    razao_social: "",
    nome_fantasia: "",
    cnpj: "",
    email: "",
    telefone: "",
    responsavel: "",
    cidade: "",
    estado: "",
    endereco: "",
    bairro: "",
    cep: "",
    numero: "",
    complemento: "",
    brandLogoUrl: "",
    brandLogoPath: "",
    brandPrimaryColor: "#1E2952",
    brandSecondaryColor: "#4F46E5",
    brandAccentColor: "#10B981",
    brandBgColor: "#F3F4F6",
    brandTextColor: "#1F2937",
  });
  const [activeTab, setActiveTab] = useState("cadastro");

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const { data: companiesData, error } = await supabase
        .from("companies")
        .select("*")
        .is("servidor_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("company_id");

      const countMap: Record<string, number> = {};
      (profiles || []).forEach((p) => {
        if (p.company_id) {
          countMap[p.company_id] = (countMap[p.company_id] || 0) + 1;
        }
      });

      const enriched = (companiesData || []).map((c) => ({
        ...c,
        user_count: countMap[c.id] || 0,
      }));

      setCompanies(enriched);
    } catch (error) {
      console.error("Error fetching companies:", error);
      toast({ title: "Erro", description: "Não foi possível carregar os tenants.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUsersDialog = async (company: Company) => {
    setUsersDialogCompany(company);
    setUsersDialogOpen(true);
    setLoadingUsers(true);
    setEditingUser(null);
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, email, is_active, status")
        .eq("company_id", company.id);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      const roleMap: Record<string, string> = {};
      (roles || []).forEach((r: any) => { roleMap[r.user_id] = r.role; });

      setTenantUsers(
        (profiles || []).map((p: any) => ({
          user_id: p.user_id,
          name: p.name || "---",
          email: p.email || "",
          is_active: p.is_active,
          role: roleMap[p.user_id] || "leitura",
          status: p.status || "ativo",
        }))
      );
    } catch {
      setTenantUsers([]);
    }
    setLoadingUsers(false);
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      await supabase.from("user_roles").update({ role: newRole } as any).eq("user_id", userId);
      sonnerToast.success("Papel atualizado!");
      if (usersDialogCompany) handleOpenUsersDialog(usersDialogCompany);
    } catch {
      sonnerToast.error("Erro ao atualizar papel");
    }
  };

  const handleToggleUserStatus = async (userId: string, currentActive: boolean) => {
    try {
      await supabase.from("profiles").update({ is_active: !currentActive, status: currentActive ? "bloqueado" : "ativo" } as any).eq("user_id", userId);
      sonnerToast.success(currentActive ? "Usuário bloqueado" : "Usuário ativado");
      if (usersDialogCompany) handleOpenUsersDialog(usersDialogCompany);
      fetchCompanies();
    } catch {
      sonnerToast.error("Erro ao alterar status");
    }
  };

  const defaultBrand = { brandLogoUrl: "", brandLogoPath: "", brandPrimaryColor: "#1E2952", brandSecondaryColor: "#4F46E5", brandAccentColor: "#10B981", brandBgColor: "#F3F4F6", brandTextColor: "#1F2937" };

  const handleOpenDialog = (company?: Company) => {
    if (company) {
      setEditingCompany(company);
      setFormData({
        razao_social: company.razao_social,
        nome_fantasia: company.nome_fantasia || "",
        cnpj: company.cnpj,
        email: company.email || "",
        telefone: company.telefone || "",
        responsavel: company.responsavel || "",
        cidade: company.cidade || "",
        estado: company.estado || "",
        endereco: company.endereco || "",
        bairro: company.bairro || "",
        cep: company.cep || "",
        numero: company.numero || "",
        complemento: company.complemento || "",
        brandLogoUrl: (company as any).brand_logo_url || "",
        brandLogoPath: (company as any).brand_logo_path || "",
        brandPrimaryColor: (company as any).brand_primary_color || "#1E2952",
        brandSecondaryColor: (company as any).brand_secondary_color || "#4F46E5",
        brandAccentColor: (company as any).brand_accent_color || "#10B981",
        brandBgColor: (company as any).brand_bg_color || "#F3F4F6",
        brandTextColor: (company as any).brand_text_color || "#1F2937",
      });
    } else {
      setEditingCompany(null);
      setFormData({ razao_social: "", nome_fantasia: "", cnpj: "", email: "", telefone: "", responsavel: "", cidade: "", estado: "", endereco: "", bairro: "", cep: "", numero: "", complemento: "", ...defaultBrand });
    }
    setActiveTab("cadastro");
    setDialogOpen(true);
  };

  const handleCnpjSearch = async () => {
    const digits = cleanDigits(formData.cnpj);
    if (digits.length !== 14) {
      sonnerToast.error("Digite um CNPJ válido com 14 dígitos");
      return;
    }
    setCnpjLoading(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (!res.ok) throw new Error("CNPJ não encontrado");
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
      sonnerToast.success("Dados do CNPJ carregados com sucesso!");
    } catch {
      sonnerToast.error("Não foi possível buscar o CNPJ. Verifique e tente novamente.");
    } finally {
      setCnpjLoading(false);
    }
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
        ...prev,
        cep: formatCep(digits),
        endereco: data.logradouro || prev.endereco,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        estado: data.uf || prev.estado,
        complemento: data.complemento || prev.complemento,
      }));
      sonnerToast.success("Endereço carregado pelo CEP!");
    } catch {
      sonnerToast.error("CEP não encontrado.");
    } finally {
      setCepLoading(false);
    }
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

      if (editingCompany) {
        const { error } = await supabase.from("companies").update(payload).eq("id", editingCompany.id);
        if (error) throw error;
        toast({ title: "Tenant atualizado", description: "Os dados do tenant foram atualizados." });
        // Notify ThemeSync to refresh brand colors
        window.dispatchEvent(new Event("brand-colors-updated"));
      } else {
        const { error } = await supabase.from("companies").insert(payload);
        if (error) throw error;
        toast({ title: "Tenant criado", description: "O novo tenant foi criado com sucesso." });
      }
      setDialogOpen(false);
      fetchCompanies();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Não foi possível salvar.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (company: Company) => {
    if (company.id === profile?.company_id) return;
    const newStatus = company.status === "active" ? "inactive" : "active";
    try {
      const { error } = await supabase.from("companies").update({ status: newStatus }).eq("id", company.id);
      if (error) throw error;
      toast({
        title: newStatus === "active" ? "Tenant ativado" : "Tenant bloqueado",
        description: `${company.nome_fantasia || company.razao_social} foi ${newStatus === "active" ? "ativado" : "bloqueado"}.`,
      });
      fetchCompanies();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const filteredCompanies = companies.filter(
    (c) =>
      c.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.nome_fantasia || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cnpj.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Tenants</h2>
          <p className="text-sm text-muted-foreground">Ambientes independentes vinculados por CNPJ</p>
        </div>
        {isMaster && (
          <Button className="gap-2" onClick={() => navigate("/servidores/novo")}>
            <Plus className="h-4 w-4" />
            Novo Tenant
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, fantasia ou CNPJ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{companies.length}</p>
              <p className="text-xs text-muted-foreground">Total de Tenants</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <Building2 className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{companies.filter((c) => c.status === "active").length}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
              <Users className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{companies.reduce((sum, c) => sum + (c.user_count || 0), 0)}</p>
              <p className="text-xs text-muted-foreground">Usuários Vinculados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-card animate-fade-in">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Usuários</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCompanies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhum tenant encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredCompanies.map((company) => (
                <TableRow key={company.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {company.nome_fantasia || company.razao_social}
                        </p>
                        {company.nome_fantasia && (
                          <p className="text-xs text-muted-foreground">{company.razao_social}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{company.cnpj}</TableCell>
                  <TableCell>{company.responsavel || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="gap-1 cursor-pointer hover:bg-primary/10 transition-colors"
                      onClick={() => handleOpenUsersDialog(company)}
                    >
                      <Users className="h-3 w-3" />
                      {company.user_count || 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={company.status === "active" ? "default" : "secondary"}>
                      {company.status === "active" ? "Ativo" : "Bloqueado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex items-center gap-2">
                    {isMaster && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2" onClick={() => navigate(`/servidores/novo?id=${company.id}`)}>
                            <Pencil className="h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          {company.id !== profile?.company_id && (
                            <DropdownMenuItem className="gap-2" onClick={() => handleToggleStatus(company)}>
                              <Power className="h-4 w-4" />
                              {company.status === "active" ? "Bloquear" : "Ativar"}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {company.id === profile?.company_id && (
                      <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600">
                        <Shield className="h-3 w-3 mr-1" /> Master
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingCompany ? "Editar Tenant" : "Novo Tenant"}</DialogTitle>
            <DialogDescription>
              {editingCompany
                ? "Atualize os dados do tenant."
                : "Cadastre um novo tenant como ambiente independente."}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-row gap-4">
            <TabsList className="flex flex-col items-stretch h-auto bg-transparent gap-1 w-48 shrink-0 pt-2">
              <TabsTrigger value="cadastro" className="justify-start gap-2 px-3 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
                <Building2 className="h-4 w-4" />
                Dados Cadastrais
              </TabsTrigger>
              <TabsTrigger value="identidade" className="justify-start gap-2 px-3 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
                <Palette className="h-4 w-4" />
                Identidade Visual
              </TabsTrigger>
              <TabsTrigger value="contrato" className="justify-start gap-2 px-3 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
                <FileSignature className="h-4 w-4" />
                Contrato
              </TabsTrigger>
              <TabsTrigger value="webhooks" className="justify-start gap-2 px-3 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg" disabled={!editingCompany}>
                <Webhook className="h-4 w-4" />
                Vendas
              </TabsTrigger>
              <TabsTrigger value="workspaces" className="justify-start gap-2 px-3 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg" disabled={!editingCompany}>
                <Briefcase className="h-4 w-4" />
                Workspaces
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto py-2">
              <TabsContent value="cadastro" className="mt-0">
                <div className="grid gap-4">
                  {/* CNPJ with search */}
                  <div className="space-y-2">
                    <Label>CNPJ *</Label>
                    <div className="flex gap-2">
                      <Input
                        value={formData.cnpj}
                        onChange={(e) => setFormData({ ...formData, cnpj: formatCnpj(e.target.value) })}
                        placeholder="00.000.000/0000-00"
                        className="flex-1"
                        disabled={!!editingCompany && !isMaster}
                      />
                      {(!editingCompany || isMaster) && (
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={handleCnpjSearch}
                          disabled={cnpjLoading}
                          className="shrink-0"
                          title="Buscar dados pelo CNPJ"
                        >
                          {cnpjLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Razão Social *</Label>
                      <Input value={formData.razao_social} onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })} placeholder="Razão Social" />
                    </div>
                    <div className="space-y-2">
                      <Label>Nome Fantasia</Label>
                      <Input value={formData.nome_fantasia} onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })} placeholder="Nome Fantasia" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Responsável</Label>
                      <Input value={formData.responsavel} onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })} placeholder="Nome do responsável" />
                    </div>
                    <div className="space-y-2">
                      <Label>E-mail</Label>
                      <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@empresa.com" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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
                            if (cleanDigits(formatted).length === 8) {
                              handleCepSearch(formatted);
                            }
                          }}
                          placeholder="00000-000"
                          className="flex-1"
                        />
                        {cepLoading && <Loader2 className="h-4 w-4 animate-spin self-center text-muted-foreground" />}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
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

                  <div className="grid grid-cols-3 gap-4">
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
                </div>
              </TabsContent>

              <TabsContent value="identidade" className="mt-0">
                <BrandIdentityFields
                  formData={{
                    cnpj: formData.cnpj,
                    razaoSocial: formData.razao_social,
                    nomeFantasia: formData.nome_fantasia,
                    responsavel: formData.responsavel,
                    email: formData.email,
                    telefone: formData.telefone,
                    cep: formData.cep,
                    endereco: formData.endereco,
                    numero: formData.numero,
                    complemento: formData.complemento,
                    bairro: formData.bairro,
                    cidade: formData.cidade,
                    estado: formData.estado,
                    brandLogoUrl: formData.brandLogoUrl,
                    brandLogoPath: formData.brandLogoPath,
                    brandPrimaryColor: formData.brandPrimaryColor,
                    brandSecondaryColor: formData.brandSecondaryColor,
                    brandAccentColor: formData.brandAccentColor,
                    brandBgColor: formData.brandBgColor,
                    brandTextColor: formData.brandTextColor,
                  }}
                  onChange={(d) => setFormData({
                    ...formData,
                    brandLogoUrl: d.brandLogoUrl,
                    brandLogoPath: d.brandLogoPath,
                    brandPrimaryColor: d.brandPrimaryColor,
                    brandSecondaryColor: d.brandSecondaryColor,
                    brandAccentColor: d.brandAccentColor,
                    brandBgColor: d.brandBgColor,
                    brandTextColor: d.brandTextColor,
                  })}
                />
              </TabsContent>

              <TabsContent value="webhooks" className="mt-0">
                {editingCompany ? (
                  <WebhookConfig companyIdOverride={editingCompany.id} />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Salve o tenant primeiro para configurar webhooks.</p>
                )}
              </TabsContent>

              <TabsContent value="contrato" className="mt-0">
                <ContractTemplateTab companyId={editingCompany?.id || null} />
              </TabsContent>
              <TabsContent value="workspaces" className="mt-0">
                {editingCompany ? (
                  <WorkspacesTab companyId={editingCompany.id} />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Salve o tenant primeiro para configurar workspaces.</p>
                )}
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="border-t border-border pt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : editingCompany ? "Salvar" : "Criar Tenant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Users Dialog */}
      <Dialog open={usersDialogOpen} onOpenChange={setUsersDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuários — {usersDialogCompany?.nome_fantasia || usersDialogCompany?.razao_social}
            </DialogTitle>
            <DialogDescription>
              Gerencie os usuários vinculados a este tenant.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : tenantUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum usuário vinculado a este tenant.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenantUsers.map((u) => (
                    <TableRow key={u.user_id}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={u.role}
                          onValueChange={(val) => handleUpdateUserRole(u.user_id, val)}
                        >
                          <SelectTrigger className="h-8 w-36 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="operador">Operador</SelectItem>
                            <SelectItem value="leitura">Leitura</SelectItem>
                            <SelectItem value="ceo">CEO</SelectItem>
                            <SelectItem value="administrativo">Administrativo</SelectItem>
                            <SelectItem value="financeiro">Financeiro</SelectItem>
                            <SelectItem value="comercial">Comercial</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.is_active ? "default" : "secondary"} className="text-[10px]">
                          {u.is_active ? "Ativo" : "Bloqueado"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleToggleUserStatus(u.user_id, u.is_active)}
                          title={u.is_active ? "Bloquear usuário" : "Ativar usuário"}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
