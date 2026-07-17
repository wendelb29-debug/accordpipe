import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Item { id: string; name: string; color: string; department_ids: string[]; is_active: boolean }
interface Dept { id: string; name: string }

export function ClassificacoesPanel() {
  const { activeCompanyId } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [depts, setDepts] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    const [clsRes, dRes] = await Promise.all([
      (supabase as any).from("service_classifications").select("*").eq("tenant_id", activeCompanyId).order("name"),
      supabase.from("tenant_departments").select("id,name").eq("tenant_id", activeCompanyId),
    ]);
    if (clsRes.error) toast.error(`Falha ao carregar classificações: ${clsRes.error.message}`);
    if (dRes.error) toast.error(`Falha ao carregar departamentos: ${dRes.error.message}`);
    setItems((clsRes.data as any) || []); setDepts((dRes.data as any) || []); setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [activeCompanyId]);

  const toggleDept = (id: string) => {
    if (!editing) return;
    const list = editing.department_ids || [];
    setEditing({ ...editing, department_ids: list.includes(id) ? list.filter(x => x !== id) : [...list, id] });
  };

  const save = async () => {
    if (!editing || !activeCompanyId) return;
    if (!editing.name.trim()) { toast.error("Informe o nome da classificação"); return; }
    setSaving(true);
    const payload: any = { tenant_id: activeCompanyId, name: editing.name.trim(), color: editing.color, department_ids: editing.department_ids, is_active: editing.is_active };
    const { error } = editing.id
      ? await (supabase as any).from("service_classifications").update(payload).eq("id", editing.id)
      : await (supabase as any).from("service_classifications").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Salvo"); setOpen(false); setEditing(null); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta classificação?")) return;
    const { error } = await (supabase as any).from("service_classifications").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Classificação removida"); load();
  };

  if (loading) return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setEditing({ id: "", name: "", color: "#6366f1", department_ids: [], is_active: true }); setOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" />Nova classificação
        </Button>
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-6 text-center">Nenhuma classificação criada.</div>
      ) : items.map(c => (
        <div key={c.id} className="flex items-center gap-3 p-3 border rounded-lg">
          <span className="w-3 h-3 rounded-full" style={{ background: c.color }} />
          <div className="flex-1 min-w-0">
            <p className="font-medium">{c.name}</p>
            <div className="flex gap-1 flex-wrap mt-1">
              {(c.department_ids || []).map(id => {
                const d = depts.find(x => x.id === id);
                return d ? <Badge key={id} variant="outline" className="text-xs">{d.name}</Badge> : null;
              })}
              {(c.department_ids || []).length === 0 && <span className="text-xs text-muted-foreground">Todos os departamentos</span>}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => remove(c.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
        </div>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Editar" : "Nova"} classificação</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_80px] gap-3">
                <div><Label>Nome *</Label><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
                <div><Label>Cor</Label><Input type="color" value={editing.color} onChange={e => setEditing({ ...editing, color: e.target.value })} /></div>
              </div>
              <div>
                <Label>Departamentos vinculados</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {depts.map(d => (
                    <button key={d.id} type="button" onClick={() => toggleDept(d.id)}
                      className={`text-xs px-2 py-1 rounded border ${(editing.department_ids || []).includes(d.id) ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
                      {d.name}
                    </button>
                  ))}
                  {depts.length === 0 && <span className="text-xs text-muted-foreground">Nenhum departamento cadastrado.</span>}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={!editing?.name?.trim() || saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
