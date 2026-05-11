import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2, QrCode, Link2, RefreshCw, Copy, ExternalLink,
  AlertCircle, CheckCircle2, CreditCard, FileText, Wallet, UserCog,
} from "lucide-react";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string | null;
  registrations: any[];
  onSuccess: () => void;
}

async function callAsaasApi(action: string, tenantId: string, params: Record<string, any> = {}) {
  const { data, error } = await supabase.functions.invoke("asaas-api", {
    body: { action, tenant_id: tenantId, ...params },
  });
  if (error) {
    console.error("[AsaasModals] invoke error:", error);
    throw new Error("Erro de comunicação com o servidor. Tente novamente.");
  }
  if (data?.success === false || data?.error) {
    const msg = data?.details || data?.message || data?.error || "Erro desconhecido";
    console.error("[AsaasModals] API error:", data?.code, msg);
    throw new Error(msg);
  }
  return data;
}

async function getAsaasIntegration(tenantId: string) {
  const { data } = await supabase
    .from("tenant_fintech_integrations")
    .select("id, connection_status, api_key_masked")
    .eq("tenant_id", tenantId)
    .eq("provider", "asaas")
    .maybeSingle();
  return data as any;
}

function NoIntegrationState({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <AlertCircle className="h-12 w-12 text-amber-500" />
      <div className="text-center space-y-1">
        <h3 className="text-sm font-semibold text-foreground">Integração Asaas não configurada</h3>
        <p className="text-xs text-muted-foreground max-w-sm">
          Configure a integração com o Asaas na aba Fintech dentro das configurações do tenant.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
    </div>
  );
}

/** Warning shown when selected client has no CPF/CNPJ */
function MissingDocWarning({ clientName }: { clientName?: string }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
      <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
      <div className="space-y-1">
        <p className="text-xs font-medium text-foreground">
          {clientName ? `"${clientName}"` : "Este cliente"} não possui CPF/CNPJ cadastrado.
        </p>
        <p className="text-[11px] text-muted-foreground">
          Preencha o campo abaixo ou atualize o cadastro do cliente antes de gerar a cobrança.
        </p>
      </div>
    </div>
  );
}

function copyText(text: string) {
  navigator.clipboard.writeText(text);
  toast.success("Copiado!");
}

/** Helper: get clean doc from registration or manual input */
function useClientDoc(registrations: any[], registrationId: string) {
  const selectedReg = useMemo(
    () => registrations.find((r) => r.id === registrationId),
    [registrations, registrationId]
  );
  const regDoc = selectedReg?.cpf?.replace(/\D/g, "") || "";
  return { selectedReg, regDoc };
}

