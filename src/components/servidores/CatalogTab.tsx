import { useState, useEffect, useCallback } from "react";
import {
  Plus, Search, Package, MoreHorizontal, Pencil, Power, Trash2, Loader2, Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  item_type: string;
  category: string | null;
  value: number;
  recurrence_type: string;
  default_quantity: number;
  is_active: boolean;
  internal_code: string | null;
  internal_notes: string | null;
  created_at: string;
}

const ITEM_TYPES = [
  { value: "servico", label: "Serviço" },
  { value: "produto", label: "Produto" },
  { value: "plano", label: "Plano" },
  { value: "implantacao", label: "Implantação" },
  { value: "setup", label: "Setup" },
  { value: "mensalidade", label: "Mensalidade" },
  { value: "adicional", label: "Adicional" },
  { value: "upsell", label: "Upsell" },
  { value: "taxa", label: "Taxa" },
];

const RECURRENCE_TYPES = [
  { value: "mensal", label: "Mensal" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
  { value: "unico", label: "Único" },
  { value: "personalizado", label: "Personalizado" },
];

const typeLabel = (t: string) => ITEM_TYPES.find(i => i.value === t)?.label || t;
const recurrenceLabel = (r: string) => RECURRENCE_TYPES.find(i => i.value === r)?.label || r;
const fmtCur = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface CatalogTabProps {
  companyId: string | null;
}

const emptyForm = {
  name: "", description: "", item_type: "servico", category: "",
  value: "", recurrence_type: "mensal", default_quantity: "1",
  internal_code: "", internal_notes: "", is_active: true,
};

export default function CatalogTab({ companyId }: CatalogTabProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  const fetchItems = useCallback(async () => {
    if (!companyId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("proposal_catalog_items")
        .select("*")
        .eq("servidor_id", companyId)
        .order("name");
      if (error) throw error;
      setItems((data as any[]) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: CatalogItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      item_type: item.item_type,
      category: item.category || "",
      value: String(item.value),
      recurrence_type: item.recurrence_type,
      default_quantity: String(item.default_quantity),
      internal_code: item.internal_code || "",
      internal_notes: item.internal_notes || "",
      is_active: item.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Campo obrigatório", description: "Informe o nome do item.", variant: "destructive" });
      return;
    }
    if (!companyId) {
      toast({ title: "Tenant não salvo", description: "Salve o tenant antes de cadastrar itens.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        servidor_id: companyId,
        name: formData.name.trim(),
        description: formData.description || null,
        item_type: formData.item_type,
        category: formData.category || null,
        value: parseFloat(formData.value) || 0,
        recurrence_type: formData.recurrence_type,
        default_quantity: parseInt(formData.default_quantity) || 1,
        is_active: formData.is_active,
        internal_code: formData.internal_code || null,
        internal_notes: formData.internal_notes || null,
      };

      if (editingItem) {
        const { error } = await supabase.from("proposal_catalog_items").update(payload).eq("id", editingItem.id);
        if (error) throw error;
        toast({ title: "Item atualizado", description: `"${formData.name}" foi salvo.` });
      } else {
        const { error } = await supabase.from("proposal_catalog_items").insert(payload);
        if (error) throw error;
        toast({ title: "Item criado", description: `"${formData.name}" foi adicionado ao catálogo.` });
      }
      setDialogOpen(false);
      fetchItems();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (item: CatalogItem) => {
    try {
      const { error } = await supabase
        .from("proposal_catalog_items")
        .update({ is_active: !item.is_active } as any)
        .eq("id", item.id);
      if (error) throw error;
      toast({ title: item.is_active ? "Inativado" : "Ativado", description: `"${item.name}" foi ${item.is_active ? "inativado" : "ativado"}.` });
      fetchItems();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (item: CatalogItem) => {
    try {
      const { error } = await supabase.from("proposal_catalog_items").delete().eq("id", item.id);
      if (error) throw error;
      toast({ title: "Excluído", description: `"${item.name}" foi removido.` });
      fetchItems();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const filtered = items.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.internal_code || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === "all" || item.item_type === filterType;
    const matchStatus = filterStatus === "all" ||
      (filterStatus === "active" && item.is_active) ||
      (filterStatus === "inactive" && !item.is_active);
    return matchSearch && matchType && matchStatus;
  });

  if (!companyId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Package className="h-12 w-12 mb-4 opacity-50" />
        <p>Salve o tenant primeiro para gerenciar o catálogo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-widest text-primary mb-1">
          Catálogo de Itens
        </h3>
        <p className="text-sm text-muted-foreground">
          Gerencie os itens disponíveis para propostas e contratos deste tenant.
        </p>
      </div>

      {/* Filters and actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {ITEM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleOpenCreate} className="gap-2 shrink-0 ml-auto">
          <Plus className="h-4 w-4" /> Novo Item
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mb-4 opacity-50" />
          <p>{items.length === 0 ? "Nenhum item cadastrado." : "Nenhum item encontrado com os filtros."}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Recorrência</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id} className={!item.is_active ? "opacity-50" : ""}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{item.name}</p>
                      {item.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{item.description}</p>}
                      {item.internal_code && <p className="text-xs text-muted-foreground font-mono">SKU: {item.internal_code}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{typeLabel(item.item_type)}</Badge>
                  </TableCell>
                  <TableCell className="font-semibold">{fmtCur(item.value)}</TableCell>
                  <TableCell className="text-sm">{recurrenceLabel(item.recurrence_type)}</TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? "outline" : "destructive"} className={item.is_active ? "border-green-500/30 text-green-500" : ""}>
                      {item.is_active ? "Ativo" : "Inativo"}
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
                        <DropdownMenuItem onClick={() => handleOpenEdit(item)}>
                          <Pencil className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleActive(item)}>
                          <Power className="h-4 w-4 mr-2" /> {item.is_active ? "Inativar" : "Ativar"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(item)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Item" : "Novo Item"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Atualize os dados do item do catálogo." : "Cadastre um novo item no catálogo do tenant."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label className="font-semibold">Nome do item *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Plano Premium" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formData.item_type} onValueChange={(v) => setFormData({ ...formData, item_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ITEM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="Ex: Premium" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold">Valor (R$)</Label>
                <Input type="number" step="0.01" min="0" value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} placeholder="0,00" />
              </div>
              <div className="space-y-2">
                <Label>Recorrência</Label>
                <Select value={formData.recurrence_type} onValueChange={(v) => setFormData({ ...formData, recurrence_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RECURRENCE_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Qtd. padrão</Label>
                <Input type="number" min="1" value={formData.default_quantity} onChange={(e) => setFormData({ ...formData, default_quantity: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Código / SKU</Label>
                <Input value={formData.internal_code} onChange={(e) => setFormData({ ...formData, internal_code: e.target.value })} placeholder="Opcional" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Descrição curta do item" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Observação interna</Label>
              <Textarea value={formData.internal_notes} onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })} placeholder="Notas visíveis apenas para administradores" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSubmitting} className="gap-2">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
              {isSubmitting ? "Salvando..." : editingItem ? "Salvar" : "Criar Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
