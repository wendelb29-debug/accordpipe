import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Building2, MoreHorizontal, Eye, Trash2, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusBadge, CompanyStatus } from "@/components/ui/status-badge";
import { CompanyFormDialog } from "@/components/empresas/CompanyFormDialog";
import { CompanyFormData } from "@/components/empresas/types";
import { useCompanies } from "@/hooks/useCompanies";
import { useAuth } from "@/contexts/AuthContext";

export default function Empresas() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingCompany, setEditingCompany] = useState<{ id: string; data: CompanyFormData } | null>(null);
  const { companies, loading, addCompany, updateCompany, deleteCompany } = useCompanies();
  const { profile } = useAuth();

  const handleEdit = (company: typeof companies[0]) => {
    setEditingCompany({
      id: company.id,
      data: {
        cnpj: company.cnpj,
        razaoSocial: company.razao_social,
        nomeFantasia: company.nome_fantasia || "",
        responsavel: company.responsavel || "",
        email: company.email || "",
        telefone: company.telefone || "",
        cep: company.cep || "",
        endereco: company.endereco || "",
        numero: company.numero || "",
        complemento: company.complemento || "",
        bairro: company.bairro || "",
        cidade: company.cidade || "",
        estado: company.estado || "",
        brandLogoUrl: (company as any).brand_logo_url || "",
        brandLogoPath: (company as any).brand_logo_path || "",
        brandPrimaryColor: (company as any).brand_primary_color || "#1E2952",
        brandSecondaryColor: (company as any).brand_secondary_color || "#4F46E5",
        brandAccentColor: (company as any).brand_accent_color || "#10B981",
        brandBgColor: (company as any).brand_bg_color || "#F3F4F6",
        brandTextColor: (company as any).brand_text_color || "#1F2937",
        docPrimaryColor: (company as any).doc_primary_color || (company as any).brand_primary_color || "#1E2952",
        docSecondaryColor: (company as any).doc_secondary_color || (company as any).brand_secondary_color || "#4F46E5",
        docAccentColor: (company as any).doc_accent_color || (company as any).brand_accent_color || "#10B981",
        docBgColor: (company as any).doc_bg_color || (company as any).brand_bg_color || "#F3F4F6",
        docTextColor: (company as any).doc_text_color || (company as any).brand_text_color || "#1F2937",
      },
    });
    setDialogOpen(true);
  };

  const filteredCompanies = companies.filter(
    (c) =>
      c.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cnpj.includes(searchTerm) ||
      (c.responsavel || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveCompany = async (data: CompanyFormData) => {
    const payload = {
      cnpj: data.cnpj,
      razao_social: data.razaoSocial,
      nome_fantasia: data.nomeFantasia || undefined,
      responsavel: data.responsavel || undefined,
      email: data.email || undefined,
      telefone: data.telefone || undefined,
      cep: data.cep || undefined,
      endereco: data.endereco || undefined,
      numero: data.numero || undefined,
      complemento: data.complemento || undefined,
      bairro: data.bairro || undefined,
      cidade: data.cidade || undefined,
      estado: data.estado || undefined,
      brand_logo_url: data.brandLogoUrl || undefined,
      brand_logo_path: data.brandLogoPath || undefined,
      brand_primary_color: data.brandPrimaryColor || undefined,
      brand_secondary_color: data.brandSecondaryColor || undefined,
      brand_accent_color: data.brandAccentColor || undefined,
      brand_bg_color: data.brandBgColor || undefined,
      brand_text_color: data.brandTextColor || undefined,
    };

    let success: boolean;
    if (editingCompany) {
      success = await updateCompany(editingCompany.id, payload);
    } else {
      success = await addCompany(payload);
    }

    if (success) {
      setDialogOpen(false);
      setEditingCompany(null);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteCompany(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Empresas</h1>
          <p className="text-muted-foreground">Gerencie o cadastro de clientes</p>
        </div>
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Nova Empresa
        </Button>
      </div>

      <CompanyFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingCompany(null);
        }}
        onSave={handleSaveCompany}
        editData={editingCompany?.data}
        isEditing={!!editingCompany}
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por CNPJ, nome ou responsável..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card animate-fade-in">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Building2 className="h-12 w-12 mb-4 opacity-50" />
            <p>Nenhuma empresa cadastrada</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCompanies.map((company) => (
                <TableRow key={company.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{company.nome_fantasia || company.razao_social}</p>
                        <p className="text-sm text-muted-foreground">{company.razao_social}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{company.cnpj}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{company.responsavel || "-"}</p>
                      <p className="text-sm text-muted-foreground">{company.email || ""}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {company.cidade && company.estado
                      ? `${company.cidade}, ${company.estado}`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={company.status as CompanyStatus} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2" onClick={() => navigate(`/empresas/${company.id}`)}>
                          <Eye className="h-4 w-4" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2" onClick={() => handleEdit(company)}>
                          <Pencil className="h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        {profile?.is_master && (
                          <DropdownMenuItem
                            className="gap-2 text-destructive"
                            onClick={() => setDeleteId(company.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta empresa? Esta ação não pode ser desfeita.
              Todos os documentos e contratos vinculados também serão excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
