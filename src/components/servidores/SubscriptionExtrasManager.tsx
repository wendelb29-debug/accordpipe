import { useState } from "react";
import { Plus, Trash2, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSubscriptionExtras, type SubscriptionExtra } from "@/hooks/useSubscriptionExtras";

interface Props {
  tenantId: string;
  basePlanPrice: number;
  extraUserCost: number;
}

export function SubscriptionExtrasManager({ tenantId, basePlanPrice, extraUserCost }: Props) {
  const { extras, totalRecorrentes, totalUnicos, addExtra, updateExtra, removeExtra, toggleSelected } = useSubscriptionExtras(tenantId);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", value: 0, type: "recorrente" as "recorrente" | "unico", description: "" });
  const [saving, setSaving] = useState(false);

  const valorMensalTotal = basePlanPrice + extraUserCost + totalRecorrentes;
  const valorInicialTotal = valorMensalTotal + totalUnicos;

  const fmtCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const ok = await addExtra({
      name: form.name,
      value: form.value,
      type: form.type,
      description: form.description || null,
      is_active: true,
      is_selected: true,
    } as any);
    if (ok) {
      setForm({ name: "", value: 0, type: "recorrente", description: "" });
      setShowForm(false);
    }
    setSaving(false);
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Remover este extra?")) return;
    await removeExtra(id);
  };

  const recorrentes = extras.filter(e => e.type === "recorrente");
  const unicos = extras.filter(e => e.type === "unico");

  return (
    <div className="space-y-4">
      {/* Financial Summary */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Resumo Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor base do plano</span>
              <span className="font-medium">{fmtCurrency(basePlanPrice)}</span>
            </div>
            {extraUserCost > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custo extras (usuários)</span>
                <span className="font-medium">{fmtCurrency(extraUserCost)}</span>
              </div>
            )}
            {totalRecorrentes > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Extras recorrentes</span>
                <span className="font-medium text-primary">+ {fmtCurrency(totalRecorrentes)}</span>
              </div>
            )}
            {totalUnicos > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Extras únicos (taxa inicial)</span>
                <span className="font-medium text-amber-600">+ {fmtCurrency(totalUnicos)}</span>
              </div>
            )}
          </div>

          <div className="border-t border-border/50 pt-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-base">Total mensal</span>
              <span className="text-xl font-bold text-primary">{fmtCurrency(valorMensalTotal)}</span>
            </div>
            <div className="text-xs text-muted-foreground text-center">
              {fmtCurrency(basePlanPrice)} + {fmtCurrency(extraUserCost + totalRecorrentes)} = {fmtCurrency(valorMensalTotal)}
            </div>
            {totalUnicos > 0 && (
              <div className="flex justify-between items-center pt-1 border-t border-dashed border-border/30">
                <span className="text-sm text-muted-foreground">Total inicial (1ª cobrança)</span>
                <span className="font-semibold text-amber-600">{fmtCurrency(valorInicialTotal)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Extras List */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Extras do Plano</CardTitle>
            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => setShowForm(!showForm)}>
              <Plus className="h-3.5 w-3.5" />
              Adicionar Extra
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {showForm && (
            <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nome *</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Módulo avançado" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valor (R$) *</Label>
                  <Input type="number" min={0} step={0.01} value={form.value} onChange={e => setForm({ ...form, value: Number(e.target.value) })} className="h-8 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recorrente">Recorrente (mensal)</SelectItem>
                      <SelectItem value="unico">Único (taxa)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Descrição</Label>
                  <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Opcional" className="h-8 text-sm" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={saving || !form.name.trim()}>
                  {saving ? "Salvando..." : "Adicionar"}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </div>
          )}

          {extras.length === 0 && !showForm && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum extra adicionado</p>
          )}

          {recorrentes.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recorrentes</span>
              {recorrentes.map(e => (
                <ExtraRow key={e.id} extra={e} onToggle={toggleSelected} onRemove={handleRemove} fmtCurrency={fmtCurrency} />
              ))}
            </div>
          )}

          {unicos.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Únicos (taxa)</span>
              {unicos.map(e => (
                <ExtraRow key={e.id} extra={e} onToggle={toggleSelected} onRemove={handleRemove} fmtCurrency={fmtCurrency} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ExtraRow({ extra, onToggle, onRemove, fmtCurrency }: {
  extra: SubscriptionExtra;
  onToggle: (id: string, v: boolean) => Promise<boolean>;
  onRemove: (id: string) => void;
  fmtCurrency: (v: number) => string;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-lg border p-2.5 transition-opacity ${!extra.is_selected ? "opacity-50" : ""}`}>
      <Switch
        checked={extra.is_selected}
        onCheckedChange={(v) => onToggle(extra.id, v)}
        className="shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{extra.name}</span>
          <Badge variant="outline" className="text-[10px] shrink-0">
            {extra.type === "recorrente" ? "Mensal" : "Único"}
          </Badge>
        </div>
        {extra.description && (
          <p className="text-xs text-muted-foreground truncate">{extra.description}</p>
        )}
      </div>
      <span className="text-sm font-semibold shrink-0">{fmtCurrency(Number(extra.value))}</span>
      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-destructive/60 hover:text-destructive" onClick={() => onRemove(extra.id)}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
