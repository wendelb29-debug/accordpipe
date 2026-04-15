import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Copy, Crown, Users, DollarSign } from "lucide-react";
import { useBillingPlans, type BillingPlan } from "@/hooks/useBillingPlans";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPlanSelected?: (planId: string) => void;
}

export function ManagePlansDialog({ open, onOpenChange, onPlanSelected }: Props) {
  const { plans, loading, createPlan, updatePlan, duplicatePlan, fetchPlans } = useBillingPlans();
  const [editing, setEditing] = useState<BillingPlan | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    base_user_limit: 3,
    extra_free_users_default: 2,
    price_per_extra_user: 0,
    monthly_price: 0,
    yearly_price: 0,
    is_custom: false,
    is_active: true,
    sort_order: 0,
  });

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        slug: editing.slug,
        description: editing.description ?? "",
        base_user_limit: editing.base_user_limit,
        extra_free_users_default: editing.extra_free_users_default,
        price_per_extra_user: editing.price_per_extra_user,
        monthly_price: editing.monthly_price,
        yearly_price: editing.yearly_price,
        is_custom: editing.is_custom,
        is_active: editing.is_active,
        sort_order: editing.sort_order,
      });
    }
  }, [editing]);

  const resetForm = () => {
    setForm({ name: "", slug: "", description: "", base_user_limit: 3, extra_free_users_default: 2, price_per_extra_user: 0, monthly_price: 0, yearly_price: 0, is_custom: false, is_active: true, sort_order: plans.length });
    setEditing(null);
    setCreating(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const slug = form.slug || form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (editing) {
      await updatePlan(editing.id, { ...form, slug });
    } else {
      await createPlan({ ...form, slug });
    }
    setSaving(false);
    resetForm();
  };

  const handleDuplicate = async (plan: BillingPlan) => {
    await duplicatePlan(plan);
  };

  const showForm = creating || editing;

  const fmtCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Gerenciar Planos
          </DialogTitle>
        </DialogHeader>

        {!showForm ? (
          <div className="space-y-4">
            <Button onClick={() => setCreating(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Criar Plano
            </Button>

            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : plans.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum plano cadastrado</p>
            ) : (
              <div className="grid gap-3">
                {plans.map((p) => (
                  <Card key={p.id} className={`transition-colors ${!p.is_active ? "opacity-50" : ""}`}>
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{p.name}</span>
                          {p.is_custom && <Badge variant="outline" className="text-[10px]">Custom</Badge>}
                          {!p.is_active && <Badge variant="secondary" className="text-[10px]">Inativo</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{p.base_user_limit} base + {p.extra_free_users_default} grátis</span>
                          <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{fmtCurrency(p.monthly_price)}/mês</span>
                          <span>{fmtCurrency(p.yearly_price)}/ano</span>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(p)} title="Editar">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDuplicate(p)} title="Duplicar">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        {onPlanSelected && (
                          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { onPlanSelected(p.id); onOpenChange(false); }}>
                            Selecionar
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-gerado" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Mensal (R$)</Label>
                <Input type="number" min={0} step={0.01} value={form.monthly_price} onChange={(e) => setForm({ ...form, monthly_price: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Valor Anual (R$)</Label>
                <Input type="number" min={0} step={0.01} value={form.yearly_price} onChange={(e) => setForm({ ...form, yearly_price: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Usuários Base</Label>
                <Input type="number" min={1} value={form.base_user_limit} onChange={(e) => setForm({ ...form, base_user_limit: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Extras Grátis</Label>
                <Input type="number" min={0} value={form.extra_free_users_default} onChange={(e) => setForm({ ...form, extra_free_users_default: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Valor por Extra (R$)</Label>
                <Input type="number" min={0} step={0.01} value={form.price_per_extra_user} onChange={(e) => setForm({ ...form, price_per_extra_user: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ordem de Exibição</Label>
                <Input type="number" min={0} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
              <div className="flex items-center gap-6 pt-6">
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Label>Ativo</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_custom} onCheckedChange={(v) => setForm({ ...form, is_custom: v })} />
                  <Label>Custom</Label>
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={resetForm}>Voltar</Button>
              <Button onClick={handleSave} disabled={saving || !form.name}>
                {saving ? "Salvando..." : editing ? "Salvar Plano" : "Criar Plano"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
