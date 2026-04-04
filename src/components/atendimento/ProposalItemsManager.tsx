import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, PackagePlus, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProposalLineItem {
  catalogId?: string;
  name: string;
  quantity: number;
  unitValue: number;
  discountType: "percent" | "fixed";
  discountValue: number;
  total: number;
}

export interface Installment {
  number: number;
  value: number;
  dueDate: string;
  paymentMethod: string;
}

interface CatalogItem {
  id: string;
  name: string;
  value: number;
}

interface Props {
  servidorId: string;
  items: ProposalLineItem[];
  onChange: (items: ProposalLineItem[]) => void;
  canManageCatalog: boolean;
  paymentFrequency: string;
  onPaymentFrequencyChange: (v: string) => void;
  firstPaymentDate: string;
  onFirstPaymentDateChange: (v: string) => void;
  dueDay: string;
  onDueDayChange: (v: string) => void;
  installments?: Installment[];
  onInstallmentsChange?: (installments: Installment[]) => void;
  numberOfInstallments?: number;
  onNumberOfInstallmentsChange?: (n: number) => void;
}

const fmtCur = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function calcItemTotal(item: ProposalLineItem): number {
  const subtotal = item.quantity * item.unitValue;
  if (item.discountType === "percent") {
    return subtotal * (1 - item.discountValue / 100);
  }
  return Math.max(0, subtotal - item.discountValue);
}

const FREQ_MONTHS: Record<string, number> = {
  mensal: 1,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};

function getDefaultInstallmentCount(freq: string): number {
  switch (freq) {
    case "mensal": return 12;
    case "trimestral": return 4;
    case "semestral": return 2;
    case "anual": return 1;
    case "unica": return 1;
    default: return 12;
  }
}

