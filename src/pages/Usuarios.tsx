import { useState, useEffect } from "react";
import { Plus, Search, User, MoreHorizontal, Pencil, Power, Shield, Eye, EyeOff, Building2, Server, CheckCircle, XCircle, Clock, FlaskConical } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ServidoresTab from "@/components/servidores/ServidoresTab";
import ServidoresTesteTab from "@/components/servidores/ServidoresTesteTab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AppRole, useAuth } from "@/contexts/AuthContext";
import { PermissionsEditor } from "@/components/usuarios/PermissionsEditor";

interface UserWithRole {
  id: string;
  user_id: string;
  name: string;
  email: string;
  is_active: boolean;
  is_master: boolean;
  company_id: string | null;
  role: AppRole;
  created_at: string;
  status: string;
}

const roleLabels: Record<AppRole, string> = {
  admin: "Administrador",
  operador: "Operador",
  leitura: "Leitura",
  ceo: "CEO",
  administrativo: "Administrativo",
  financeiro: "Financeiro",
  comercial: "Comercial",
};

const roleBadgeVariants: Record<AppRole, "default" | "secondary" | "outline"> = {
  admin: "default",
  operador: "secondary",
  leitura: "outline",
  ceo: "default",
  administrativo: "secondary",
  financeiro: "secondary",
  comercial: "secondary",
};

