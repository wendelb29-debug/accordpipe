import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Info, RotateCw, ArrowUpDown, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Pausa {
  id: string;
  name: string;
  duration: number; // minutos
  autoMessage: boolean;
  message?: string;
}

const storageKey = (tenant: string) => `accord.pauses.${tenant}`;

export function PausasPanel() {
  const { activeCompanyId } = useAuth();
  const [items, setItems] = useState<Pausa[]>([]);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState("10");
  const [sortAsc, setSortAsc] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Pausa | null>(null);

  useEffect(() => {
    if (!activeCompanyId) return;
    try {
      const raw = localStorage.getItem(storageKey(activeCompanyId));
      setItems(raw ? JSON.parse(raw) : []);
    } catch { setItems([]); }
  }, [activeCompanyId]);

  const persist = (next: Pausa[]) => {
    setItems(next);
    if (activeCompanyId) localStorage.setItem(storageKey(activeCompanyId), JSON.stringify(next));
  };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const list = s ? items.filter(i => i.name.toLowerCase().includes(s)) : items;
    return [...list].sort((a, b) => sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
  }, [items, search, sortAsc]);

  const limit = parseInt(pageSize, 10) || 10;
  const visible = filtered.slice(0, limit);

  const openNew = () => { setEditing({ id: "", name: "", duration: 0, autoMessage: false, message: "" }); setOpen(true); };
  const openEdit = (p: Pausa) => { setEditing({ ...p }); setOpen(true); };

  const save = () => {
    if (!editing) return;
    if (!editing.name.trim()) return toast.error("Informe o nome da pausa");
    if (!editing.duration || editing.duration <= 0) return toast.error("Informe a duração em minutos");
    if (editing.id) {
      persist(items.map(i => i.id === editing.id ? editing : i));
    } else {
      persist([...items, { ...editing, id: crypto.randomUUID() }]);
    }
    toast.success("Pausa salva");
    setOpen(false); setEditing(null);
  };

  const remove = (id: string) => {
    if (!confirm("Excluir esta pausa?")) return;
    persist(items.filter(i => i.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" variant="outline" onClick={openNew}
          className="gap-1.5 rounded-lg border-primary/40 text-primary hover:bg-primary/10 hover:text-primary">
          <Plus className="h-3.5 w-3.5" /> Criar pausa
        </Button>
      </div>

      {/* Toolbar */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-end justify-between gap-3 p-4">
          <div className="flex-1 min-w-[240px] max-w-md">
            <Label className="text-xs text-muted-foreground">Pesquisar</Label>
            <div className="relative mt-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder={`${items.length} registros`} className="pl-9 h-9" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setItems([...items])} title="Atualizar">
              <RotateCw className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Mostrar</span>
              <Select value={pageSize} onValueChange={setPageSize}>
                <SelectTrigger className="h-9 w-[80px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["10","25","50","100"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="border-t border-border">
          <div className="grid grid-cols-[1fr_1fr_100px] px-4 py-3 text-xs font-medium text-muted-foreground bg-muted/30">
            <button onClick={() => setSortAsc(v => !v)} className="flex items-center gap-1 hover:text-foreground text-left">
              Nome <ArrowUpDown className="h-3 w-3" />
            </button>
            <div>Duração</div>
            <div className="text-right pr-2">Ações</div>
          </div>
          {visible.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Nenhuma pausa cadastrada.
            </div>
          ) : visible.map(p => (
            <div key={p.id} className="grid grid-cols-[1fr_1fr_100px] px-4 py-3 border-t border-border/60 items-center text-sm">
              <div className="font-medium text-foreground">{p.name}</div>
              <div className="text-muted-foreground">{p.duration} minutos</div>
              <div className="flex items-center justify-end gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(p.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground">
          <span>Mostrando de {visible.length === 0 ? 0 : 1} até {visible.length} de {filtered.length} registros</span>
          <span>Página 1 de 1</span>
          <span className={cn("h-7 w-7 rounded-md border border-border grid place-items-center", "text-foreground")}>1</span>
        </div>
      </div>

      {/* Modal Criar/Editar pausa */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar pausa" : "Criar pausa"}</DialogTitle>
            <DialogDescription>Crie pausas para organizar o atendimento da sua equipe</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm">Nome <span className="text-destructive">*</span></Label>
                <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Insira o nome" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Duração (em minutos) <span className="text-destructive">*</span></Label>
                <Input type="number" min={1} value={editing.duration || ""}
                  onChange={e => setEditing({ ...editing, duration: parseInt(e.target.value, 10) || 0 })}
                  className="mt-1" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editing.autoMessage}
                  onCheckedChange={v => setEditing({ ...editing, autoMessage: v })} />
                <span className="text-sm">Enviar mensagem automática ao cliente</span>
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              {editing.autoMessage && (
                <div>
                  <Label className="text-sm">Mensagem</Label>
                  <Textarea rows={3} value={editing.message || ""}
                    onChange={e => setEditing({ ...editing, message: e.target.value })}
                    placeholder="Mensagem enviada ao cliente durante a pausa" className="mt-1" />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="bg-primary text-primary-foreground">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
