import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  companyId: string;
  isAdmin: boolean;
}

const ICONS = ["🏪", "🛠️", "💰", "📊", "📞", "💬", "🎯", "🏢"];

export function DepartmentManagement({ companyId, isAdmin }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [usersOpenId, setUsersOpenId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    icon: "🏪",
    routing_method: "load-balanced",
    auto_response_message: "",
  });

  const { data: departments, isLoading } = useQuery({
    queryKey: ["tenant-departments", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_departments")
        .select("*")
        .eq("tenant_id", companyId)
        .order("position");
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tenant_departments").insert({
        tenant_id: companyId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        icon: form.icon,
        routing_method: form.routing_method,
        auto_response_message: form.auto_response_message.trim() || null,
        position: departments?.length || 0,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-departments", companyId] });
      setForm({ name: "", description: "", icon: "🏪", routing_method: "load-balanced", auto_response_message: "" });
      setOpen(false);
      toast.success("Departamento criado!");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao criar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenant_departments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-departments", companyId] });
      toast.success("Departamento removido");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao remover"),
  });

  if (!isAdmin) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Departamentos</h3>
          <p className="text-xs text-muted-foreground">Crie e gerencie os departamentos para roteamento automático.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Novo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Departamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Nome</label>
                <Input
                  placeholder="Ex: Vendas"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Descrição</label>
                <Input
                  placeholder="Opcional"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Ícone</label>
                <div className="flex flex-wrap gap-1">
                  {ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setForm({ ...form, icon })}
                      className={`text-xl p-2 rounded-md transition ${
                        form.icon === icon ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-muted"
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Método de Roteamento</label>
                <Select
                  value={form.routing_method}
                  onValueChange={(v) => setForm({ ...form, routing_method: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="load-balanced">Balanceamento de carga</SelectItem>
                    <SelectItem value="random">Aleatório</SelectItem>
                    <SelectItem value="manual">Manual (primeiro disponível)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Resposta Automática (opcional)</label>
                <Textarea
                  rows={2}
                  placeholder="Mensagem enviada quando contato é roteado para este dept"
                  value={form.auto_response_message}
                  onChange={(e) => setForm({ ...form, auto_response_message: e.target.value })}
                />
              </div>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !form.name.trim()}
                className="w-full"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Criar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : departments && departments.length > 0 ? (
        <div className="space-y-2">
          {departments.map((dept: any, idx: number) => (
            <div
              key={dept.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{dept.icon}</span>
                <div>
                  <p className="text-sm font-medium">
                    <span className="text-muted-foreground mr-1">{idx + 1}.</span>
                    {dept.name}
                  </p>
                  {dept.description && (
                    <p className="text-xs text-muted-foreground">{dept.description}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Dialog
                  open={usersOpenId === dept.id}
                  onOpenChange={(o) => setUsersOpenId(o ? dept.id : null)}
                >
                  <DialogTrigger asChild>
                    <Button variant="secondary" size="sm" className="h-8 gap-1.5">
                      <Users className="h-3.5 w-3.5" /> Usuários
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Usuários em {dept.name}</DialogTitle>
                    </DialogHeader>
                    <AssignUsersPanel departmentId={dept.id} companyId={companyId} />
                  </DialogContent>
                </Dialog>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    if (confirm(`Remover ${dept.name}?`)) deleteMutation.mutate(dept.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
          Nenhum departamento criado ainda.
        </div>
      )}
    </div>
  );
}

function AssignUsersPanel({ departmentId, companyId }: { departmentId: string; companyId: string }) {
  const qc = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["dept-tenant-users", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: assigned } = useQuery({
    queryKey: ["dept-assigned", departmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_departments")
        .select("user_id")
        .eq("department_id", departmentId);
      if (error) throw error;
      return new Set((data || []).map((d: any) => d.user_id));
    },
  });

  const toggle = useMutation({
    mutationFn: async (userId: string) => {
      const isAssigned = assigned?.has(userId);
      if (isAssigned) {
        const { error } = await supabase
          .from("user_departments")
          .delete()
          .eq("user_id", userId)
          .eq("department_id", departmentId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_departments").insert({
          user_id: userId,
          department_id: departmentId,
          tenant_id: companyId,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dept-assigned", departmentId] }),
    onError: (e: any) => toast.error(e.message || "Erro"),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-96 overflow-y-auto">
      {users?.map((u: any) => (
        <label
          key={u.user_id}
          className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
        >
          <input
            type="checkbox"
            checked={assigned?.has(u.user_id) || false}
            onChange={() => toggle.mutate(u.user_id)}
            className="rounded"
          />
          <span className="text-sm flex-1">{u.name || u.email}</span>
          {u.name && <span className="text-xs text-muted-foreground">{u.email}</span>}
        </label>
      ))}
      {users?.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhum usuário ativo</p>
      )}
    </div>
  );
}