/* ═══════════════════════════════════════════ */
/*  1. NOVA COBRANÇA                           */
/* ═══════════════════════════════════════════ */
export function NovaCobrancaModal({ open, onOpenChange, tenantId, registrations, onSuccess }: ModalProps) {
  const [loading, setLoading] = useState(false);
  const [hasIntegration, setHasIntegration] = useState<boolean | null>(null);
  const [result, setResult] = useState<any>(null);
  const [form, setForm] = useState({
    registration_id: "", billing_type: "BOLETO", value: "", due_date: "",
    description: "", fine_value: "", interest_value: "", discount_value: "",
    installment_count: "", origin: "manual", cpf_cnpj: "",
  });

  useEffect(() => {
    if (open && tenantId) {
      setResult(null);
      setForm({ registration_id: "", billing_type: "BOLETO", value: "", due_date: "", description: "", fine_value: "", interest_value: "", discount_value: "", installment_count: "", origin: "manual", cpf_cnpj: "" });
      getAsaasIntegration(tenantId).then((int) => setHasIntegration(!!int?.api_key_masked));
    }
  }, [open, tenantId]);

  const { selectedReg, regDoc } = useClientDoc(registrations, form.registration_id);

  // Auto-fill cpf_cnpj when client changes
  useEffect(() => {
    if (form.registration_id) {
      setForm((prev) => ({ ...prev, cpf_cnpj: regDoc || prev.cpf_cnpj }));
    }
  }, [form.registration_id, regDoc]);

  const cleanDoc = form.cpf_cnpj.replace(/\D/g, "");
  const showDocWarning = form.registration_id && !regDoc && !cleanDoc;

  const handleSubmit = async () => {
    if (!tenantId || !form.value || !form.due_date) { toast.error("Preencha valor e vencimento"); return; }
    if (!cleanDoc) { toast.error("Preencha o CPF ou CNPJ do cliente"); return; }
    setLoading(true);
    try {
      const clientReg = selectedReg;
      let asaasCustomerId = "";
      if (clientReg) {
        const custResult = await callAsaasApi("create_customer", tenantId, {
          local_customer_id: clientReg.id,
          name: clientReg.nome_completo || "Cliente",
          email: clientReg.email || "",
          cpf_cnpj: cleanDoc,
          phone: clientReg.telefone || "",
        });
        asaasCustomerId = custResult.asaas_customer_id;
      }
      if (!asaasCustomerId) { toast.error("Selecione um cliente"); setLoading(false); return; }

      const data = await callAsaasApi("create_billing", tenantId, {
        asaas_customer_id: asaasCustomerId,
        local_customer_id: clientReg?.id,
        value: Number(form.value),
        due_date: form.due_date,
        description: form.description,
        billing_type: form.billing_type,
        origin: form.origin,
        fine_value: form.fine_value ? Number(form.fine_value) : undefined,
        interest_value: form.interest_value ? Number(form.interest_value) : undefined,
        discount_value: form.discount_value ? Number(form.discount_value) : undefined,
        installment_count: form.installment_count ? Number(form.installment_count) : undefined,
      });
      setResult(data);
      toast.success("Cobrança criada com sucesso!");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar cobrança");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Nova Cobrança
          </DialogTitle>
        </DialogHeader>

        {hasIntegration === false && <NoIntegrationState onClose={() => onOpenChange(false)} />}

        {hasIntegration && !result && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Cliente *</Label>
              <Select value={form.registration_id} onValueChange={(v) => setForm({ ...form, registration_id: v })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {registrations.map((r) => <SelectItem key={r.id} value={r.id} className="text-xs">{r.nome_completo || "Sem nome"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {showDocWarning && <MissingDocWarning clientName={selectedReg?.nome_completo} />}

            {form.registration_id && (
              <div className="space-y-1">
                <Label className="text-xs">CPF ou CNPJ *</Label>
                <Input value={form.cpf_cnpj} onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })} className="h-9 text-xs" placeholder="000.000.000-00 ou 00.000.000/0001-00" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tipo de Cobrança</Label>
                <Select value={form.billing_type} onValueChange={(v) => setForm({ ...form, billing_type: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BOLETO" className="text-xs">Boleto</SelectItem>
                    <SelectItem value="PIX" className="text-xs">PIX</SelectItem>
                    <SelectItem value="UNDEFINED" className="text-xs">Link (qualquer forma)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Origem</Label>
                <Select value={form.origin} onValueChange={(v) => setForm({ ...form, origin: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual" className="text-xs">Manual</SelectItem>
                    <SelectItem value="crm" className="text-xs">CRM</SelectItem>
                    <SelectItem value="proposta" className="text-xs">Proposta</SelectItem>
                    <SelectItem value="contrato" className="text-xs">Contrato</SelectItem>
                    <SelectItem value="base_clientes" className="text-xs">Base de Clientes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Valor (R$) *</Label>
                <Input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="h-9 text-xs" placeholder="0,00" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Vencimento *</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="h-9 text-xs" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="h-9 text-xs" placeholder="Ex: Mensalidade Maio" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Multa (R$)</Label>
                <Input type="number" step="0.01" value={form.fine_value} onChange={(e) => setForm({ ...form, fine_value: e.target.value })} className="h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Juros (%)</Label>
                <Input type="number" step="0.01" value={form.interest_value} onChange={(e) => setForm({ ...form, interest_value: e.target.value })} className="h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Desconto (R$)</Label>
                <Input type="number" step="0.01" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} className="h-9 text-xs" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Parcelas (opcional)</Label>
              <Input type="number" min="1" max="12" value={form.installment_count} onChange={(e) => setForm({ ...form, installment_count: e.target.value })} className="h-9 text-xs" placeholder="1" />
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleSubmit} disabled={loading || !form.value || !form.due_date || !form.registration_id || !cleanDoc}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CreditCard className="h-4 w-4 mr-1" />}
                Gerar Cobrança
              </Button>
            </DialogFooter>
          </div>
        )}

        {result && (
          <BillingResult result={result} billingType={form.billing_type} tenantId={tenantId!} onClose={() => { setResult(null); onOpenChange(false); }} />
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════ */
/*  2. GERAR PIX                               */
/* ═══════════════════════════════════════════ */
export function GerarPixModal({ open, onOpenChange, tenantId, registrations, onSuccess }: ModalProps) {
  const [loading, setLoading] = useState(false);
  const [hasIntegration, setHasIntegration] = useState<boolean | null>(null);
  const [result, setResult] = useState<any>(null);
  const [form, setForm] = useState({ registration_id: "", value: "", due_date: "", description: "", cpf_cnpj: "" });

  useEffect(() => {
    if (open && tenantId) {
      setResult(null);
      setForm({ registration_id: "", value: "", due_date: "", description: "", cpf_cnpj: "" });
      getAsaasIntegration(tenantId).then((int) => setHasIntegration(!!int?.api_key_masked));
    }
  }, [open, tenantId]);

  const { selectedReg, regDoc } = useClientDoc(registrations, form.registration_id);

  useEffect(() => {
    if (form.registration_id) {
      setForm((prev) => ({ ...prev, cpf_cnpj: regDoc || prev.cpf_cnpj }));
    }
  }, [form.registration_id, regDoc]);

  const cleanDoc = form.cpf_cnpj.replace(/\D/g, "");
  const showDocWarning = form.registration_id && !regDoc && !cleanDoc;

  const handleSubmit = async () => {
    if (!tenantId || !form.value || !form.due_date) { toast.error("Preencha valor e vencimento"); return; }
    if (!cleanDoc) { toast.error("Preencha o CPF ou CNPJ do cliente"); return; }
    setLoading(true);
    try {
      const clientReg = selectedReg;
      let asaasCustomerId = "";
      if (clientReg) {
        const custResult = await callAsaasApi("create_customer", tenantId, {
          local_customer_id: clientReg.id, name: clientReg.nome_completo || "Cliente",
          email: clientReg.email || "", cpf_cnpj: cleanDoc, phone: clientReg.telefone || "",
        });
        asaasCustomerId = custResult.asaas_customer_id;
      }
      if (!asaasCustomerId) { toast.error("Selecione um cliente"); setLoading(false); return; }

      const data = await callAsaasApi("create_billing", tenantId, {
        asaas_customer_id: asaasCustomerId, local_customer_id: clientReg?.id,
        value: Number(form.value), due_date: form.due_date, description: form.description,
        billing_type: "PIX", origin: "manual",
      });
      setResult(data);
      toast.success("Cobrança PIX criada!");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar PIX");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader><DialogTitle className="text-base flex items-center gap-2"><QrCode className="h-4 w-4" /> Gerar PIX</DialogTitle></DialogHeader>

        {hasIntegration === false && <NoIntegrationState onClose={() => onOpenChange(false)} />}

        {hasIntegration && !result && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Cliente *</Label>
              <Select value={form.registration_id} onValueChange={(v) => setForm({ ...form, registration_id: v })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {registrations.map((r) => <SelectItem key={r.id} value={r.id} className="text-xs">{r.nome_completo || "Sem nome"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {showDocWarning && <MissingDocWarning clientName={selectedReg?.nome_completo} />}

            {form.registration_id && (
              <div className="space-y-1">
                <Label className="text-xs">CPF ou CNPJ *</Label>
                <Input value={form.cpf_cnpj} onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })} className="h-9 text-xs" placeholder="000.000.000-00 ou 00.000.000/0001-00" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Valor (R$) *</Label>
                <Input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Vencimento *</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="h-9 text-xs" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="h-9 text-xs" placeholder="Ex: Pagamento PIX" />
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleSubmit} disabled={loading || !form.value || !form.due_date || !form.registration_id || !cleanDoc}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <QrCode className="h-4 w-4 mr-1" />}
                Gerar PIX
              </Button>
            </DialogFooter>
          </div>
        )}

        {result && (
          <BillingResult result={result} billingType="PIX" tenantId={tenantId!} onClose={() => { setResult(null); onOpenChange(false); }} />
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════ */
/*  3. LINK DE PAGAMENTO                       */
/* ═══════════════════════════════════════════ */
export function LinkPagamentoModal({ open, onOpenChange, tenantId, registrations, onSuccess }: ModalProps) {
  const [loading, setLoading] = useState(false);
  const [hasIntegration, setHasIntegration] = useState<boolean | null>(null);
  const [result, setResult] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", description: "", value: "", billing_type: "UNDEFINED",
    charge_type: "DETACHED", max_installment_count: "", end_date: "",
  });

  useEffect(() => {
    if (open && tenantId) {
      setResult(null);
      setForm({ name: "", description: "", value: "", billing_type: "UNDEFINED", charge_type: "DETACHED", max_installment_count: "", end_date: "" });
      getAsaasIntegration(tenantId).then((int) => setHasIntegration(!!int?.api_key_masked));
    }
  }, [open, tenantId]);

  const handleSubmit = async () => {
    if (!tenantId || !form.name || !form.value) { toast.error("Preencha nome e valor"); return; }
    setLoading(true);
    try {
      const data = await callAsaasApi("create_payment_link", tenantId, {
        name: form.name, description: form.description, value: Number(form.value),
        billing_type: form.billing_type, charge_type: form.charge_type,
        max_installment_count: form.max_installment_count ? Number(form.max_installment_count) : undefined,
        end_date: form.end_date || undefined,
      });
      setResult(data);
      toast.success("Link de pagamento criado!");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar link");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader><DialogTitle className="text-base flex items-center gap-2"><Link2 className="h-4 w-4" /> Link de Pagamento</DialogTitle></DialogHeader>

        {hasIntegration === false && <NoIntegrationState onClose={() => onOpenChange(false)} />}

        {hasIntegration && !result && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nome do Link *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-9 text-xs" placeholder="Ex: Mensalidade Premium" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="text-xs min-h-[60px]" placeholder="Descrição do pagamento..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Valor (R$) *</Label>
                <Input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Forma de Pagamento</Label>
                <Select value={form.billing_type} onValueChange={(v) => setForm({ ...form, billing_type: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNDEFINED" className="text-xs">Todas</SelectItem>
                    <SelectItem value="BOLETO" className="text-xs">Boleto</SelectItem>
                    <SelectItem value="PIX" className="text-xs">PIX</SelectItem>
                    <SelectItem value="CREDIT_CARD" className="text-xs">Cartão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select value={form.charge_type} onValueChange={(v) => setForm({ ...form, charge_type: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DETACHED" className="text-xs">Avulso</SelectItem>
                    <SelectItem value="INSTALLMENT" className="text-xs">Parcelado</SelectItem>
                    <SelectItem value="RECURRENT" className="text-xs">Recorrente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Máx. Parcelas</Label>
                <Input type="number" min="1" max="12" value={form.max_installment_count} onChange={(e) => setForm({ ...form, max_installment_count: e.target.value })} className="h-9 text-xs" placeholder="1" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data limite (opcional)</Label>
              <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="h-9 text-xs" />
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleSubmit} disabled={loading || !form.name || !form.value}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Link2 className="h-4 w-4 mr-1" />}
                Criar Link
              </Button>
            </DialogFooter>
          </div>
        )}

        {result?.link && (
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <p className="text-sm font-semibold text-foreground">Link Criado!</p>
              <div className="w-full space-y-2">
                <div className="flex items-center gap-2">
                  <Input value={result.link.url || ""} readOnly className="font-mono text-xs bg-muted/50 flex-1" />
                  <Button variant="outline" size="icon" className="shrink-0 h-9 w-9" onClick={() => copyText(result.link.url)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => window.open(result.link.url, "_blank")}>
                    <ExternalLink className="h-3 w-3" /> Abrir Link
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button size="sm" onClick={() => { setResult(null); onOpenChange(false); }}>Fechar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════ */
/*  4. RECORRÊNCIA                             */
/* ═══════════════════════════════════════════ */
export function RecorrenciaModal({ open, onOpenChange, tenantId, registrations, onSuccess }: ModalProps) {
  const [loading, setLoading] = useState(false);
  const [hasIntegration, setHasIntegration] = useState<boolean | null>(null);
  const [result, setResult] = useState<any>(null);
  const [form, setForm] = useState({
    registration_id: "", billing_type: "BOLETO", value: "", next_due_date: "",
    cycle: "MONTHLY", description: "", end_date: "", cpf_cnpj: "",
  });

  useEffect(() => {
    if (open && tenantId) {
      setResult(null);
      setForm({ registration_id: "", billing_type: "BOLETO", value: "", next_due_date: "", cycle: "MONTHLY", description: "", end_date: "", cpf_cnpj: "" });
      getAsaasIntegration(tenantId).then((int) => setHasIntegration(!!int?.api_key_masked));
    }
  }, [open, tenantId]);

  const { selectedReg, regDoc } = useClientDoc(registrations, form.registration_id);

  useEffect(() => {
    if (form.registration_id) {
      setForm((prev) => ({ ...prev, cpf_cnpj: regDoc || prev.cpf_cnpj }));
    }
  }, [form.registration_id, regDoc]);

  const cleanDoc = form.cpf_cnpj.replace(/\D/g, "");
  const showDocWarning = form.registration_id && !regDoc && !cleanDoc;

  const handleSubmit = async () => {
    if (!tenantId || !form.value || !form.next_due_date) { toast.error("Preencha valor e próximo vencimento"); return; }
    if (!cleanDoc) { toast.error("Preencha o CPF ou CNPJ do cliente"); return; }
    setLoading(true);
    try {
      const clientReg = selectedReg;
      let asaasCustomerId = "";
      if (clientReg) {
        const custResult = await callAsaasApi("create_customer", tenantId, {
          local_customer_id: clientReg.id, name: clientReg.nome_completo || "Cliente",
          email: clientReg.email || "", cpf_cnpj: cleanDoc, phone: clientReg.telefone || "",
        });
        asaasCustomerId = custResult.asaas_customer_id;
      }
      if (!asaasCustomerId) { toast.error("Selecione um cliente"); setLoading(false); return; }

      const data = await callAsaasApi("create_subscription", tenantId, {
        asaas_customer_id: asaasCustomerId, local_customer_id: clientReg?.id,
        value: Number(form.value), next_due_date: form.next_due_date,
        billing_type: form.billing_type, cycle: form.cycle,
        description: form.description, end_date: form.end_date || undefined,
      });
      setResult(data);
      toast.success("Recorrência criada!");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar recorrência");
    }
    setLoading(false);
  };

  const cycleLabels: Record<string, string> = {
    WEEKLY: "Semanal", BIWEEKLY: "Quinzenal", MONTHLY: "Mensal",
    QUARTERLY: "Trimestral", SEMIANNUALLY: "Semestral", YEARLY: "Anual",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader><DialogTitle className="text-base flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Recorrência</DialogTitle></DialogHeader>

        {hasIntegration === false && <NoIntegrationState onClose={() => onOpenChange(false)} />}

        {hasIntegration && !result && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Cliente *</Label>
              <Select value={form.registration_id} onValueChange={(v) => setForm({ ...form, registration_id: v })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {registrations.map((r) => <SelectItem key={r.id} value={r.id} className="text-xs">{r.nome_completo || "Sem nome"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {showDocWarning && <MissingDocWarning clientName={selectedReg?.nome_completo} />}

            {form.registration_id && (
              <div className="space-y-1">
                <Label className="text-xs">CPF ou CNPJ *</Label>
                <Input value={form.cpf_cnpj} onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })} className="h-9 text-xs" placeholder="000.000.000-00 ou 00.000.000/0001-00" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Forma de Pagamento</Label>
                <Select value={form.billing_type} onValueChange={(v) => setForm({ ...form, billing_type: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BOLETO" className="text-xs">Boleto</SelectItem>
                    <SelectItem value="PIX" className="text-xs">PIX</SelectItem>
                    <SelectItem value="CREDIT_CARD" className="text-xs">Cartão</SelectItem>
                    <SelectItem value="UNDEFINED" className="text-xs">Todas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ciclo</Label>
                <Select value={form.cycle} onValueChange={(v) => setForm({ ...form, cycle: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(cycleLabels).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Valor (R$) *</Label>
                <Input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Próximo Vencimento *</Label>
                <Input type="date" value={form.next_due_date} onChange={(e) => setForm({ ...form, next_due_date: e.target.value })} className="h-9 text-xs" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="h-9 text-xs" placeholder="Ex: Assinatura Mensal" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data final (opcional)</Label>
              <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="h-9 text-xs" />
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleSubmit} disabled={loading || !form.value || !form.next_due_date || !form.registration_id || !cleanDoc}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                Criar Recorrência
              </Button>
            </DialogFooter>
          </div>
        )}

        {result?.subscription && (
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <p className="text-sm font-semibold text-foreground">Recorrência Criada!</p>
              <div className="grid grid-cols-2 gap-3 w-full text-xs">
                <div><span className="text-muted-foreground">ID:</span> <span className="font-mono">{result.subscription.id}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <span className="font-medium">{result.subscription.status}</span></div>
                <div><span className="text-muted-foreground">Ciclo:</span> <span>{cycleLabels[result.subscription.cycle] || result.subscription.cycle}</span></div>
                <div><span className="text-muted-foreground">Valor:</span> <span className="font-semibold">R$ {Number(result.subscription.value).toFixed(2)}</span></div>
                <div><span className="text-muted-foreground">Próx. Venc.:</span> <span>{result.subscription.nextDueDate}</span></div>
              </div>
            </div>
            <DialogFooter>
              <Button size="sm" onClick={() => { setResult(null); onOpenChange(false); }}>Fechar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════ */
/*  SHARED: Billing Result                     */
/* ═══════════════════════════════════════════ */
function BillingResult({ result, billingType, tenantId, onClose }: { result: any; billingType: string; tenantId: string; onClose: () => void }) {
  const [pixData, setPixData] = useState<any>(null);
  const [loadingPix, setLoadingPix] = useState(false);
  const [pixRetries, setPixRetries] = useState(0);

  useEffect(() => {
    if (billingType === "PIX" && result?.pix_payload) {
      setPixData({ payload: result.pix_payload, qrcode_image: result.pix_qrcode_url });
    } else if (billingType === "PIX" && result?.payment_id) {
      fetchPixQrCode();
    }
  }, [result, billingType]);

  const fetchPixQrCode = async () => {
    if (!result?.payment_id) return;
    setLoadingPix(true);
    try {
      const d = await callAsaasApi("get_pix_qrcode", tenantId, { asaas_payment_id: result.payment_id });
      if (d?.payload) {
        setPixData({ payload: d.payload, qrcode_image: d.qrcode_image });
      } else {
        setPixRetries((p) => p + 1);
      }
    } catch (err: any) {
      console.error("[BillingResult] get_pix_qrcode error:", err.message);
      setPixRetries((p) => p + 1);
    }
    setLoadingPix(false);
  };

  // Auto-retry PIX QR Code up to 3 times with delay
  useEffect(() => {
    if (billingType === "PIX" && !pixData && pixRetries > 0 && pixRetries <= 3) {
      const timer = setTimeout(fetchPixQrCode, 2000 * pixRetries);
      return () => clearTimeout(timer);
    }
  }, [pixRetries]);

  const fmtCur = (v: number) => v?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "R$ 0,00";

  return (
    <div className="space-y-4 py-2">
      <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        <p className="text-sm font-semibold text-foreground">Cobrança Criada com Sucesso!</p>

        <div className="w-full space-y-2 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="font-medium">{result.status}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Vencimento</span><span>{result.due_date}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tipo</span><span className="font-medium">{billingType === "PIX" ? "PIX" : billingType === "BOLETO" ? "Boleto" : "Link"}</span></div>
          {result.payment_id && <div className="flex justify-between"><span className="text-muted-foreground">ID Asaas</span><span className="font-mono text-[10px]">{result.payment_id}</span></div>}
        </div>

        {/* PIX */}
        {billingType === "PIX" && (
          <div className="w-full space-y-3">
            {loadingPix && !pixData && (
              <div className="flex flex-col items-center gap-2 py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-[11px] text-muted-foreground">Carregando QR Code PIX...</p>
              </div>
            )}
            {pixData?.qrcode_image && (
              <div className="flex justify-center">
                <img src={`data:image/png;base64,${pixData.qrcode_image}`} alt="QR Code PIX" className="w-48 h-48 rounded-lg border border-border" />
              </div>
            )}
            {pixData?.payload && (
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground font-medium">Código PIX (copia e cola)</p>
                <div className="flex items-center gap-2">
                  <Input value={pixData.payload} readOnly className="font-mono text-[10px] bg-muted/50 flex-1 h-8" />
                  <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => copyText(pixData.payload)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
            {!pixData && !loadingPix && pixRetries > 3 && (
              <div className="text-center space-y-2">
                <p className="text-xs text-muted-foreground">QR Code ainda não disponível</p>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { setPixRetries(0); fetchPixQrCode(); }}>
                  <RefreshCw className="h-3 w-3" /> Tentar Novamente
                </Button>
              </div>
            )}
            {result.invoice_url && (
              <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={() => window.open(result.invoice_url, "_blank")}>
                <ExternalLink className="h-3 w-3" /> Abrir Fatura
              </Button>
            )}
          </div>
        )}

        {/* Boleto */}
        {billingType === "BOLETO" && (
          <div className="w-full space-y-2">
            {result.identification_field && (
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground font-medium">Linha Digitável</p>
                <div className="flex items-center gap-2">
                  <Input value={result.identification_field} readOnly className="font-mono text-[10px] bg-muted/50 flex-1 h-8" />
                  <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => copyText(result.identification_field)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
            {result.bar_code && (
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground font-medium">Código de Barras</p>
                <div className="flex items-center gap-2">
                  <Input value={result.bar_code} readOnly className="font-mono text-[10px] bg-muted/50 flex-1 h-8" />
                  <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => copyText(result.bar_code)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              {result.bank_slip_url && (
                <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => window.open(result.bank_slip_url, "_blank")}>
                  <FileText className="h-3 w-3" /> Ver Boleto
                </Button>
              )}
              {result.invoice_url && (
                <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => window.open(result.invoice_url, "_blank")}>
                  <ExternalLink className="h-3 w-3" /> Fatura
                </Button>
              )}
            </div>
          </div>
        )}

        {/* UNDEFINED / Link */}
        {billingType === "UNDEFINED" && (
          <div className="w-full space-y-2">
            {result.invoice_url && (
              <>
                <p className="text-[10px] text-muted-foreground font-medium">Link de Pagamento</p>
                <div className="flex items-center gap-2">
                  <Input value={result.invoice_url} readOnly className="font-mono text-xs bg-muted/50 flex-1" />
                  <Button variant="outline" size="icon" className="shrink-0 h-9 w-9" onClick={() => copyText(result.invoice_url)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={() => window.open(result.invoice_url, "_blank")}>
                  <ExternalLink className="h-3 w-3" /> Abrir Link
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button size="sm" onClick={onClose}>Fechar</Button>
      </DialogFooter>
    </div>
  );
}
