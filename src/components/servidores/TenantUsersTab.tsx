import { useState, useEffect, useCallback } from "react";
import { Plus, Search, User, MoreHorizontal, Pencil, Power, Shield, Eye, EyeOff, Loader2, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PermissionsEditor } from "@/components/usuarios/PermissionsEditor";
import { AppRole } from "@/contexts/AuthContext";

interface TenantUser {
  id: string; // user_tenants id
  user_id: string;
  role: string;
  status: string;
  name: string;
  email: string;
  cpf: string | null;
  whatsapp: string | null;
  is_master: boolean;
}

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  operador: "Operador",
  leitura: "Leitura",
  ceo: "CEO",
  master: "Master",
  administrativo: "Administrativo",
  financeiro: "Financeiro",
  comercial: "Comercial",
};

const cleanDigits = (v: string) => v.replace(/\D/g, "");

const formatCpf = (v: string) => {
  const d = cleanDigits(v).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

const formatPhone = (v: string) => {
  const d = cleanDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

interface TenantUsersTabProps {
  companyId: string | null;
  companyName?: string;
}

export default function TenantUsersTab({ companyId, companyName }: TenantUsersTabProps) {
  const { toast } = useToast();
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Permissions modal
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [permUserId, setPermUserId] = useState<string | null>(null);
  const [permUserName, setPermUserName] = useState("");
  const [permUserIsCeo, setPermUserIsCeo] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    name: "", cpf: "", birth_date: "", email: "", whatsapp: "", password: "",
    role: "leitura" as AppRole,
  });

  const fetchUsers = useCallback(async () => {
    if (!companyId) { setUsers([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_tenants")
        .select("id, user_id, role, status, profiles:user_id(user_id, name, email, cpf, whatsapp, is_master)")
        .eq("tenant_id", companyId);

      if (error) throw error;

      const mapped: TenantUser[] = (data || []).map((ut: any) => ({
        id: ut.id,
        user_id: ut.user_id,
        role: ut.role || "leitura",
        status: ut.status || "ativo",
        name: ut.profiles?.name || "—",
        email: ut.profiles?.email || "—",
        cpf: ut.profiles?.cpf || null,
        whatsapp: ut.profiles?.whatsapp || null,
        is_master: ut.profiles?.is_master || false,
      }));
      setUsers(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleOpenCreate = () => {
    setFormData({ name: "", cpf: "", birth_date: "", email: "", whatsapp: "", password: "", role: "leitura" });
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.email || !formData.cpf || !formData.birth_date || !formData.whatsapp) {
      toast({ title: "Campos obrigatórios", description: "Preencha Nome, CPF, Data de Nascimento, E-mail e WhatsApp.", variant: "destructive" });
      return;
    }
    if (!companyId) {
      toast({ title: "Tenant não salvo", description: "Salve o tenant antes de adicionar usuários.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          name: formData.name,
          email: formData.email,
          cpf: formData.cpf,
          birth_date: formData.birth_date,
          whatsapp: formData.whatsapp,
          company_id: companyId,
          role: formData.role,
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Erro desconhecido");

      const isLinked = data?.linked_existing;
      toast({
        title: isLinked ? "Usuário vinculado" : "Usuário criado",
        description: isLinked
          ? `${formData.name} foi vinculado ao tenant com sucesso.`
          : `${formData.name} foi criado e vinculado.${data?.temp_password ? ` Senha temporária: ${data.temp_password}` : ""}`,
      });
      setDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Não foi possível criar o usuário.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: TenantUser) => {
    if (user.is_master) {
      toast({ title: "Ação não permitida", description: "Usuário master não pode ser desativado.", variant: "destructive" });
      return;
    }
    try {
      const newStatus = user.status === "ativo" ? "inativo" : "ativo";

      // If reactivating, check user limit
      if (newStatus === "ativo" && companyId) {
        const { data: limitCheck } = await supabase.rpc("check_user_limit", { _tenant_id: companyId });
        const lc = limitCheck as any;
        if (lc && !lc.can_add) {
          toast({
            title: "Limite de usuários atingido",
            description: `Plano ${lc.plan_name}: ${lc.active_users}/${lc.effective_limit} usuários. Não é possível reativar.`,
            variant: "destructive",
          });
          return;
        }
      }

      const { error } = await supabase
        .from("user_tenants")
        .update({ status: newStatus } as any)
        .eq("id", user.id);
      if (error) throw error;

      // Also sync profiles for consistency
      await supabase
        .from("profiles")
        .update({ is_active: newStatus === "ativo", status: newStatus === "ativo" ? "ativo" : "bloqueado" })
        .eq("user_id", user.user_id);

      toast({ title: newStatus === "ativo" ? "Ativado" : "Desativado", description: `${user.name} foi ${newStatus === "ativo" ? "ativado" : "desativado"} neste tenant.` });
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleRemoveFromTenant = async (user: TenantUser) => {
    if (user.is_master) {
      toast({ title: "Ação não permitida", description: "Usuário master não pode ser removido.", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.from("user_tenants").delete().eq("id", user.id);
      if (error) throw error;
      toast({ title: "Removido", description: `${user.name} foi removido deste tenant.` });
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const openPermissions = (user: TenantUser) => {
    setPermUserId(user.user_id);
    setPermUserName(user.name);
    setPermUserIsCeo(user.role === "ceo" || user.role === "master");
    setPermDialogOpen(true);
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!companyId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <User className="h-12 w-12 mb-4 opacity-50" />
        <p>Salve o tenant primeiro para gerenciar usuários.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Novo Usuário
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <User className="h-12 w-12 mb-4 opacity-50" />
          <p>Nenhum usuário vinculado a este tenant.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === "ceo" || user.role === "master" ? "default" : "secondary"}>
                      {roleLabels[user.role] || user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === "ativo" ? "outline" : "destructive"} className={user.status === "ativo" ? "border-green-500/30 text-green-500" : ""}>
                      {user.status === "ativo" ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openPermissions(user)}>
                          <Shield className="h-4 w-4 mr-2" /> Permissões
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                          <Power className="h-4 w-4 mr-2" />
                          {user.status === "ativo" ? "Desativar" : "Ativar"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRemoveFromTenant(user)} className="text-destructive">
                          <UserX className="h-4 w-4 mr-2" /> Remover do Tenant
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>Criar e vincular ao tenant{companyName ? ` "${companyName}"` : ""}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nome completo" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input value={formData.cpf} onChange={(e) => setFormData({ ...formData, cpf: formatCpf(e.target.value) })} placeholder="000.000.000-00" />
              </div>
              <div className="space-y-2">
                <Label>Data de Nascimento</Label>
                <Input type="date" value={formData.birth_date} onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input value={formData.whatsapp} onChange={(e) => setFormData({ ...formData, whatsapp: formatPhone(e.target.value) })} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-2">
              <Label>Tenant vinculado</Label>
              <Input value={companyName || companyId || ""} disabled className="opacity-70" />
            </div>
            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as AppRole })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={isSubmitting} className="gap-2">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {isSubmitting ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Permissões — {permUserName}
            </DialogTitle>
            <DialogDescription>Gerencie as permissões de acesso deste usuário por módulo.</DialogDescription>
          </DialogHeader>
          {permUserId && (
            <PermissionsEditor
              userId={permUserId}
              isCeoOrMaster={permUserIsCeo}
              onClose={() => setPermDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
