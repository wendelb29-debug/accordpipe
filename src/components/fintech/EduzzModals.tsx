import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2, QrCode, Link2, RefreshCw, Copy, ExternalLink,
  Package, ShoppingCart, AlertCircle, CheckCircle2, Settings,
} from "lucide-react";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servidorId: string | null;
  registrations: any[];
  onTransactionCreated: () => void;
  profileUserId?: string;
  profileName?: string;
}

interface EduzzProduct {
  id: number;
  title: string;
  price: number;
  type: string;
  status: string;
  recurrence?: boolean;
}

/* ── Helper: call eduzz-api edge function ── */
async function callEduzz(action: string, servidorId: string, params: Record<string, any> = {}) {
  const { data, error } = await supabase.functions.invoke("eduzz-api", {
    body: { action, servidor_id: servidorId, ...params },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

/* ── Helper: check if Eduzz is connected ── */
async function checkEduzzIntegration(servidorId: string) {
  const { data } = await supabase
    .from("fintech_integrations")
    .select("id, display_name, environment, is_active")
    .eq("servidor_id", servidorId)
    .ilike("provider", "%eduzz%")
    .eq("is_active", true)
    .maybeSingle();
  return data;
}

/* ── No Integration Warning ── */
function NoIntegrationWarning({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <AlertCircle className="h-12 w-12 text-amber-500" />
      <div className="text-center space-y-1">
        <h3 className="text-sm font-semibold text-foreground">Eduzz não conectada</h3>
        <p className="text-xs text-muted-foreground max-w-sm">
          Para usar esta funcionalidade, configure a integração com a Eduzz na aba "Webhooks Fintech" nas configurações do tenant.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*  1. GERAR PIX MODAL                        */
/* ═══════════════════════════════════════════ */
export function GerarPixModal({ open, onOpenChange, servidorId, registrations, onTransactionCreated, profileUserId, profileName }: ModalProps) {
  const [loading, setLoading] = useState(false);
  const [hasIntegration, setHasIntegration] = useState<boolean | null>(null);
  const [pixConfig, setPixConfig] = useState<any>(null);
  const [configMode, setConfigMode] = useState(false);
  const [form, setForm] = useState({ registration_id: "", amount: 0, description: "", due_date: "" });
  const [pixResult, setPixResult] = useState<any>(null);
  const [pixForm, setPixForm] = useState({ pix_key: "", pix_key_type: "cpf", pix_beneficiary: "", pix_document: "", pix_default_description: "" });

  useEffect(() => {
    if (open && servidorId) {
      checkEduzzIntegration(servidorId).then((int) => setHasIntegration(!!int));
      supabase
        .from("tenant_financial_config" as any)
        .select("*")
        .eq("servidor_id", servidorId)
        .maybeSingle()
        .then(({ data }) => {
          setPixConfig(data);
          if (data) {
            setPixForm({
              pix_key: (data as any).pix_key || "",
              pix_key_type: (data as any).pix_key_type || "cpf",
              pix_beneficiary: (data as any).pix_beneficiary || "",
              pix_document: (data as any).pix_document || "",
              pix_default_description: (data as any).pix_default_description || "",
            });
          }
        });
    }
  }, [open, servidorId]);

  const savePixConfig = async () => {
    if (!servidorId) return;
    setLoading(true);
    const payload = { ...pixForm, servidor_id: servidorId };
    if (pixConfig) {
      await supabase.from("tenant_financial_config" as any).update(payload).eq("id", (pixConfig as any).id);
    } else {
      await supabase.from("tenant_financial_config" as any).insert(payload);
    }
    toast.success("Configuração PIX salva!");
    setConfigMode(false);
    const { data } = await supabase.from("tenant_financial_config" as any).select("*").eq("servidor_id", servidorId).maybeSingle();
    setPixConfig(data);
    setLoading(false);
  };

  const generatePix = async () => {
    if (!servidorId || !form.amount) { toast.error("Preencha o valor"); return; }
    setLoading(true);
    try {
      // Try to create invoice via Eduzz with PIX method
      const clientReg = registrations.find((r) => r.id === form.registration_id);
      const result = await callEduzz("create_invoice", servidorId, {
        amount: form.amount,
        description: form.description || pixForm.pix_default_description || "Cobrança PIX",
        due_date: form.due_date,
        payment_method: "pix",
        customer_name: clientReg?.nome_completo || "Cliente",
        customer_email: clientReg?.email || "",
      });

      if (result?.success) {
        setPixResult(result.data);
        // Save transaction
        await supabase.from("financial_transactions" as any).insert({
          servidor_id: servidorId,
          registration_id: form.registration_id || null,
          type: "cobranca",
          description: form.description || "Cobrança PIX via Eduzz",
          amount: form.amount,
          due_date: form.due_date || new Date().toISOString().split("T")[0],
          status: "pendente",
          payment_method: "pix",
          reference: result.data?.invoice_code || result.data?.sale_id || `eduzz-pix-${Date.now()}`,
          notes: "Gerado via integração Eduzz",
          created_by_user_id: profileUserId,
          created_by_name: profileName,
        });
        toast.success("Cobrança PIX gerada!");
        onTransactionCreated();
      } else {
        // Fallback: save as manual transaction with PIX info
        await supabase.from("financial_transactions" as any).insert({
          servidor_id: servidorId,
          registration_id: form.registration_id || null,
          type: "cobranca",
          description: form.description || "Cobrança PIX",
          amount: form.amount,
          due_date: form.due_date || new Date().toISOString().split("T")[0],
          status: "pendente",
          payment_method: "pix",
          reference: `pix-${Date.now()}`,
          notes: `Chave PIX: ${pixForm.pix_key} (${pixForm.pix_key_type})`,
          created_by_user_id: profileUserId,
          created_by_name: profileName,
        });
        setPixResult({ pix_key: pixForm.pix_key, pix_key_type: pixForm.pix_key_type, beneficiary: pixForm.pix_beneficiary });
        toast.success("Cobrança PIX registrada!");
        onTransactionCreated();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao gerar PIX");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader><DialogTitle className="text-base flex items-center gap-2"><QrCode className="h-4 w-4" /> Gerar PIX</DialogTitle></DialogHeader>
        
        {hasIntegration === false && <NoIntegrationWarning onClose={() => onOpenChange(false)} />}
        
        {hasIntegration && !configMode && !pixResult && (
          <div className="space-y-3">
            {!pixConfig?.pix_key && (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-500">Configure sua chave PIX primeiro.</p>
                <Button size="sm" variant="outline" className="ml-auto h-7 text-xs" onClick={() => setConfigMode(true)}>
                  <Settings className="h-3 w-3 mr-1" /> Configurar
                </Button>
              </div>
            )}
            {pixConfig?.pix_key && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs text-emerald-500">PIX configurado: {(pixConfig as any).pix_key_type?.toUpperCase()} ••••{(pixConfig as any).pix_key?.slice(-4)}</span>
                <Button size="sm" variant="ghost" className="ml-auto h-6 text-[10px]" onClick={() => setConfigMode(true)}>Editar</Button>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Cliente</Label>
              <Select value={form.registration_id} onValueChange={(v) => setForm({ ...form, registration_id: v })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                <SelectContent>
                  {registrations.map((r) => <SelectItem key={r.id} value={r.id} className="text-xs">{r.nome_completo || "Sem nome"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Valor (R$)</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className="h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Vencimento</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="h-9 text-xs" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="h-9 text-xs" placeholder="Ex: Mensalidade Abril" />
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button size="sm" onClick={generatePix} disabled={loading || !form.amount}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4 mr-1" />} Gerar PIX
              </Button>
            </DialogFooter>
          </div>
        )}

        {hasIntegration && configMode && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tipo da Chave</Label>
                <Select value={pixForm.pix_key_type} onValueChange={(v) => setPixForm({ ...pixForm, pix_key_type: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpf" className="text-xs">CPF</SelectItem>
                    <SelectItem value="cnpj" className="text-xs">CNPJ</SelectItem>
                    <SelectItem value="email" className="text-xs">E-mail</SelectItem>
                    <SelectItem value="telefone" className="text-xs">Telefone</SelectItem>
                    <SelectItem value="aleatoria" className="text-xs">Aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Chave PIX</Label>
                <Input value={pixForm.pix_key} onChange={(e) => setPixForm({ ...pixForm, pix_key: e.target.value })} className="h-9 text-xs" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Beneficiário</Label>
              <Input value={pixForm.pix_beneficiary} onChange={(e) => setPixForm({ ...pixForm, pix_beneficiary: e.target.value })} className="h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Documento do Recebedor</Label>
              <Input value={pixForm.pix_document} onChange={(e) => setPixForm({ ...pixForm, pix_document: e.target.value })} className="h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição Padrão</Label>
              <Input value={pixForm.pix_default_description} onChange={(e) => setPixForm({ ...pixForm, pix_default_description: e.target.value })} className="h-9 text-xs" placeholder="Pagamento via PIX" />
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setConfigMode(false)}>Voltar</Button>
              <Button size="sm" onClick={savePixConfig} disabled={loading || !pixForm.pix_key}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Salvar Configuração
              </Button>
            </DialogFooter>
          </div>
        )}

        {pixResult && (
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <p className="text-sm font-semibold text-foreground">PIX Gerado com Sucesso!</p>
              {pixResult.pix_key && (
                <div className="text-center space-y-1">
                  <p className="text-xs text-muted-foreground">Chave PIX:</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded">{pixResult.pix_key}</code>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { navigator.clipboard.writeText(pixResult.pix_key); toast.success("Copiado!"); }}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
              {pixResult.checkout_url && (
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => window.open(pixResult.checkout_url, "_blank")}>
                  <ExternalLink className="h-3 w-3" /> Abrir Link de Pagamento
                </Button>
              )}
            </div>
            <DialogFooter>
              <Button size="sm" onClick={() => { setPixResult(null); onOpenChange(false); }}>Fechar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════ */
/*  2. LINK DE PAGAMENTO MODAL                */
/* ═══════════════════════════════════════════ */
export function LinkPagamentoModal({ open, onOpenChange, servidorId, registrations, onTransactionCreated, profileUserId, profileName }: ModalProps) {
  const [loading, setLoading] = useState(false);
  const [hasIntegration, setHasIntegration] = useState<boolean | null>(null);
  const [products, setProducts] = useState<EduzzProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<EduzzProduct | null>(null);
  const [registrationId, setRegistrationId] = useState("");
  const [linkResult, setLinkResult] = useState<string | null>(null);

  useEffect(() => {
    if (open && servidorId) {
      setSelectedProduct(null);
      setLinkResult(null);
      checkEduzzIntegration(servidorId).then((int) => {
        setHasIntegration(!!int);
        if (int) fetchProducts();
      });
    }
  }, [open, servidorId]);

  const fetchProducts = async () => {
    if (!servidorId) return;
    setLoading(true);
    try {
      const result = await callEduzz("list_products", servidorId, { per_page: 50 });
      if (result?.success && result.data?.data) {
        const list = Array.isArray(result.data.data) ? result.data.data : [];
        setProducts(list.map((p: any) => ({
          id: p.content_id || p.id,
          title: p.title || p.name,
          price: p.price || p.amount || 0,
          type: p.type || "product",
          status: p.status || "active",
          recurrence: p.recurrence || p.is_subscription || false,
        })));
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao buscar produtos da Eduzz");
    }
    setLoading(false);
  };

  const generateLink = async () => {
    if (!servidorId || !selectedProduct) return;
    setLoading(true);
    try {
      const result = await callEduzz("get_checkout_link", servidorId, { product_id: selectedProduct.id });
      if (result?.success && result.data?.checkout_url) {
        setLinkResult(result.data.checkout_url);
        // Save transaction record
        await supabase.from("financial_transactions" as any).insert({
          servidor_id: servidorId,
          registration_id: registrationId || null,
          type: "cobranca",
          description: `Link de Pagamento: ${selectedProduct.title}`,
          amount: selectedProduct.price,
          due_date: new Date().toISOString().split("T")[0],
          status: "pendente",
          payment_method: "link",
          reference: `eduzz-${selectedProduct.id}-${Date.now()}`,
          notes: `Produto Eduzz: ${selectedProduct.title}\nLink: ${result.data.checkout_url}`,
          created_by_user_id: profileUserId,
          created_by_name: profileName,
        });
        toast.success("Link gerado!");
        onTransactionCreated();
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar link");
    }
    setLoading(false);
  };

  const fmtPrice = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader><DialogTitle className="text-base flex items-center gap-2"><Link2 className="h-4 w-4" /> Link de Pagamento</DialogTitle></DialogHeader>

        {hasIntegration === false && <NoIntegrationWarning onClose={() => onOpenChange(false)} />}

        {hasIntegration && !linkResult && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Cliente (opcional)</Label>
              <Select value={registrationId} onValueChange={setRegistrationId}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Vincular a um cliente" /></SelectTrigger>
                <SelectContent>
                  {registrations.map((r) => <SelectItem key={r.id} value={r.id} className="text-xs">{r.nome_completo || "Sem nome"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Produtos da Eduzz</Label>
              {loading ? (
                <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : products.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">Nenhum produto encontrado na Eduzz</div>
              ) : (
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {products.map((p) => (
                    <Card
                      key={p.id}
                      className={`cursor-pointer border transition-colors ${selectedProduct?.id === p.id ? "border-primary bg-primary/5" : "border-border/50 hover:border-border"}`}
                      onClick={() => setSelectedProduct(p)}
                    >
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs font-medium text-foreground">{p.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-muted-foreground">{p.type}</span>
                              {p.recurrence && <Badge variant="outline" className="text-[9px] h-4 px-1">Recorrente</Badge>}
                            </div>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-foreground">{fmtPrice(p.price)}</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button size="sm" onClick={generateLink} disabled={loading || !selectedProduct}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4 mr-1" />} Gerar Link
              </Button>
            </DialogFooter>
          </div>
        )}

        {linkResult && (
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <p className="text-sm font-semibold text-foreground">Link Gerado!</p>
              <div className="w-full">
                <div className="flex items-center gap-2 bg-muted p-2 rounded-lg">
                  <code className="text-[10px] flex-1 truncate">{linkResult}</code>
                  <Button variant="ghost" size="sm" className="h-7 shrink-0" onClick={() => { navigator.clipboard.writeText(linkResult); toast.success("Link copiado!"); }}>
                    <Copy className="h-3 w-3 mr-1" /> Copiar
                  </Button>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => window.open(linkResult, "_blank")}>
                <ExternalLink className="h-3 w-3" /> Abrir Link
              </Button>
            </div>
            <DialogFooter>
              <Button size="sm" onClick={() => { setLinkResult(null); onOpenChange(false); }}>Fechar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════ */
/*  3. RECORRÊNCIA MODAL                      */
/* ═══════════════════════════════════════════ */
export function RecorrenciaModal({ open, onOpenChange, servidorId, registrations, onTransactionCreated, profileUserId, profileName }: ModalProps) {
  const [loading, setLoading] = useState(false);
  const [hasIntegration, setHasIntegration] = useState<boolean | null>(null);
  const [products, setProducts] = useState<EduzzProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<EduzzProduct | null>(null);
  const [registrationId, setRegistrationId] = useState("");

  useEffect(() => {
    if (open && servidorId) {
      setSelectedProduct(null);
      checkEduzzIntegration(servidorId).then((int) => {
        setHasIntegration(!!int);
        if (int) fetchRecurringProducts();
      });
    }
  }, [open, servidorId]);

  const fetchRecurringProducts = async () => {
    if (!servidorId) return;
    setLoading(true);
    try {
      // Try subscriptions endpoint first
      const subsResult = await callEduzz("get_subscriptions", servidorId, {});
      if (subsResult?.success && subsResult.data?.data) {
        const list = Array.isArray(subsResult.data.data) ? subsResult.data.data : [];
        setProducts(list.map((p: any) => ({
          id: p.content_id || p.id,
          title: p.title || p.name || p.plan_name,
          price: p.price || p.amount || 0,
          type: "subscription",
          status: p.status || "active",
          recurrence: true,
        })));
      } else {
        // Fallback: get all products and filter
        const result = await callEduzz("list_products", servidorId, { per_page: 50 });
        if (result?.success && result.data?.data) {
          const list = Array.isArray(result.data.data) ? result.data.data : [];
          setProducts(
            list
              .filter((p: any) => p.recurrence || p.is_subscription || p.type === "subscription")
              .map((p: any) => ({
                id: p.content_id || p.id,
                title: p.title || p.name,
                price: p.price || p.amount || 0,
                type: "subscription",
                status: p.status || "active",
                recurrence: true,
              }))
          );
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao buscar produtos recorrentes");
    }
    setLoading(false);
  };

  const activateRecurrence = async () => {
    if (!servidorId || !selectedProduct) return;
    setLoading(true);
    try {
      const result = await callEduzz("get_checkout_link", servidorId, { product_id: selectedProduct.id });
      // Save recurring transaction
      await supabase.from("financial_transactions" as any).insert({
        servidor_id: servidorId,
        registration_id: registrationId || null,
        type: "mensalidade",
        description: `Recorrência: ${selectedProduct.title}`,
        amount: selectedProduct.price,
        due_date: new Date().toISOString().split("T")[0],
        status: "pendente",
        payment_method: "recorrencia",
        reference: `eduzz-rec-${selectedProduct.id}-${Date.now()}`,
        notes: `Produto recorrente Eduzz: ${selectedProduct.title}\n${result?.data?.checkout_url ? `Link: ${result.data.checkout_url}` : ""}`,
        created_by_user_id: profileUserId,
        created_by_name: profileName,
      });
      toast.success("Recorrência vinculada! O webhook atualizará o status automaticamente.");
      onTransactionCreated();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao vincular recorrência");
    }
    setLoading(false);
  };

  const fmtPrice = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader><DialogTitle className="text-base flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Recorrência</DialogTitle></DialogHeader>

        {hasIntegration === false && <NoIntegrationWarning onClose={() => onOpenChange(false)} />}

        {hasIntegration && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Cliente</Label>
              <Select value={registrationId} onValueChange={setRegistrationId}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {registrations.map((r) => <SelectItem key={r.id} value={r.id} className="text-xs">{r.nome_completo || "Sem nome"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Produtos Recorrentes da Eduzz</Label>
              {loading ? (
                <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : products.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">Nenhum produto recorrente encontrado</div>
              ) : (
                <div className="max-h-[250px] overflow-y-auto space-y-2">
                  {products.map((p) => (
                    <Card
                      key={p.id}
                      className={`cursor-pointer border transition-colors ${selectedProduct?.id === p.id ? "border-primary bg-primary/5" : "border-border/50 hover:border-border"}`}
                      onClick={() => setSelectedProduct(p)}
                    >
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <RefreshCw className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs font-medium text-foreground">{p.title}</p>
                            <Badge variant="outline" className="text-[9px] h-4 px-1 mt-0.5">Recorrente</Badge>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-foreground">{fmtPrice(p.price)}/mês</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button size="sm" onClick={activateRecurrence} disabled={loading || !selectedProduct || !registrationId}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />} Ativar Recorrência
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════ */
/*  4. NOVA COBRANÇA MODAL (ENHANCED)         */
/* ═══════════════════════════════════════════ */
export function NovaCobrancaModal({ open, onOpenChange, servidorId, registrations, onTransactionCreated, profileUserId, profileName }: ModalProps) {
  const [loading, setLoading] = useState(false);
  const [origin, setOrigin] = useState<"manual" | "eduzz">("manual");
  const [hasIntegration, setHasIntegration] = useState<boolean | null>(null);
  const [products, setProducts] = useState<EduzzProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<EduzzProduct | null>(null);
  
  const [form, setForm] = useState({
    registration_id: "",
    type: "cobranca",
    description: "",
    amount: 0,
    due_date: "",
    status: "pendente",
    payment_method: "boleto",
    reference: "",
    notes: "",
  });

  useEffect(() => {
    if (open && servidorId) {
      setSelectedProduct(null);
      setOrigin("manual");
      checkEduzzIntegration(servidorId).then((int) => {
        setHasIntegration(!!int);
      });
    }
  }, [open, servidorId]);

  const fetchEduzzProducts = async () => {
    if (!servidorId) return;
    setLoading(true);
    try {
      const result = await callEduzz("list_products", servidorId, { per_page: 50 });
      if (result?.success && result.data?.data) {
        const list = Array.isArray(result.data.data) ? result.data.data : [];
        setProducts(list.map((p: any) => ({
          id: p.content_id || p.id,
          title: p.title || p.name,
          price: p.price || p.amount || 0,
          type: p.type || "product",
          status: p.status || "active",
          recurrence: p.recurrence || p.is_subscription || false,
        })));
      }
    } catch (err: any) {
      toast.error("Erro ao buscar produtos Eduzz");
    }
    setLoading(false);
  };

  const handleOriginChange = (v: string) => {
    setOrigin(v as "manual" | "eduzz");
    if (v === "eduzz" && products.length === 0) {
      fetchEduzzProducts();
    }
  };

  const handleSave = async () => {
    if (!form.amount || !form.due_date) { toast.error("Preencha valor e vencimento"); return; }
    if (!servidorId) { toast.error("Empresa não encontrada"); return; }
    setLoading(true);

    let reference = form.reference;
    let notes = form.notes;

    if (origin === "eduzz" && selectedProduct) {
      reference = `eduzz-${selectedProduct.id}-${Date.now()}`;
      notes = `Produto Eduzz: ${selectedProduct.title}\n${notes}`;

      // Try to create invoice via Eduzz
      try {
        const clientReg = registrations.find((r) => r.id === form.registration_id);
        await callEduzz("create_invoice", servidorId, {
          product_id: selectedProduct.id,
          amount: form.amount,
          description: form.description,
          due_date: form.due_date,
          payment_method: form.payment_method,
          customer_name: clientReg?.nome_completo || "Cliente",
          customer_email: clientReg?.email || "",
        });
      } catch {
        // Continue even if Eduzz call fails - save locally
      }
    }

    const { error } = await supabase.from("financial_transactions" as any).insert({
      servidor_id: servidorId,
      registration_id: form.registration_id || null,
      type: form.type,
      description: form.description,
      amount: form.amount,
      due_date: form.due_date,
      status: form.status,
      payment_method: form.payment_method,
      reference,
      notes,
      created_by_user_id: profileUserId,
      created_by_name: profileName,
    });

    if (error) {
      toast.error("Erro ao criar cobrança");
      console.error(error);
    } else {
      toast.success("Cobrança criada!");
      onTransactionCreated();
      onOpenChange(false);
      setForm({ registration_id: "", type: "cobranca", description: "", amount: 0, due_date: "", status: "pendente", payment_method: "boleto", reference: "", notes: "" });
    }
    setLoading(false);
  };

  const fmtPrice = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader><DialogTitle className="text-base flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Nova Cobrança</DialogTitle></DialogHeader>
        
        <div className="space-y-3">
          {/* Origin selector */}
          {hasIntegration && (
            <div className="space-y-1">
              <Label className="text-xs">Origem</Label>
              <Select value={origin} onValueChange={handleOriginChange}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual" className="text-xs">Cobrança Manual</SelectItem>
                  <SelectItem value="eduzz" className="text-xs">Via Eduzz</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Eduzz product selection */}
          {origin === "eduzz" && (
            <div className="space-y-1">
              <Label className="text-xs">Produto Eduzz</Label>
              {loading ? (
                <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
              ) : (
                <Select value={selectedProduct ? String(selectedProduct.id) : ""} onValueChange={(v) => {
                  const p = products.find((pr) => String(pr.id) === v);
                  setSelectedProduct(p || null);
                  if (p) setForm({ ...form, amount: p.price, description: p.title });
                }}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                        {p.title} — {fmtPrice(p.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Cliente</Label>
            <Select value={form.registration_id} onValueChange={(v) => setForm({ ...form, registration_id: v })}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
              <SelectContent>
                {registrations.map((r) => <SelectItem key={r.id} value={r.id} className="text-xs">{r.nome_completo || "Sem nome"}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cobranca" className="text-xs">Cobrança</SelectItem>
                  <SelectItem value="mensalidade" className="text-xs">Mensalidade</SelectItem>
                  <SelectItem value="adesao" className="text-xs">Adesão</SelectItem>
                  <SelectItem value="outro" className="text-xs">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Forma de Pagamento</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="boleto" className="text-xs">Boleto</SelectItem>
                  <SelectItem value="pix" className="text-xs">PIX</SelectItem>
                  <SelectItem value="cartao" className="text-xs">Cartão</SelectItem>
                  <SelectItem value="transferencia" className="text-xs">Transferência</SelectItem>
                  <SelectItem value="link" className="text-xs">Link de Pagamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Valor (R$)</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className="h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Vencimento</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="h-9 text-xs" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Descrição</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="h-9 text-xs" placeholder="Ex: Mensalidade março/2026" />
          </div>

          {origin === "manual" && (
            <div className="space-y-1">
              <Label className="text-xs">Referência</Label>
              <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="h-9 text-xs" placeholder="Nº boleto, código PIX..." />
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Observações</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="text-xs" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4 mr-1" />} Criar Cobrança
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
