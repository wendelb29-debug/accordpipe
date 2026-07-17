import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface DeptInfo { id: string; name: string; color: string | null }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string;
  userId: string;
  initialName: string;
  departments: DeptInfo[];
  onSaved?: () => void;
}

const ROLES = [
  { value: "admin", label: "Administrador" },
  { value: "ceo", label: "Supervisor (CEO)" },
  { value: "administrativo", label: "Administrativo" },
  { value: "operador", label: "Atendente" },
  { value: "leitura", label: "Somente leitura" },
];

export function OperatorEditDialog({ open, onOpenChange, tenantId, userId, initialName, departments, onSaved }: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<string>("operador");
  const [selectedDepts, setSelectedDepts] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const parts = (initialName || "").trim().split(" ");
    setFirstName(parts[0] || "");
    setLastName(parts.slice(1).join(" ") || "");
    setSearch("");
    (async () => {
      const { data: ut } = await supabase
        .from("user_tenants")
        .select("role")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .maybeSingle();
      if (ut?.role) setRole(ut.role);

      const { data: uds } = await supabase
        .from("user_departments")
        .select("department_id")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId);
      setSelectedDepts(new Set((uds || []).map((r: any) => r.department_id)));
    })();
  }, [open, tenantId, userId, initialName]);

  const toggle = (id: string) => {
    setSelectedDepts((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      if (fullName) {
        await supabase.from("profiles").update({ name: fullName }).eq("user_id", userId);
      }

      await supabase
        .from("user_tenants")
        .update({ role: role as any })
        .eq("tenant_id", tenantId)
        .eq("user_id", userId);

      // Sync departments: delete existing then insert selected
      await supabase
        .from("user_departments")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("user_id", userId);

      const inserts = Array.from(selectedDepts).map((department_id) => ({
        tenant_id: tenantId,
        user_id: userId,
        department_id,
      }));
      if (inserts.length) {
        const { error } = await supabase.from("user_departments").insert(inserts as any);
        if (error) throw error;
      }

      toast.success("Usuário atualizado");
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const filteredDepts = departments.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
          <DialogDescription>Edite as informações do usuário</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={255} />
            </div>
            <div className="space-y-1.5">
              <Label>Sobrenome</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={255} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Permissão</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue placeholder="Selecione uma permissão" /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground rounded-md bg-muted/40 border border-border p-2">
              Permissão define o que o usuário vê e pode fazer no projeto. Administrador e Supervisor mantêm acesso amplo; Atendente e permissões personalizadas ficam restritas aos departamentos vinculados ao usuário.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Departamentos onde atende como atendente</Label>
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8"
            />
            <div className="max-h-56 overflow-y-auto rounded-md border border-border divide-y divide-border">
              {filteredDepts.length === 0 ? (
                <p className="p-3 text-xs text-muted-foreground text-center">Nenhum departamento cadastrado.</p>
              ) : filteredDepts.map((d) => (
                <label key={d.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted/40">
                  <Checkbox
                    checked={selectedDepts.has(d.id)}
                    onCheckedChange={() => toggle(d.id)}
                  />
                  {d.color && <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />}
                  {d.name}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