export function ProposalItemsManager({
  servidorId, items, onChange, canManageCatalog,
  paymentFrequency, onPaymentFrequencyChange,
  firstPaymentDate, onFirstPaymentDateChange,
  dueDay, onDueDayChange,
  installments: externalInstallments,
  onInstallmentsChange,
  numberOfInstallments: externalNumInstallments,
  onNumberOfInstallmentsChange,
}: Props) {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemValue, setNewItemValue] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedCatalogId, setSelectedCatalogId] = useState("");

  const [internalInstallments, setInternalInstallments] = useState<Installment[]>([]);
  const [internalNumInstallments, setInternalNumInstallments] = useState(12);

  const installmentsList = externalInstallments ?? internalInstallments;
  const setInstallmentsList = onInstallmentsChange ?? setInternalInstallments;
  const numInstallments = externalNumInstallments ?? internalNumInstallments;
  const setNumInstallments = onNumberOfInstallmentsChange ?? setInternalNumInstallments;

  useEffect(() => {
    fetchCatalog();
  }, [servidorId]);

  const fetchCatalog = async () => {
    setLoadingCatalog(true);
    const { data } = await supabase
      .from("proposal_catalog_items")
      .select("id, name, value")
      .eq("servidor_id", servidorId)
      .order("name");
    setCatalog((data as CatalogItem[]) || []);
    setLoadingCatalog(false);
  };

  const handleCreateCatalogItem = async () => {
    if (!newItemName.trim() || !newItemValue) return;
    setCreating(true);
    const { error } = await supabase.from("proposal_catalog_items").insert({
      servidor_id: servidorId,
      name: newItemName.trim(),
      value: parseFloat(newItemValue),
    } as any);
    if (error) {
      toast.error("Erro ao criar item");
    } else {
      toast.success("Item criado!");
      setNewItemName("");
      setNewItemValue("");
      setShowCreateItem(false);
      await fetchCatalog();
    }
    setCreating(false);
  };

  const handleAddItem = () => {
    if (!selectedCatalogId) return;
    const catItem = catalog.find(c => c.id === selectedCatalogId);
    if (!catItem) return;
    const newItem: ProposalLineItem = {
      catalogId: catItem.id,
      name: catItem.name,
      quantity: 1,
      unitValue: catItem.value,
      discountType: "percent",
      discountValue: 0,
      total: catItem.value,
    };
    onChange([...items, newItem]);
    setSelectedCatalogId("");
  };

  const updateItem = (index: number, updates: Partial<ProposalLineItem>) => {
    const updated = items.map((item, i) => {
      if (i !== index) return item;
      const merged = { ...item, ...updates };
      merged.total = calcItemTotal(merged);
      return merged;
    });
    onChange(updated);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const totalMensal = items.reduce((sum, it) => sum + it.total, 0);

  const totalContrato = useMemo(() => {
    if (paymentFrequency === "unica") return totalMensal;
    const months = FREQ_MONTHS[paymentFrequency] || 1;
    return totalMensal * months * numInstallments;
  }, [totalMensal, paymentFrequency, numInstallments]);

  const generateInstallments = () => {
    if (!firstPaymentDate || items.length === 0) return;
    const months = FREQ_MONTHS[paymentFrequency] || 1;
    const count = paymentFrequency === "unica" ? 1 : numInstallments;
    const installmentValue = paymentFrequency === "unica"
      ? totalMensal
      : totalMensal * months;

    const newInstallments: Installment[] = [];
    const baseDate = new Date(firstPaymentDate + "T12:00:00");

    for (let i = 0; i < count; i++) {
      const date = new Date(baseDate);
      date.setMonth(date.getMonth() + i * months);
      if (dueDay) {
        const day = Math.min(parseInt(dueDay), 28);
        date.setDate(day);
      }
      newInstallments.push({
        number: i + 1,
        value: Math.round(installmentValue * 100) / 100,
        dueDate: date.toISOString().split("T")[0],
        paymentMethod: "boleto",
      });
    }
    setInstallmentsList(newInstallments);
  };

  useEffect(() => {
    if (firstPaymentDate && items.length > 0) {
      generateInstallments();
    }
  }, [paymentFrequency, firstPaymentDate, dueDay, numInstallments, totalMensal]);

  useEffect(() => {
    setNumInstallments(getDefaultInstallmentCount(paymentFrequency));
  }, [paymentFrequency]);

  const updateInstallment = (index: number, updates: Partial<Installment>) => {
    const updated = installmentsList.map((inst, i) =>
      i === index ? { ...inst, ...updates } : inst
    );
    setInstallmentsList(updated);
  };

  return (
    <div className="space-y-4">
      {/* Items MRR Table */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="font-semibold text-sm flex items-center gap-1.5">
            <PackagePlus className="h-4 w-4 text-primary" /> Itens MRR
          </p>

          {items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2 px-2 font-medium">Ordem</th>
                    <th className="text-left py-2 px-2 font-medium">Qtd.</th>
                    <th className="text-left py-2 px-2 font-medium">Item</th>
                    <th className="text-left py-2 px-2 font-medium">Valor unit.</th>
                    <th className="text-left py-2 px-2 font-medium">Desconto</th>
                    <th className="text-left py-2 px-2 font-medium">Total mensal</th>
                    <th className="text-left py-2 px-2 font-medium">Total contrato</th>
                    <th className="text-left py-2 px-2 font-medium">Cobrança</th>
                    <th className="py-2 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const months = FREQ_MONTHS[paymentFrequency] || 1;
                    const itemContractTotal = paymentFrequency === "unica"
                      ? item.total
                      : item.total * months * numInstallments;
                    return (
                      <tr key={idx} className="border-b border-border/50">
                        <td className="py-2 px-2 text-muted-foreground">{idx + 1}</td>
                        <td className="py-2 px-2">
                          <Input
                            className="h-7 w-16 text-xs"
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                          />
                        </td>
                        <td className="py-2 px-2 font-medium text-foreground max-w-[200px] truncate">{item.name}</td>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">R$</span>
                            <Input
                              className="h-7 w-24 text-xs"
                              type="number"
                              step="0.01"
                              value={item.unitValue}
                              onChange={(e) => updateItem(idx, { unitValue: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1">
                            <Select
                              value={item.discountType}
                              onValueChange={(v) => updateItem(idx, { discountType: v as "percent" | "fixed" })}
                            >
                              <SelectTrigger className="h-7 w-14 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="percent">%</SelectItem>
                                <SelectItem value="fixed">R$</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              className="h-7 w-16 text-xs"
                              type="number"
                              step="0.01"
                              min={0}
                              value={item.discountValue}
                              onChange={(e) => updateItem(idx, { discountValue: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                        </td>
                        <td className="py-2 px-2 font-semibold text-foreground">
                          {fmtCur(item.total)}
                        </td>
                        <td className="py-2 px-2 font-semibold text-foreground">
                          {fmtCur(itemContractTotal)}
                        </td>
                        <td className="py-2 px-2 text-muted-foreground capitalize">
                          {paymentFrequency || "mensal"}
                        </td>
                        <td className="py-2 px-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(idx)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Add item row */}
          <div className="flex items-end gap-3 pt-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Item</Label>
              <Select value={selectedCatalogId} onValueChange={setSelectedCatalogId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {loadingCatalog ? (
                    <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin" /></div>
                  ) : catalog.length === 0 ? (
                    <div className="text-xs text-muted-foreground p-2">Nenhum item cadastrado</div>
                  ) : catalog.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} — {fmtCur(c.value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleAddItem} disabled={!selectedCatalogId}>
              <Plus className="h-3.5 w-3.5" /> Adicionar item
            </Button>
            {canManageCatalog && (
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setShowCreateItem(true)}>
                <PackagePlus className="h-3.5 w-3.5" /> Criar item
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment frequency section */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm flex items-center gap-1.5">
              💳 Forma de pagamento de MRR
            </p>
            {installmentsList.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setInstallmentsList([])}
              >
                <RotateCcw className="h-3 w-3" /> Limpar
              </Button>
            )}
          </div>
          <div className="grid grid-cols-6 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Forma de pagamento</Label>
              <Select value={paymentFrequency} onValueChange={onPaymentFrequencyChange}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="semestral">Semestral</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                  <SelectItem value="unica">Única</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">📅 Data 1ª parcela</Label>
              <Input className="h-8 text-xs" type="date" value={firstPaymentDate} onChange={(e) => onFirstPaymentDateChange(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">📅 Dia de vencimento</Label>
              <Input className="h-8 text-xs" type="number" min={1} max={31} value={dueDay} onChange={(e) => onDueDayChange(e.target.value)} placeholder="10" />
            </div>
            {paymentFrequency !== "unica" && (
              <div className="space-y-1">
                <Label className="text-xs">Nº de parcelas</Label>
                <Input
                  className="h-8 text-xs"
                  type="number"
                  min={1}
                  max={60}
                  value={numInstallments}
                  onChange={(e) => setNumInstallments(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Total mensal (itens)</Label>
              <Input className="h-8 text-xs bg-muted" value={fmtCur(totalMensal)} readOnly />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Total do contrato</Label>
              <Input className="h-8 text-xs bg-muted" value={fmtCur(totalContrato)} readOnly />
            </div>
          </div>

          {/* Editable installments table */}
          {installmentsList.length > 0 && (
            <div className="space-y-2 pt-2">
              <Label className="text-xs font-medium">Quantidade de Parcelas: {installmentsList.length}</Label>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-1.5 px-2 font-medium w-20">Parcela</th>
                      <th className="text-left py-1.5 px-2 font-medium">Valor da parcela</th>
                      <th className="text-left py-1.5 px-2 font-medium">Data de vencimento</th>
                      <th className="text-left py-1.5 px-2 font-medium">Meio de pagamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {installmentsList.map((inst, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="py-1.5 px-2">
                          <Input className="h-7 w-16 text-xs bg-muted" value={inst.number} readOnly />
                        </td>
                        <td className="py-1.5 px-2">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground text-xs">R$</span>
                            <Input
                              className="h-7 w-28 text-xs"
                              type="number"
                              step="0.01"
                              value={inst.value}
                              onChange={(e) => updateInstallment(i, { value: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                        </td>
                        <td className="py-1.5 px-2">
                          <Input
                            className="h-7 text-xs"
                            type="date"
                            value={inst.dueDate}
                            onChange={(e) => updateInstallment(i, { dueDate: e.target.value })}
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <Select value={inst.paymentMethod} onValueChange={(v) => updateInstallment(i, { paymentMethod: v })}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="boleto">Boleto</SelectItem>
                              <SelectItem value="pix">PIX</SelectItem>
                              <SelectItem value="cartao">Cartão</SelectItem>
                              <SelectItem value="transferencia">Transferência</SelectItem>
                              <SelectItem value="dinheiro">Dinheiro</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create catalog item dialog */}
      <Dialog open={showCreateItem} onOpenChange={setShowCreateItem}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar novo item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nome do item *</Label>
              <Input className="h-9 text-sm" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="Ex: Licenciamento - 005 Funcionários" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Valor (R$) *</Label>
              <Input className="h-9 text-sm" type="number" step="0.01" value={newItemValue} onChange={(e) => setNewItemValue(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCreateItem(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleCreateCatalogItem} disabled={!newItemName.trim() || !newItemValue || creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
