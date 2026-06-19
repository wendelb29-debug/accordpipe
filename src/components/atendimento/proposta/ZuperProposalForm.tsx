import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, Link2, FileDown, Save, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { RichTextEditor } from "./RichTextEditor";
import type { ProposalLineItem, ProposalRecord, ProposalTemplate, PSPayment, MRRPayment, ProposalItemType } from "./types";
import { calcItemTotal, calcTotals, fmtCur, generatePSInstallments, randomPublicToken } from "./utils";

interface CatalogItem {
  id: string; name: string; value: number; description: string | null;
  item_type: string; recurrence_type: string; is_active: boolean;
}

interface CompanyInfo {
  razao_social: string; nome_fantasia: string | null; cnpj: string;
  responsavel: string | null; email: string | null; telefone: string | null;
  logo_url: string | null;
}

interface LeadLite {
  id: string; name: string | null; email?: string | null;
  phone?: string | null; company_name?: string | null;
  servidor_id: string;
}

interface Props {
  lead: LeadLite;
  servidorId: string;
  existingProposal?: ProposalRecord | null;
  initialTemplate?: ProposalTemplate | null;
  onClose: () => void;
  onSaved: (p: ProposalRecord) => void;
}

export function ZuperProposalForm({ lead, servidorId, existingProposal, initialTemplate, onClose, onSaved }: Props) {
  const { user, profile } = useAuth() as any;
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string>(existingProposal?.template_id || initialTemplate?.id || "");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [qtyInput, setQtyInput] = useState(1);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>("");

  // Form state
  const [title, setTitle] = useState(existingProposal?.titulo || "Proposta Comercial");
  const [version, setVersion] = useState<number>(existingProposal?.version || 1);
  const [clientOC, setClientOC] = useState(existingProposal?.client_oc || "");
  const [currency] = useState(existingProposal?.currency || "BRL");
  const [createdDate, setCreatedDate] = useState(existingProposal?.created_date || new Date().toISOString().split("T")[0]);
  const [validityDays, setValidityDays] = useState<number>(existingProposal?.validity_days || initialTemplate?.default_validity_days || 30);
  const [introHtml, setIntroHtml] = useState(existingProposal?.intro_html || initialTemplate?.intro_html || "");
  const [observations, setObservations] = useState(existingProposal?.observations || initialTemplate?.observations || "");

  const [items, setItems] = useState<ProposalLineItem[]>([]);

  const [psPayment, setPsPayment] = useState<PSPayment>(
    (existingProposal?.ps_payment as PSPayment) || {
      method: "pix", mode: "vista", days_to_first: 0, installments: [],
    }
  );
  const [mrrPayment, setMrrPayment] = useState<MRRPayment>(
    (existingProposal?.mrr_payment as MRRPayment) || {
      method: "boleto", due_day: 10,
      first_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      num_installments: 12,
    }
  );

  // Load company + catalog + existing items
  useEffect(() => {
    (async () => {
      const { data: comp } = await supabase
        .from("companies")
        .select("razao_social, nome_fantasia, cnpj, responsavel, email, telefone, logo_url")
        .eq("id", servidorId).single();
      setCompany(comp as any);

      const { data: cat } = await supabase
        .from("proposal_catalog_items")
        .select("id, name, value, description, item_type, recurrence_type, is_active")
        .eq("servidor_id", servidorId).eq("is_active", true).order("name");
      setCatalog((cat as any) || []);

      const { data: tpls } = await supabase
        .from("proposal_templates")
        .select("*")
        .eq("servidor_id", servidorId)
        .eq("is_active", true)
        .order("name");
      setTemplates((tpls as any) || []);

      if (existingProposal?.id) {
        const { data: lines } = await supabase
          .from("proposal_line_items")
          .select("*").eq("proposal_id", existingProposal.id)
          .order("position");
        setItems((lines as any) || []);
      }
    })();
  }, [servidorId, existingProposal?.id]);

  const totals = useMemo(() => calcTotals(items, mrrPayment), [items, mrrPayment]);

  const hasPS = useMemo(() => items.some(i => i.item_type === "servico"), [items]);
  const hasMRR = useMemo(() => items.some(i => i.item_type === "mrr"), [items]);

  // Regenerate PS installments when totals or mode change
  useEffect(() => {
    if (!hasPS) return;
    const installments = generatePSInstallments(totals.ps_total, psPayment);
    setPsPayment(p => ({ ...p, installments }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totals.ps_total, psPayment.mode, psPayment.days_to_first, psPayment.method, hasPS]);

  // ----- Items handlers -----
  const filteredCatalog = catalog.filter(c =>
    !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addItemFromCatalog = () => {
    const cat = catalog.find(c => c.id === selectedCatalogId);
    if (!cat) return;
    const itemType: ProposalItemType = (cat.item_type === "mrr" || cat.recurrence_type === "mensal" || cat.recurrence_type === "recorrente") ? "mrr" : "servico";
    const qty = Math.max(1, qtyInput || 1);
    const newItem: ProposalLineItem = {
      catalog_item_id: cat.id,
      name: cat.name,
      description: cat.description,
      item_type: itemType,
      quantity: qty,
      unit_value: cat.value,
      discount_type: "percent",
      discount_value: 0,
      total: cat.value * qty,
      position: items.length,
    };
    setItems(prev => [...prev, newItem]);
    setSelectedCatalogId("");
    setSearchTerm("");
    setQtyInput(1);
  };

  const updateItem = (idx: number, patch: Partial<ProposalLineItem>) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const merged = { ...it, ...patch };
      merged.total = calcItemTotal(merged);
      return merged;
    }));
  };

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  // ----- Save -----
  const handleSave = async (): Promise<ProposalRecord | null> => {
    if (!title.trim()) { toast.error("Informe o título da proposta"); return null; }
    if (items.length === 0) { toast.error("Adicione pelo menos um item"); return null; }
    setSaving(true);
    try {
      let controlCode = existingProposal?.control_code;
      let publicToken = existingProposal?.public_token;
      if (!controlCode) {
        const { data: codeData } = await supabase.rpc("next_proposal_control_code", { _servidor_id: servidorId });
        controlCode = (codeData as string) || null;
      }
      if (!publicToken) publicToken = randomPublicToken();

      const payload: any = {
        servidor_id: servidorId,
        lead_id: lead.id,
        titulo: title,
        descricao: introHtml,
        valor: totals.grand_total,
        status: existingProposal?.status === "aprovada" ? "aprovada" : "aberta",
        version,
        control_code: controlCode,
        client_oc: clientOC || null,
        currency,
        created_date: createdDate,
        validity_days: validityDays,
        intro_html: introHtml,
        observations: observations || null,
        ps_payment: hasPS ? psPayment : {},
        mrr_payment: hasMRR ? mrrPayment : {},
        totals,
        public_token: publicToken,
        template_id: existingProposal?.template_id || initialTemplate?.id || null,
        created_by_user_id: user?.id,
        created_by_name: profile?.name || user?.email,
      };

      let proposalId = existingProposal?.id;
      if (proposalId) {
        const { error } = await supabase.from("proposals").update(payload).eq("id", proposalId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("proposals").insert(payload).select().single();
        if (error) throw error;
        proposalId = (data as any).id;
      }

      // Replace line items
      await supabase.from("proposal_line_items").delete().eq("proposal_id", proposalId);
      const lineRows = items.map((it, idx) => ({
        proposal_id: proposalId,
        servidor_id: servidorId,
        catalog_item_id: it.catalog_item_id || null,
        name: it.name,
        description: it.description || null,
        item_type: it.item_type,
        quantity: it.quantity,
        unit_value: it.unit_value,
        discount_type: it.discount_type,
        discount_value: it.discount_value,
        total: it.total,
        position: idx,
      }));
      if (lineRows.length > 0) {
        const { error: liErr } = await supabase.from("proposal_line_items").insert(lineRows);
        if (liErr) throw liErr;
      }

      const { data: full } = await supabase.from("proposals").select("*").eq("id", proposalId).single();
      toast.success("Proposta salva!");
      onSaved(full as any);
      return full as any;
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao salvar proposta");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleCopyPublicLink = async () => {
    let token = existingProposal?.public_token;
    if (!token) {
      const saved = await handleSave();
      if (!saved) return;
      token = saved.public_token!;
    }
    const url = `${window.location.origin}/p/proposta/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link público copiado!");
  };

  const handleGeneratePdf = async () => {
    const saved = existingProposal || await handleSave();
    if (!saved) return;
    toast.info("PDF: implementação básica — use a visualização pública por enquanto.");
    window.open(`/p/proposta/${(saved as any).public_token}?print=1`, "_blank");
  };

  return (
    <div className="flex flex-col bg-background h-full min-h-0">
      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-5 p-4 pb-24">

          {/* Resumo Financeiro */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">P&amp;S</p>
                <p className="text-base font-semibold mt-0.5">{fmtCur(totals.ps_total)}</p>
                <p className="text-[11px] text-muted-foreground">{items.filter(i => i.item_type === "servico").length} item(ns)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">MRR</p>
                <p className="text-base font-semibold mt-0.5">{fmtCur(totals.mrr_monthly)}<span className="text-xs text-muted-foreground font-normal">/mês</span></p>
                <p className="text-[11px] text-muted-foreground">{items.filter(i => i.item_type === "mrr").length} item(ns)</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Geral</p>
                <p className="text-base font-semibold mt-0.5">{fmtCur(totals.grand_total)}</p>
                <p className="text-[11px] text-muted-foreground italic">Valores totais da proposta</p>
              </CardContent>
            </Card>
          </div>

          {/* Header section */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-4">
                {company?.logo_url ? (
                  <img src={company.logo_url} alt="" className="h-16 w-16 rounded-md object-contain bg-muted" />
                ) : (
                  <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">Logo</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{company?.razao_social || "—"}</p>
                  <p className="text-xs text-muted-foreground">CNPJ: {company?.cnpj || "—"}</p>
                  <p className="text-xs text-muted-foreground">Resp.: {company?.responsavel || "—"} · {company?.email || ""} · {company?.telefone || ""}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 w-64">
                  <div>
                    <Label className="text-xs">Versão</Label>
                    <Input type="number" min={1} value={version} onChange={e => setVersion(parseInt(e.target.value) || 1)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Sigla</Label>
                    <Input value={existingProposal?.control_code || "(será gerada)"} disabled className="h-8 text-xs" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Nº OC cliente (opcional)</Label>
                    <Input value={clientOC} onChange={e => setClientOC(e.target.value)} className="h-8 text-xs" placeholder="—" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client + Proposal data */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="font-semibold text-sm">Dados do Cliente</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nome</Label>
                  <Input value={lead.name || ""} disabled className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Telefone</Label>
                  <Input value={lead.phone || ""} disabled className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs">E-mail</Label>
                  <Input value={lead.email || ""} disabled className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Empresa</Label>
                  <Input value={lead.company_name || ""} disabled className="h-8 text-xs" />
                </div>
              </div>
              <p className="font-semibold text-sm pt-2">Dados da Proposta</p>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Moeda</Label>
                  <Input value="Real Brasileiro (R$)" disabled className="h-8 text-xs" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Título</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Data criação</Label>
                  <Input type="date" value={createdDate} onChange={e => setCreatedDate(e.target.value)} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Validade (dias)</Label>
                  <Input type="number" min={1} value={validityDays} onChange={e => setValidityDays(parseInt(e.target.value) || 30)} className="h-8 text-xs" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Introdução */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="font-semibold text-sm">Introdução</p>
              <RichTextEditor
                value={introHtml}
                onChange={setIntroHtml}
                placeholder="Texto de introdução da proposta..."
              />
            </CardContent>
          </Card>

          {/* Itens da proposta */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="font-semibold text-sm">Itens da Proposta</p>

              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar produtos/serviços..."
                    className="h-8 text-xs pl-8"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Produto/Serviço</Label>
                    <Select value={selectedCatalogId} onValueChange={setSelectedCatalogId}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder={catalog.length === 0 ? "Cadastre itens no catálogo" : `${filteredCatalog.length} item(ns) disponível(is)`} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredCatalog.length === 0 && (
                          <div className="px-2 py-3 text-xs text-muted-foreground text-center">Nenhum item encontrado</div>
                        )}
                        {filteredCatalog.map(c => {
                          const tipo: ProposalItemType = (c.item_type === "mrr" || c.recurrence_type === "mensal" || c.recurrence_type === "recorrente") ? "mrr" : "servico";
                          return (
                            <SelectItem key={c.id} value={c.id}>
                              <span className="flex items-center gap-2">
                                <Badge variant="outline" className={`text-[10px] ${tipo === "mrr" ? "border-blue-500/40 text-blue-600" : "border-emerald-500/40 text-emerald-600"}`}>
                                  {tipo === "mrr" ? "MRR" : "Serviço"}
                                </Badge>
                                <span>{c.name}</span>
                                <span className="text-muted-foreground">— {fmtCur(c.value)}</span>
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-20">
                    <Label className="text-xs">Qtd</Label>
                    <Input type="number" min={1} value={qtyInput} onChange={e => setQtyInput(parseInt(e.target.value) || 1)} className="h-8 text-xs" />
                  </div>
                  <Button size="sm" className="h-8 gap-1" onClick={addItemFromCatalog} disabled={!selectedCatalogId}>
                    <Plus className="h-3.5 w-3.5" /> Adicionar Item
                  </Button>
                </div>
              </div>

              {items.length > 0 && (
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="text-left p-2">Item</th>
                        <th className="text-left p-2 w-16">Qtd</th>
                        <th className="text-left p-2 w-28">Desconto</th>
                        <th className="text-left p-2 w-28">Valor unit.</th>
                        <th className="text-left p-2 w-28">Total</th>
                        <th className="p-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => (
                        <tr key={idx} className="border-t border-border">
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`text-[10px] ${it.item_type === "mrr" ? "border-blue-500/40 text-blue-600" : "border-emerald-500/40 text-emerald-600"}`}>
                                {it.item_type === "mrr" ? "MRR" : "Serviço"}
                              </Badge>
                              <span className="font-medium">{it.name}</span>
                            </div>
                          </td>
                          <td className="p-2">
                            <Input type="number" min={1} value={it.quantity} onChange={e => updateItem(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })} className="h-7 text-xs w-14" />
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-1">
                              <Select value={it.discount_type} onValueChange={v => updateItem(idx, { discount_type: v as any })}>
                                <SelectTrigger className="h-7 w-12 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="percent">%</SelectItem>
                                  <SelectItem value="fixed">R$</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input type="number" min={0} step="0.01" value={it.discount_value} onChange={e => updateItem(idx, { discount_value: parseFloat(e.target.value) || 0 })} className="h-7 w-16 text-xs" />
                            </div>
                          </td>
                          <td className="p-2">
                            <Input type="number" min={0} step="0.01" value={it.unit_value} onChange={e => updateItem(idx, { unit_value: parseFloat(e.target.value) || 0 })} className="h-7 w-24 text-xs" />
                          </td>
                          <td className="p-2 font-semibold">{fmtCur(it.total)}</td>
                          <td className="p-2">
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeItem(idx)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagamento P&S */}
          {hasPS && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="font-semibold text-sm">Pagamento P&amp;S</p>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Meio de Pagamento</Label>
                    <Select value={psPayment.method} onValueChange={v => setPsPayment(p => ({ ...p, method: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="boleto">Boleto</SelectItem>
                        <SelectItem value="cartao">Cartão</SelectItem>
                        <SelectItem value="ted">TED</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Forma</Label>
                    <Select value={psPayment.mode} onValueChange={v => setPsPayment(p => ({ ...p, mode: v as any, installments: v === "vista" ? [] : (p.installments.length ? p.installments : Array(2).fill(null).map((_, i) => ({ number: i + 1, date: "", value: 0, method: p.method }))) }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vista">À Vista</SelectItem>
                        <SelectItem value="parcelado">Parcelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Dias 1ª parcela</Label>
                    <Input type="number" min={0} value={psPayment.days_to_first} onChange={e => setPsPayment(p => ({ ...p, days_to_first: parseInt(e.target.value) || 0 }))} className="h-8 text-xs" />
                  </div>
                  {psPayment.mode === "parcelado" && (
                    <div>
                      <Label className="text-xs">Nº parcelas</Label>
                      <Input type="number" min={1} max={36} value={psPayment.installments.length || 2} onChange={e => {
                        const n = Math.max(1, Math.min(36, parseInt(e.target.value) || 1));
                        setPsPayment(p => ({ ...p, installments: Array(n).fill(null).map((_, i) => p.installments[i] || { number: i + 1, date: "", value: 0, method: p.method }) }));
                      }} className="h-8 text-xs" />
                    </div>
                  )}
                </div>

                {psPayment.installments.length > 0 && (
                  <div className="overflow-x-auto rounded-md border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/40 text-muted-foreground">
                        <tr>
                          <th className="text-left p-2 w-20">Parcela</th>
                          <th className="text-left p-2">Data</th>
                          <th className="text-left p-2">Valor</th>
                          <th className="text-left p-2">Meio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {psPayment.installments.map((inst, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="p-2">{inst.number}</td>
                            <td className="p-2">
                              <Input type="date" value={inst.date} onChange={e => {
                                const arr = [...psPayment.installments]; arr[i] = { ...inst, date: e.target.value };
                                setPsPayment(p => ({ ...p, installments: arr }));
                              }} className="h-7 text-xs" />
                            </td>
                            <td className="p-2">
                              <Input type="number" step="0.01" value={inst.value} onChange={e => {
                                const arr = [...psPayment.installments]; arr[i] = { ...inst, value: parseFloat(e.target.value) || 0 };
                                setPsPayment(p => ({ ...p, installments: arr }));
                              }} className="h-7 text-xs w-28" />
                            </td>
                            <td className="p-2">
                              <Select value={inst.method} onValueChange={v => {
                                const arr = [...psPayment.installments]; arr[i] = { ...inst, method: v };
                                setPsPayment(p => ({ ...p, installments: arr }));
                              }}>
                                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pix">PIX</SelectItem>
                                  <SelectItem value="boleto">Boleto</SelectItem>
                                  <SelectItem value="cartao">Cartão</SelectItem>
                                  <SelectItem value="ted">TED</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t border-border bg-muted/30 font-semibold">
                          <td colSpan={2} className="p-2 text-right">Total Geral</td>
                          <td className="p-2" colSpan={2}>{fmtCur(totals.ps_total)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Pagamento MRR */}
          {hasMRR && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="font-semibold text-sm">Pagamento MRR</p>
                <div className="grid grid-cols-5 gap-3">
                  <div>
                    <Label className="text-xs">Meio de Pagamento</Label>
                    <Select value={mrrPayment.method} onValueChange={v => setMrrPayment(p => ({ ...p, method: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="boleto">Boleto</SelectItem>
                        <SelectItem value="cartao">Cartão</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Dia do Vencimento</Label>
                    <Select value={String(mrrPayment.due_day)} onValueChange={v => setMrrPayment(p => ({ ...p, due_day: parseInt(v) }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                          <SelectItem key={d} value={String(d)}>Dia {d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Data 1ª Parcela</Label>
                    <Input type="date" value={mrrPayment.first_date} onChange={e => setMrrPayment(p => ({ ...p, first_date: e.target.value }))} className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Nº Parcelas</Label>
                    <Input type="number" min={1} max={60} value={mrrPayment.num_installments} onChange={e => setMrrPayment(p => ({ ...p, num_installments: parseInt(e.target.value) || 1 }))} className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Total mensal</Label>
                    <Input value={fmtCur(totals.mrr_monthly)} disabled className="h-8 text-xs bg-muted" />
                  </div>
                  <div className="col-span-5">
                    <Label className="text-xs">Total do contrato</Label>
                    <Input value={fmtCur(totals.mrr_contract)} disabled className="h-8 text-xs bg-muted" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Observações */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="font-semibold text-sm">Observações</p>
              <Textarea value={observations} onChange={e => setObservations(e.target.value)}
                placeholder="Condições e termos adicionais..." rows={4} className="text-xs" />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div className="sticky bottom-0 z-10 border-t border-border bg-card/95 backdrop-blur p-3 flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onClose} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={handleCopyPublicLink} className="gap-1">
          <Link2 className="h-4 w-4" /> Link Público
        </Button>
        <Button variant="outline" size="sm" onClick={handleGeneratePdf} className="gap-1">
          <FileDown className="h-4 w-4" /> Gerar PDF
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Proposta
        </Button>
      </div>
    </div>
  );
}
