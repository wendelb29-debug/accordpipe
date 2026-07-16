import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Tag { id: string; name: string; color: string; tenant_id: string }

export function TagsPanel() {
  const { activeCompanyId } = useAuth();
  const [items, setItems] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Tag | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    const { data } = await (supabase as any).from("whatsapp_labels").select("*").eq("tenant_id", activeCompanyId).order("name");
    setItems((data as any) || []); setLoading(false);
  };
  useEffect(() => { load(); }, [activeCompanyId]);

  const save = async () => {
    if (!editing || !activeCompanyId || !editing.name) return;
    const payload: any = { tenant_id: activeCompanyId, name: editing.name, color: editing.color };
    const { error } = editing.id
      ? await supabase.from("whatsapp_labels").update(payload).eq("id", editing.id)
      : await supabase.from("whatsapp_labels").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Salvo"); setOpen(false); setEditing(null); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta tag?")) return;
    const { error } = await supabase.from("whatsapp_labels").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  if (loading) return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setEditing({ id: "", name: "", color: "#6366f1", tenant_id: activeCompanyId! }); setOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" />Nova tag
        </Button>
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-6 text-center">Nenhuma tag criada.</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map(t => (
            <div key={t.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full border" style={{ borderColor: t.color }}>
              <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
              <span className="text-sm">{t.name}</span>
              <button onClick={() => { setEditing(t); setOpen(true); }} className="opacity-60 hover:opacity-100"><Pencil className="w-3 h-3" /></button>
              <button onClick={() => remove(t.id)} className="opacity-60 hover:opacity-100"><Trash2 className="w-3 h-3 text-red-400" /></button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Editar" : "Nova"} tag</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-[1fr_80px] gap-3">
              <div><Label>Nome *</Label><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>Cor</Label><Input type="color" value={editing.color} onChange={e => setEditing({ ...editing, color: e.target.value })} /></div>
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
