import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, CalendarDays } from "lucide-react";
import { toast } from "sonner";

interface Holiday { id: string; name: string; date: string; recurring: boolean; message?: string | null }

export function FeriadosPanel() {
  const { activeCompanyId } = useAuth();
  const [items, setItems] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    const { data } = await (supabase as any).from("service_holidays").select("*").eq("tenant_id", activeCompanyId).order("date");
    setItems((data as any) || []); setLoading(false);
  };
  useEffect(() => { load(); }, [activeCompanyId]);

  const save = async () => {
    if (!editing || !activeCompanyId || !editing.name || !editing.date) return;
    const payload: any = { tenant_id: activeCompanyId, name: editing.name, date: editing.date, recurring: editing.recurring, message: editing.message };
    const { error } = editing.id
      ? await (supabase as any).from("service_holidays").update(payload).eq("id", editing.id)
      : await (supabase as any).from("service_holidays").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Salvo"); setOpen(false); setEditing(null); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este feriado?")) return;
    const { error } = await (supabase as any).from("service_holidays").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  if (loading) return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setEditing({ id: "", name: "", date: "", recurring: true, message: "" }); setOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" />Novo feriado
        </Button>
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-6 text-center">Nenhum feriado cadastrado.</div>
      ) : items.map(h => (
        <div key={h.id} className="flex items-center gap-3 p-3 border rounded-lg">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="font-medium">{h.name} <span className="text-xs text-muted-foreground">· {new Date(h.date).toLocaleDateString("pt-BR")} {h.recurring ? "(recorrente)" : ""}</span></p>
            {h.message && <p className="text-xs text-muted-foreground truncate">{h.message}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={() => { setEditing(h); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => remove(h.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
        </div>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Editar" : "Novo"} feriado</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="Ex.: Natal" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data *</Label><Input type="date" value={editing.date} onChange={e => setEditing({ ...editing, date: e.target.value })} /></div>
                <div className="flex items-end gap-2 pb-1"><Switch checked={editing.recurring} onCheckedChange={v => setEditing({ ...editing, recurring: v })} /><span className="text-sm">Todo ano</span></div>
              </div>
              <div><Label>Mensagem automática</Label><Textarea rows={2} value={editing.message || ""} onChange={e => setEditing({ ...editing, message: e.target.value })} placeholder="Estamos em recesso, retornamos no próximo dia útil." /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={!editing?.name || !editing?.date}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
