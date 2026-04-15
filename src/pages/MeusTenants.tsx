import { useState } from "react";
import { Building2, Plus, Search, Power, Users, Loader2, Crown, MoreHorizontal, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useChildTenants, ChildTenant } from "@/hooks/useChildTenants";
import { ChildTenantManageDialog } from "@/components/meus-tenants/ChildTenantManageDialog";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const cleanDigits = (v: string) => v.replace(/\D/g, "");

const formatCnpj = (v: string) => {
  const d = cleanDigits(v).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

export default function MeusTenants() {
  const { children, loading, parentCompany, createChildTenant, toggleChildStatus, canCreate } = useChildTenants();
  const { role, profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    razao_social: "",
    nome_fantasia: "",
    cnpj: "",
    email: "",
    telefone: "",
    responsavel: "",
  });

  // Only reseller tenants can access
  if (!parentCompany?.is_reseller && !loading) {
    return <Navigate to="/home" replace />;
  }

  const filteredChildren = children.filter(
    (c) =>
      c.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.nome_fantasia || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cnpj.includes(searchTerm)
  );

  const handleCreate = async () => {
    if (!formData.razao_social || !formData.cnpj) return;
    setIsSubmitting(true);
    const ok = await createChildTenant({
      razao_social: formData.razao_social,
      nome_fantasia: formData.nome_fantasia || undefined,
      cnpj: formData.cnpj,
      email: formData.email || undefined,
      telefone: formData.telefone || undefined,
      responsavel: formData.responsavel || undefined,
    });
    if (ok) {
      setDialogOpen(false);
      setFormData({ razao_social: "", nome_fantasia: "", cnpj: "", email: "", telefone: "", responsavel: "" });
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeCount = children.filter((c) => c.status === "active").length;
  const blockedCount = children.filter((c) => c.status !== "active").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Meus Tenants
          </h2>
          <p className="text-sm text-muted-foreground">Gerencie os tenants criados por sua revenda</p>
        </div>
        {canCreate && (
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo Tenant Filho
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{children.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <Building2 className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
              <Building2 className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{blockedCount}</p>
              <p className="text-xs text-muted-foreground">Bloqueados</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {parentCompany?.max_child_tenants
                  ? `${parentCompany.max_child_tenants - children.length}`
                  : "∞"}
              </p>
              <p className="text-xs text-muted-foreground">Capacidade</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar tenant filho..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-card">
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
            {filteredChildren.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhum tenant filho encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredChildren.map((child) => (
                <TableRow key={child.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{child.nome_fantasia || child.razao_social}</p>
                        {child.nome_fantasia && (
                          <p className="text-xs text-muted-foreground">{child.razao_social}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{child.cnpj}</TableCell>
                  <TableCell>{child.responsavel || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      <Users className="h-3 w-3" />
                      {child.user_count}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={child.status === "active" ? "default" : "secondary"}>
                      {child.status === "active" ? "Ativo" : "Bloqueado"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2" onClick={() => toggleChildStatus(child.id, child.status)}>
                          <Power className="h-4 w-4" />
                          {child.status === "active" ? "Bloquear" : "Ativar"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Tenant Filho</DialogTitle>
            <DialogDescription>Crie um novo tenant vinculado à sua revenda.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>CNPJ *</Label>
              <Input
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: formatCnpj(e.target.value) })}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Razão Social *</Label>
                <Input value={formData.razao_social} onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Nome Fantasia</Label>
                <Input value={formData.nome_fantasia} onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Responsável</Label>
                <Input value={formData.responsavel} onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={isSubmitting || !formData.razao_social || !formData.cnpj}>
              {isSubmitting ? "Criando..." : "Criar Tenant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
