import { useState } from "react";
import { Crown, Plus, Pencil, Copy, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useBillingPlans, type BillingPlan } from "@/hooks/useBillingPlans";

export default function Planos() {
  const { plans, loading, createPlan, updatePlan, duplicatePlan } = useBillingPlans();
  const [editPlan, setEditPlan] = useState<Partial<BillingPlan> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const openNew = () => {
    setEditPlan({
      name: "", slug: "", description: "", base_user_limit: 3,
      extra_free_users_default: 0, price_per_extra_user: 0,
      monthly_price: 0, yearly_price: 0, is_custom: false, is_active: true, sort_order: plans.length + 1,
    });
    setIsNew(true);
  };

  const openEdit = (p: BillingPlan) => {
    setEditPlan({ ...p });
    setIsNew(false);
  };

  const handleSave = async () => {
    if (!editPlan?.name || !editPlan?.slug) return;
    setSaving(true);
    if (isNew) {
      await createPlan(editPlan);
    } else {
      await updatePlan(editPlan.id!, editPlan);
    }
    setSaving(false);
    setEditPlan(null);
  };

  const toggleActive = async (p: BillingPlan) => {
    await updatePlan(p.id, { is_active: !p.is_active });
  };

  const handleDuplicate = async (p: BillingPlan) => {
    await duplicatePlan(p);
  };

  const set = (field: string, value: any) =>
    setEditPlan(prev => prev ? { ...prev, [field]: value } : null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-primary" /> Gestão de Planos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os planos disponíveis para os tenants da plataforma.
          </p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Novo Plano</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {plans.map(p => (
          <Card key={p.id} className={`relative transition-all ${!p.is_active ? "opacity-60" : ""}`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {p.name}
                  {p.is_custom && <Badge variant="secondary" className="text-xs">Custom</Badge>}
                </span>
                <Badge variant={p.is_active ? "default" : "outline"}>
                  {p.is_active ? "Ativo" : "Inativo"}
                </Badge>
              </CardTitle>
              {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Usuários base:</span> <strong>{p.base_user_limit}</strong></div>
                <div><span className="text-muted-foreground">Extras grátis:</span> <strong>{p.extra_free_users_default}</strong></div>
                <div><span className="text-muted-foreground">R$/extra:</span> <strong>R$ {Number(p.price_per_extra_user).toFixed(2)}</strong></div>
                <div><span className="text-muted-foreground">Mensal:</span> <strong>R$ {Number(p.monthly_price).toFixed(2)}</strong></div>
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                  <Pencil className="h-3 w-3 mr-1" /> Editar
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDuplicate(p)}>
                  <Copy className="h-3 w-3 mr-1" /> Duplicar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => toggleActive(p)}>
                  {p.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Plan Edit/Create Dialog */}
      <Dialog open={!!editPlan} onOpenChange={v => !v && setEditPlan(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isNew ? "Novo Plano" : "Editar Plano"}</DialogTitle>
            <DialogDescription>Configure os parâmetros do plano.</DialogDescription>
          </DialogHeader>
          {editPlan && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nome</Label>
                  <Input value={editPlan.name || ""} onChange={e => set("name", e.target.value)} />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input value={editPlan.slug || ""} onChange={e => set("slug", e.target.value)} placeholder="starter" />
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={editPlan.description || ""} onChange={e => set("description", e.target.value)} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Usuários base</Label>
                  <Input type="number" value={editPlan.base_user_limit ?? 3} onChange={e => set("base_user_limit", parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>Extras grátis (padrão)</Label>
                  <Input type="number" value={editPlan.extra_free_users_default ?? 0} onChange={e => set("extra_free_users_default", parseInt(e.target.value) || 0)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>R$/usuário extra</Label>
                  <Input type="number" step="0.01" value={editPlan.price_per_extra_user ?? 0} onChange={e => set("price_per_extra_user", parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>Preço mensal</Label>
                  <Input type="number" step="0.01" value={editPlan.monthly_price ?? 0} onChange={e => set("monthly_price", parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>Preço anual</Label>
                  <Input type="number" step="0.01" value={editPlan.yearly_price ?? 0} onChange={e => set("yearly_price", parseFloat(e.target.value) || 0)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Ordem de exibição</Label>
                  <Input type="number" value={editPlan.sort_order ?? 0} onChange={e => set("sort_order", parseInt(e.target.value) || 0)} />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={editPlan.is_custom ?? false} onCheckedChange={v => set("is_custom", v)} />
                  <Label>Plano customizado</Label>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={editPlan.is_active ?? true} onCheckedChange={v => set("is_active", v)} />
                <Label>Plano ativo</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlan(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isNew ? "Criar" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
