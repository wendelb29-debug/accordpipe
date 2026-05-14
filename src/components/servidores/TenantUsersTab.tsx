import { useState, useEffect, useCallback } from "react";
import { Plus, Search, User, MoreHorizontal, Power, Shield, Loader2, UserX, Clock, Pencil } from "lucide-react";
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
  id: string;
  user_id: string;
  role: string;
  status: string;
  name: string;
  email: string;
  cpf: string | null;
  whatsapp: string | null;
  is_master: boolean;
  trial_expires_at: string | null;
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

type TrialDuration = "7" | "15" | "30" | "custom";

const computeExpiresAt = (duration: TrialDuration, customDate?: string): string | null => {
  if (duration === "custom") {
    return customDate ? new Date(customDate + "T23:59:59").toISOString() : null;
  }
  const days = parseInt(duration, 10);
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
};

const formatExpirationStatus = (expiresAt: string | null) => {
  if (!expiresAt) return { label: "Sem limite", variant: "outline" as const, className: "text-muted-foreground" };
  const date = new Date(expiresAt);
  const now = new Date();
  const ms = date.getTime() - now.getTime();
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  const formatted = date.toLocaleDateString("pt-BR");
  if (ms <= 0) {
    return { label: `Expirado em ${formatted}`, variant: "destructive" as const, className: "" };
  }
  if (days <= 3) {
    return {
      label: `Expira em ${days} dia${days > 1 ? "s" : ""}`,
      variant: "outline" as const,
      className: "border-amber-500/40 text-amber-600 bg-amber-500/10",
    };
  }
  return {
    label: `Ativo até ${formatted}`,
    variant: "outline" as const,
    className: "border-green-500/30 text-green-600",
  };
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
  const [tenantType, setTenantType] = useState<string>("standard");

  // Permissions modal
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [permUserId, setPermUserId] = useState<string | null>(null);
  const [permUserName, setPermUserName] = useState("");
  const [permUserIsCeo, setPermUserIsCeo] = useState(false);

  // Edit expiration modal
  const [editExpUser, setEditExpUser] = useState<TenantUser | null>(null);
  const [editExpDate, setEditExpDate] = useState<string>("");
  const [editExpSaving, setEditExpSaving] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    name: "", cpf: "", birth_date: "", email: "", whatsapp: "",
    role: "leitura" as AppRole,
    trialDuration: "7" as TrialDuration,
    trialCustomDate: "",
  });

  const isTrialTenant = tenantType === "trial";

  const fetchTenantInfo = useCallback(async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from("companies")
      .select("tenant_type")
      .eq("id", companyId)
      .maybeSingle();
    setTenantType((data as any)?.tenant_type || "standard");
  }, [companyId]);

  const fetchUsers = useCallback(async () => {
    if (!companyId) { setUsers([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_tenants")
        .select("id, user_id, role, status, profiles:user_id(user_id, name, email, cpf, whatsapp, is_master, trial_expires_at)")
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
        trial_expires_at: ut.profiles?.trial_expires_at || null,
      }));
      setUsers(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchTenantInfo(); fetchUsers(); }, [fetchTenantInfo, fetchUsers]);

  const handleOpenCreate = () => {
    setFormData({ name: "", cpf: "", birth_date: "", email: "", whatsapp: "", role: "leitura", trialDuration: "7", trialCustomDate: "" });
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

    let trial_expires_at: string | null = null;
    if (isTrialTenant) {
      if (formData.trialDuration === "custom" && !formData.trialCustomDate) {
        toast({ title: "Data obrigatória", description: "Selecione a data de expiração personalizada.", variant: "destructive" });
        return;
      }
      trial_expires_at = computeExpiresAt(formData.trialDuration, formData.trialCustomDate);
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
          trial_expires_at,
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
      if (newStatus === "ativo" && companyId) {
        const { data: limitCheck } = await supabase.rpc("check_user_limit", { _tenant_id: companyId });
        const lc = limitCheck as any;
        if (lc && !lc.can_add) {
          toast({ title: "Limite de usuários atingido", description: `Plano ${lc.plan_name}: ${lc.active_users}/${lc.effective_limit} usuários.`, variant: "destructive" });
          return;
        }
      }

      const { error } = await supabase.from("user_tenants").update({ status: newStatus } as any).eq("id", user.id);
      if (error) throw error;

      await supabase.from("profiles")
        .update({ is_active: newStatus === "ativo", status: newStatus === "ativo" ? "ativo" : "bloqueado" })
        .eq("user_id", user.user_id);

      toast({ title: newStatus === "ativo" ? "Ativado" : "Desativado", description: `${user.name} foi ${newStatus === "ativo" ? "ativado" : "desativado"}.` });
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
      toast({ title: "Removido", description: `${user.name} foi removido.` });
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

  const openEditExpiration = (user: TenantUser) => {
    setEditExpUser(user);
    setEditExpDate(user.trial_expires_at ? user.trial_expires_at.split("T")[0] : "");
  };

  const saveExpiration = async () => {
    if (!editExpUser) return;
    setEditExpSaving(true);
    try {
      const newValue = editExpDate ? new Date(editExpDate + "T23:59:59").toISOString() : null;
      const { error } = await supabase
        .from("profiles")
        .update({ trial_expires_at: newValue, is_trial_user: !!newValue } as any)
        .eq("user_id", editExpUser.user_id);
      if (error) throw error;
      toast({ title: "Expiração atualizada", description: newValue ? `Acesso válido até ${new Date(newValue).toLocaleDateString("pt-BR")}.` : "Expiração removida." });
      setEditExpUser(null);
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setEditExpSaving(false);
    }
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

  const expiresPreview = isTrialTenant
    ? computeExpiresAt(formData.trialDuration, formData.trialCustomDate)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou e-mail..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
          {isTrialTenant && (
            <Badge className="bg-amber-500/15 text-amber-600 border border-amber-500/30">Tenant Trial</Badge>
          )}
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
                <TableHead>Expira em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => {
                const exp = formatExpirationStatus(user.trial_expires_at);
                return (
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
                  <TableCell>
                    <button
                      onClick={() => openEditExpiration(user)}
                      className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
                      title="Editar expiração"
                    >
                      <Badge variant={exp.variant} className={exp.className}>
                        {exp.label}
                      </Badge>
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </button>
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
                        <DropdownMenuItem onClick={() => openEditExpiration(user)}>
                          <Clock className="h-4 w-4 mr-2" /> Editar expiração
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
              );})}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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

            {isTrialTenant && (
              <div className="space-y-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <Label className="text-amber-700 dark:text-amber-500">Duração do acesso (Trial)</Label>
                </div>
                <Select value={formData.trialDuration} onValueChange={(v) => setFormData({ ...formData, trialDuration: v as TrialDuration })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 dias</SelectItem>
                    <SelectItem value="15">15 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
                {formData.trialDuration === "custom" && (
                  <Input
                    type="date"
                    value={formData.trialCustomDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setFormData({ ...formData, trialCustomDate: e.target.value })}
                  />
                )}
                {expiresPreview && (
                  <p className="text-xs text-muted-foreground">
                    Acesso válido até: <span className="font-medium text-foreground">{new Date(expiresPreview).toLocaleDateString("pt-BR")}</span>
                  </p>
                )}
              </div>
            )}
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

      {/* Edit Expiration Dialog */}
      <Dialog open={!!editExpUser} onOpenChange={(o) => !o && setEditExpUser(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" /> Editar expiração
            </DialogTitle>
            <DialogDescription>{editExpUser?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Data de expiração</Label>
            <Input type="date" value={editExpDate} onChange={(e) => setEditExpDate(e.target.value)} />
            <p className="text-xs text-muted-foreground">Deixe em branco para acesso sem limite.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditExpUser(null)} disabled={editExpSaving}>Cancelar</Button>
            <Button onClick={saveExpiration} disabled={editExpSaving}>
              {editExpSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
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
            <PermissionsEditor userId={permUserId} isCeoOrMaster={permUserIsCeo} onClose={() => setPermDialogOpen(false)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
