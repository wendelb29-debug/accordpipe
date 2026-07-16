import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Dept {
  id: string; name: string; description?: string | null; color?: string | null;
  icon?: string | null; routing_method: string; auto_response_message?: string | null;
  is_active: boolean; position: number;
}

const ROUTING = [
  { v: "load-balanced", label: "Balanceado (round-robin)" },
  { v: "random", label: "Aleatório" },
  { v: "manual", label: "Manual" },
];

export function DepartamentosPanel() {
  const { activeCompanyId } = useAuth();
  const [items, setItems] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Dept | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    const { data } = await supabase.from("tenant_departments").select("*").eq("tenant_id", activeCompanyId).order("position");
    setItems((data as any) || []); setLoading(false);
  };
  useEffect(() => { load(); }, [activeCompanyId]);

  const startNew = () => { setEditing({ id: "", name: "", color: "#6366f1", icon: "🏪", routing_method: "load-balanced", is_active: true, position: items.length } as Dept); setOpen(true); };
  const startEdit = (d: Dept) => { setEditing({ ...d }); setOpen(true); };

  const remove = async (id: string) => {
    if (!confirm("Excluir este departamento?")) return;
    const { error } = await supabase.from("tenant_departments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Departamento removido"); load();
  };

  const save = async () => {
    if (!editing || !activeCompanyId) return;
    const payload: any = { tenant_id: activeCompanyId, name: editing.name, description: editing.description, color: editing.color, icon: editing.icon, routing_method: editing.routing_method, auto_response_message: editing.auto_response_message, is_active: editing.is_active, position: editing.position };
    const { error } = editing.id
      ? await supabase.from("tenant_departments").update(payload).eq("id", editing.id)
      : await supabase.from("tenant_departments").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Salvo"); setOpen(false); setEditing(null); load();
  };

  if (loading) return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button size="sm" onClick={startNew} className="gap-2"><Plus className="w-4 h-4" />Novo departamento</Button></div>
      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-6 text-center">Nenhum departamento criado.</div>
      ) : items.map(d => (
        <div key={d.id} className="flex items-center gap-3 p-3 border rounded-lg">
          <span className="text-xl">{d.icon || "🏪"}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{d.name}</p>
              <span className="w-3 h-3 rounded-full" style={{ background: d.color || "#6366f1" }} />
              {!d.is_active && <span className="text-xs text-muted-foreground">(inativo)</span>}
            </div>
            <p className="text-xs text-muted-foreground truncate">{d.description || "—"} · {ROUTING.find(r => r.v === d.routing_method)?.label}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => startEdit(d)}><Pencil className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => remove(d.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
        </div>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar" : "Novo"} departamento</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-[80px_1fr] gap-3">
                <div><Label>Ícone</Label><Input value={editing.icon || ""} onChange={e => setEditing({ ...editing, icon: e.target.value })} maxLength={2} /></div>
                <div><Label>Nome *</Label><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
              </div>
              <div><Label>Descrição</Label><Textarea rows={2} value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Cor</Label><Input type="color" value={editing.color || "#6366f1"} onChange={e => setEditing({ ...editing, color: e.target.value })} /></div>
                <div>
                  <Label>Distribuição</Label>
                  <Select value={editing.routing_method} onValueChange={(v) => setEditing({ ...editing, routing_method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ROUTING.map(r => <SelectItem key={r.v} value={r.v}>{r.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Mensagem automática de entrada</Label><Textarea rows={2} value={editing.auto_response_message || ""} onChange={e => setEditing({ ...editing, auto_response_message: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={!editing?.name}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
