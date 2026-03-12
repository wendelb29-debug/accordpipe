import { useState, useEffect } from "react";
import {
  Plus, Search, Building2, MoreHorizontal, Pencil, Power, Users, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  created_at: string;
  user_count?: number;
}

export default function ServidoresTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { isMaster } = useAuth();

  const [formData, setFormData] = useState({
    razao_social: "",
    nome_fantasia: "",
    cnpj: "",
    email: "",
    telefone: "",
    responsavel: "",
    cidade: "",
    estado: "",
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const { data: companiesData, error } = await supabase
        .from("companies")
        .select("*")
        .is("servidor_id", null) // Only top-level servidores
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user counts per company
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
      toast({ title: "Erro", description: "Não foi possível carregar os servidores.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

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
      });
    } else {
      setEditingCompany(null);
      setFormData({ razao_social: "", nome_fantasia: "", cnpj: "", email: "", telefone: "", responsavel: "", cidade: "", estado: "" });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.razao_social || !formData.cnpj) {
      toast({ title: "Campos obrigatórios", description: "Razão Social e CNPJ são obrigatórios.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCompany) {
        const { error } = await supabase
          .from("companies")
          .update({
            razao_social: formData.razao_social,
            nome_fantasia: formData.nome_fantasia || null,
            cnpj: formData.cnpj,
            email: formData.email || null,
            telefone: formData.telefone || null,
            responsavel: formData.responsavel || null,
            cidade: formData.cidade || null,
            estado: formData.estado || null,
          })
          .eq("id", editingCompany.id);
        if (error) throw error;
        toast({ title: "Servidor atualizado", description: "Os dados do servidor foram atualizados." });
      } else {
        const { error } = await supabase
          .from("companies")
          .insert({
            razao_social: formData.razao_social,
            nome_fantasia: formData.nome_fantasia || null,
            cnpj: formData.cnpj,
            email: formData.email || null,
            telefone: formData.telefone || null,
            responsavel: formData.responsavel || null,
            cidade: formData.cidade || null,
            estado: formData.estado || null,
          });
        if (error) throw error;
        toast({ title: "Servidor criado", description: "O novo servidor foi criado com sucesso." });
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
    const newStatus = company.status === "active" ? "inactive" : "active";
    try {
      const { error } = await supabase
        .from("companies")
        .update({ status: newStatus })
        .eq("id", company.id);
      if (error) throw error;
      toast({
        title: newStatus === "active" ? "Servidor ativado" : "Servidor bloqueado",
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
          <h2 className="text-lg font-semibold text-foreground">Servidores (Empresas)</h2>
          <p className="text-sm text-muted-foreground">Ambientes independentes vinculados por CNPJ</p>
        </div>
        {isMaster && (
          <Button className="gap-2" onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4" />
            Novo Servidor
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
              <p className="text-xs text-muted-foreground">Total de Servidores</p>
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
              <TableHead>Servidor</TableHead>
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
                  Nenhum servidor encontrado.
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
                    <Badge variant="outline" className="gap-1">
                      <Users className="h-3 w-3" />
                      {company.user_count || 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={company.status === "active" ? "default" : "secondary"}>
                      {company.status === "active" ? "Ativo" : "Bloqueado"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {isMaster && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2" onClick={() => handleOpenDialog(company)}>
                            <Pencil className="h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2" onClick={() => handleToggleStatus(company)}>
                            <Power className="h-4 w-4" />
                            {company.status === "active" ? "Bloquear" : "Ativar"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCompany ? "Editar Servidor" : "Novo Servidor"}</DialogTitle>
            <DialogDescription>
              {editingCompany
                ? "Atualize os dados do servidor/empresa."
                : "Cadastre uma nova empresa como ambiente independente."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
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
                <Label>CNPJ *</Label>
                <Input value={formData.cnpj} onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })} placeholder="00.000.000/0000-00" disabled={!!editingCompany} />
              </div>
              <div className="space-y-2">
                <Label>Responsável</Label>
                <Input value={formData.responsavel} onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })} placeholder="Nome do responsável" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@empresa.com" />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} placeholder="(00) 00000-0000" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={formData.cidade} onChange={(e) => setFormData({ ...formData, cidade: e.target.value })} placeholder="Cidade" />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Input value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value })} placeholder="UF" maxLength={2} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : editingCompany ? "Salvar" : "Criar Servidor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