export default function Usuarios() {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [permUserId, setPermUserId] = useState<string | null>(null);
  const [permUserName, setPermUserName] = useState("");
  const [permUserIsCeo, setPermUserIsCeo] = useState(false);
  const { toast } = useToast();
  const { isMaster, isCeo, activeCompanyId, profile } = useAuth();
  const [allCompanies, setAllCompanies] = useState<{id: string; nome_fantasia: string | null; razao_social: string; cnpj: string}[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "leitura" as AppRole,
    company_id: "" as string,
  });

  useEffect(() => {
    fetchUsers();
    fetchAllCompanies();
  }, [activeCompanyId]);

  const fetchAllCompanies = async () => {
    const { data } = await supabase
      .from("companies")
      .select("id, nome_fantasia, razao_social, cnpj")
      .is("servidor_id", null)
      .eq("status", "active")
      .order("razao_social");
    setAllCompanies(data || []);
  };

  const fetchUsers = async () => {
    try {
      let query = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      // Filter by servidor (company_id) - non-master sees only their servidor's users
      const servidorId = isMaster ? activeCompanyId : profile?.company_id;
      if (servidorId) {
        query = query.eq("company_id", servidorId);
      }

      const { data: profiles, error: profilesError } = await query;

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.user_id);
        return {
          ...profile,
          role: (userRole?.role as AppRole) || "leitura",
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os usuários.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user?: UserWithRole) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: "",
        role: user.role,
        company_id: user.company_id || "",
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: "",
        email: "",
        password: "",
        role: "leitura",
        company_id: "",
      });
    }
    setDialogOpen(true);
  };

  const handleCreateUser = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos para criar um usuário.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: formData.name,
          },
        },
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          throw new Error("Este e-mail já está cadastrado.");
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error("Erro ao criar usuário.");
      }

      // Update role if not default
      if (formData.role !== "leitura") {
        const { error: roleError } = await supabase
          .from("user_roles")
          .update({ role: formData.role })
          .eq("user_id", authData.user.id);

        if (roleError) throw roleError;
      }

      // Set company_id and status on profile
      const companyId = formData.company_id || (isMaster ? activeCompanyId : profile?.company_id) || null;
      if (companyId) {
        const { error: companyError } = await supabase
          .from("profiles")
          .update({ company_id: companyId, status: "pendente", is_active: false })
          .eq("user_id", authData.user.id);
        if (companyError) throw companyError;
      }

      // Notify admins of the same servidor about pending user
      const servidorId = companyId;
      if (servidorId) {
        const { data: adminProfiles } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("company_id", servidorId)
          .neq("user_id", authData.user.id);
        
        if (adminProfiles) {
          for (const admin of adminProfiles) {
            // Check if admin has admin role
            const { data: roleData } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", admin.user_id)
              .maybeSingle();
            
            if (roleData?.role === "admin") {
              await supabase.rpc("create_notification", {
                _user_id: admin.user_id,
                _title: "Novo usuário pendente",
                _message: `${formData.name} (${formData.email}) aguarda aprovação.`,
                _type: "user_pending",
              });
            }
          }
        }
      }

      toast({
        title: "Usuário criado",
        description: "O usuário foi criado com sucesso. Um e-mail de confirmação foi enviado.",
      });

      setDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar o usuário.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    setIsSubmitting(true);
    try {
      // Update profile with name and company_id
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ name: formData.name, company_id: formData.company_id || null })
        .eq("id", editingUser.id);

      if (profileError) throw profileError;

      // Update role
      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: formData.role })
        .eq("user_id", editingUser.user_id);

      if (roleError) throw roleError;

      toast({
        title: "Usuário atualizado",
        description: "Os dados do usuário foram atualizados.",
      });

      setDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o usuário.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (user: UserWithRole) => {
    if (user.is_master) {
      toast({ title: "Ação não permitida", description: "O usuário master não pode ser desativado.", variant: "destructive" });
      return;
    }
    try {
      const newActive = !user.is_active;
      const newStatus = newActive ? "ativo" : "bloqueado";
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: newActive, status: newStatus })
        .eq("id", user.id);
      if (error) throw error;
      toast({ title: newActive ? "Usuário ativado" : "Usuário desativado", description: `${user.name} foi ${newActive ? "ativado" : "desativado"}.` });
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Não foi possível alterar o status.", variant: "destructive" });
    }
  };

  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approvingUser, setApprovingUser] = useState<UserWithRole | null>(null);
  const [approveRole, setApproveRole] = useState<AppRole>("leitura");

  const openApproveDialog = (user: UserWithRole) => {
    setApprovingUser(user);
    setApproveRole("leitura");
    setApproveDialogOpen(true);
  };

  const handleApproveUser = async () => {
    if (!approvingUser) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "ativo", is_active: true })
        .eq("id", approvingUser.id);
      if (error) throw error;

      // Update role
      await supabase
        .from("user_roles")
        .update({ role: approveRole })
        .eq("user_id", approvingUser.user_id);

      // Notify approved user
      await supabase.rpc("create_notification", {
        _user_id: approvingUser.user_id,
        _title: "Conta aprovada!",
        _message: `Sua conta foi aprovada com o perfil ${roleLabels[approveRole]}. Você já pode acessar o Accord.`,
        _type: "user_approved",
      });

      toast({ title: "Usuário aprovado", description: `${approvingUser.name} foi aprovado como ${roleLabels[approveRole]}.` });
      setApproveDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao aprovar.", variant: "destructive" });
    }
  };

  const handleRejectUser = async (user: UserWithRole) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "bloqueado", is_active: false })
        .eq("id", user.id);
      if (error) throw error;
      toast({ title: "Usuário rejeitado", description: `${user.name} foi rejeitado.` });
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao rejeitar.", variant: "destructive" });
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gestão de Acesso</h1>
        <p className="text-muted-foreground">Gerencie usuários e servidores do sistema</p>
      </div>

      <Tabs defaultValue="usuarios" className="space-y-6">
        <TabsList>
          <TabsTrigger value="usuarios" className="gap-2">
            <User className="h-4 w-4" />
            Usuários
          </TabsTrigger>
          {(isMaster || isCeo) && (
            <TabsTrigger value="servidores" className="gap-2">
              <Server className="h-4 w-4" />
              Servidores
            </TabsTrigger>
          )}
          {(isMaster || isCeo) && (
            <TabsTrigger value="servidores-teste" className="gap-2">
              <FlaskConical className="h-4 w-4" />
              Servidores Teste
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="usuarios">
          <div className="space-y-6">
            {/* Users Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Usuários</h2>
                <p className="text-sm text-muted-foreground">Gerencie os usuários do sistema</p>
              </div>
              <Button className="gap-2" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4" />
                Novo Usuário
              </Button>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou e-mail..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border bg-card shadow-card animate-fade-in">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground">{user.name}</p>
                              {user.is_master && (
                                <Badge variant="outline" className="text-xs">
                                  <Shield className="h-3 w-3 mr-1" />
                                  Master
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {user.company_id
                              ? (allCompanies.find(c => c.id === user.company_id)?.nome_fantasia ||
                                 allCompanies.find(c => c.id === user.company_id)?.razao_social || "—")
                              : user.is_master ? "Todas" : "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={roleBadgeVariants[user.role]}>
                          {roleLabels[user.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.status === "pendente" ? (
                          <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                            <Clock className="h-3 w-3" />
                            Pendente
                          </Badge>
                        ) : user.status === "ativo" ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            {user.status === "bloqueado" ? "Bloqueado" : user.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Permissões"
                            onClick={() => {
                              setPermUserId(user.user_id);
                              setPermUserName(user.name);
                              setPermUserIsCeo(user.role === "ceo" || user.is_master);
                              setPermDialogOpen(true);
                            }}
                          >
                            <Shield className="h-4 w-4 text-primary" />
                          </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {user.status === "pendente" && !user.is_master && (
                              <>
                                <DropdownMenuItem className="gap-2 text-emerald-600" onClick={() => openApproveDialog(user)}>
                                  <CheckCircle className="h-4 w-4" />
                                  Aprovar
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 text-destructive" onClick={() => handleRejectUser(user)}>
                                  <XCircle className="h-4 w-4" />
                                  Rejeitar
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem className="gap-2" onClick={() => handleOpenDialog(user)}>
                              <Pencil className="h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" onClick={() => {
                              setPermUserId(user.user_id);
                              setPermUserName(user.name);
                              setPermUserIsCeo(user.role === "ceo" || user.is_master);
                              setPermDialogOpen(true);
                            }}>
                              <Shield className="h-4 w-4" />
                              Permissões
                            </DropdownMenuItem>
                            {!user.is_master && user.status !== "pendente" && (
                              <DropdownMenuItem className="gap-2" onClick={() => handleToggleActive(user)}>
                                <Power className="h-4 w-4" />
                                {user.is_active ? "Desativar" : "Ativar"}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingUser ? "Editar Usuário" : "Novo Usuário"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingUser
                      ? "Atualize os dados do usuário."
                      : "Preencha os dados para criar um novo usuário."}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Nome completo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="email@exemplo.com"
                      disabled={!!editingUser}
                    />
                  </div>

                  {!editingUser && (
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={(e) =>
                            setFormData({ ...formData, password: e.target.value })
                          }
                          placeholder="Mínimo 6 caracteres"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="company">Empresa vinculada</Label>
                    <Select
                      value={formData.company_id}
                      onValueChange={(value: string) =>
                        setFormData({ ...formData, company_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a empresa" />
                      </SelectTrigger>
                      <SelectContent>
                        {allCompanies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome_fantasia || c.razao_social} - {c.cnpj}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Perfil</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value: AppRole) =>
                        setFormData({ ...formData, role: value })
                      }
                      disabled={editingUser?.is_master}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="ceo">CEO</SelectItem>
                        <SelectItem value="operador">Operador</SelectItem>
                        <SelectItem value="administrativo">Administrativo</SelectItem>
                        <SelectItem value="financeiro">Financeiro</SelectItem>
                        <SelectItem value="comercial">Comercial</SelectItem>
                        <SelectItem value="leitura">Leitura</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={editingUser ? handleUpdateUser : handleCreateUser}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Salvando..." : editingUser ? "Salvar" : "Criar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Approve User Dialog */}
          <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Aprovar Usuário</DialogTitle>
                <DialogDescription>
                  Selecione o tipo de acesso para <strong>{approvingUser?.name}</strong>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Perfil de Acesso</Label>
                  <Select value={approveRole} onValueChange={(v: AppRole) => setApproveRole(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="ceo">CEO</SelectItem>
                      <SelectItem value="operador">Operador</SelectItem>
                      <SelectItem value="administrativo">Administrativo</SelectItem>
                      <SelectItem value="financeiro">Financeiro</SelectItem>
                      <SelectItem value="comercial">Comercial</SelectItem>
                      <SelectItem value="leitura">Leitura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleApproveUser} className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Aprovar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {/* Permissions Dialog */}
          <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Permissões — {permUserName}
                </DialogTitle>
                <DialogDescription>
                  Gerencie as permissões de acesso deste usuário por módulo.
                </DialogDescription>
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
        </TabsContent>

        {(isMaster || isCeo) && (
          <TabsContent value="servidores">
            <ServidoresTab />
          </TabsContent>
        )}
        {(isMaster || isCeo) && (
          <TabsContent value="servidores-teste">
            <ServidoresTesteTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
