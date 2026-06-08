import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MessageSquare, Mail, Users, FileSpreadsheet, UsersRound, ChevronRight, ChevronLeft, Sparkles, FileText } from "lucide-react";
import { toast } from "sonner";
import { captureAppError } from "@/lib/monitoring";
import { EmailTemplateManager } from "./EmailTemplateManager";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultChannel: "whatsapp" | "email";
  onCreated: (campaignId: string) => void;
}

interface Recipient {
  name: string;
  contact: string;
  variables: Record<string, string>;
}

export function NewCampaignDialog({ open, onOpenChange, defaultChannel, onCreated }: Props) {
  const { user } = useAuth();
  const companyId = useActiveCompanyId();
  const [step, setStep] = useState(1);
  const [channel, setChannel] = useState<"whatsapp" | "email">(defaultChannel);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audienceSource, setAudienceSource] = useState<"clients" | "leads" | "csv">("clients");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loadingAudience, setLoadingAudience] = useState(false);
  const [emailConnections, setEmailConnections] = useState<any[]>([]);
  const [emailConnId, setEmailConnId] = useState<string>("");
  const [throttleMin, setThrottleMin] = useState(5);
  const [throttleMax, setThrottleMax] = useState(15);
  const [submitting, setSubmitting] = useState(false);
  const [pickTemplateOpen, setPickTemplateOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setChannel(defaultChannel);
      setStep(1);
      setName("");
      setSubject("");
      setBody("");
      setAudienceSource("clients");
      setRecipients([]);
      setEmailConnId("");
    }
  }, [open, defaultChannel]);

  useEffect(() => {
    if (channel === "email" && open && user) {
      supabase
        .from("marketing_email_connections")
        .select("id, provider, email_address, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .then(({ data }) => setEmailConnections(data || []));
    }
  }, [channel, open, user]);

  const loadAudience = async (source: "clients" | "leads") => {
    if (!companyId) return;
    setLoadingAudience(true);
    try {
      if (source === "clients") {
        const { data } = await supabase
          .from("master_tenant_clients")
          .select("razao_social, nome_fantasia, email, telefone")
          .eq("tenant_id", companyId)
          .limit(2000);
        const list: Recipient[] = (data || []).map((c: any) => ({
          name: c.nome_fantasia || c.razao_social || "",
          contact: channel === "email" ? (c.email || "") : (c.telefone || ""),
          variables: { nome: c.nome_fantasia || c.razao_social || "" },
        })).filter(r => r.contact);
        setRecipients(list);
      } else {
        const { data } = await supabase
          .from("crm_leads")
          .select("nome, email, telefone")
          .eq("servidor_id", companyId)
          .limit(2000);
        const list: Recipient[] = (data || []).map((l: any) => ({
          name: l.nome || "",
          contact: channel === "email" ? (l.email || "") : (l.telefone || ""),
          variables: { nome: l.nome || "" },
        })).filter(r => r.contact);
        setRecipients(list);
      }
    } finally {
      setLoadingAudience(false);
    }
  };

  const handleExcel = async (file: File) => {
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "", raw: false });
      if (!rows.length) {
        toast.error("Planilha vazia");
        return;
      }
      const keys = Object.keys(rows[0]).map(k => k.toLowerCase());
      const contactKey = Object.keys(rows[0]).find(k => ["email", "telefone", "phone", "whatsapp", "contato"].includes(k.toLowerCase()));
      const nameKey = Object.keys(rows[0]).find(k => ["nome", "name"].includes(k.toLowerCase()));
      if (!contactKey) {
        toast.error("Planilha precisa de coluna 'email' ou 'telefone'");
        return;
      }
      const list: Recipient[] = [];
      for (const row of rows) {
        const contact = String(row[contactKey] ?? "").trim();
        if (!contact) continue;
        const nameVal = nameKey ? String(row[nameKey] ?? "").trim() : "";
        const vars: Record<string, string> = {};
        Object.entries(row).forEach(([k, v]) => {
          const val = String(v ?? "").trim();
          if (val) vars[k.toLowerCase()] = val;
        });
        list.push({ name: nameVal, contact, variables: vars });
      }
      setRecipients(list);
      toast.success(`${list.length} destinatários carregados`);
    } catch (e: any) {
      toast.error("Erro ao ler planilha: " + (e.message || e));
    }
  };

  const downloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const headers = channel === "email"
      ? ["nome", "email", "empresa"]
      : ["nome", "telefone", "empresa"];
    const examples = channel === "email"
      ? [
          ["João Silva", "joao@exemplo.com", "Acme"],
          ["Maria Souza", "maria@exemplo.com", "Contoso"],
        ]
      : [
          ["João Silva", "5511999990000", "Acme"],
          ["Maria Souza", "5511988880000", "Contoso"],
        ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...examples]);
    ws["!cols"] = headers.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Destinatários");
    XLSX.writeFile(wb, `modelo-campanha-${channel}.xlsx`);
  };


  const canGoStep2 = name.trim().length > 0;
  const canGoStep3 = recipients.length > 0;
  const canSubmit = body.trim().length > 0 && (channel !== "email" || (subject.trim().length > 0 && emailConnId));

  const handleCreate = async () => {
    if (!companyId || !user) return;
    setSubmitting(true);
    try {
      const { data: campaign, error } = await supabase
        .from("marketing_campaigns")
        .insert({
          servidor_id: companyId,
          created_by: user.id,
          name,
          channel,
          subject: channel === "email" ? subject : null,
          body,
          audience_source: audienceSource,
          status: "queued",
          email_provider: channel === "email" ? (emailConnections.find(c => c.id === emailConnId)?.provider ?? null) : null,
          email_connection_id: channel === "email" ? emailConnId : null,
          throttle_min_ms: throttleMin * 1000,
          throttle_max_ms: throttleMax * 1000,
          total_recipients: recipients.length,
        })
        .select("id")
        .single();
      if (error) throw error;

      // Insert recipients in chunks
      const chunkSize = 500;
      for (let i = 0; i < recipients.length; i += chunkSize) {
        const chunk = recipients.slice(i, i + chunkSize).map(r => ({
          campaign_id: campaign.id,
          servidor_id: companyId,
          name: r.name || null,
          contact: r.contact,
          variables: r.variables,
        }));
        const { error: rErr } = await supabase.from("marketing_campaign_recipients").insert(chunk);
        if (rErr) throw rErr;
      }

      toast.success("Campanha criada e enfileirada");
      onCreated(campaign.id);
    } catch (e: any) {
      toast.error("Erro ao criar campanha: " + (e.message || e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {channel === "whatsapp" ? <MessageSquare className="h-5 w-5 text-emerald-400" /> : <Mail className="h-5 w-5 text-blue-400" />}
            Nova campanha {channel === "whatsapp" ? "WhatsApp" : "E-mail"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <span className={step >= 1 ? "text-foreground font-medium" : ""}>1. Detalhes</span>
          <ChevronRight className="h-3 w-3" />
          <span className={step >= 2 ? "text-foreground font-medium" : ""}>2. Audiência</span>
          <ChevronRight className="h-3 w-3" />
          <span className={step >= 3 ? "text-foreground font-medium" : ""}>3. Mensagem</span>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Nome da campanha</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Black Friday Outubro" />
            </div>
            {channel === "email" && (
              <div>
                <Label>Conta de envio</Label>
                {emailConnections.length === 0 ? (
                  <p className="text-xs text-amber-400 mt-2">
                    Você precisa conectar um Gmail ou Outlook na aba "Conexões de E-mail" antes de criar campanhas por e-mail.
                  </p>
                ) : (
                  <Select value={emailConnId} onValueChange={setEmailConnId}>
                    <SelectTrigger><SelectValue placeholder="Escolha a conta" /></SelectTrigger>
                    <SelectContent>
                      {emailConnections.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.provider.toUpperCase()} · {c.email_address}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Pausa mínima (s)</Label>
                <Input type="number" value={throttleMin} onChange={e => setThrottleMin(+e.target.value)} min={1} />
              </div>
              <div>
                <Label className="text-xs">Pausa máxima (s)</Label>
                <Input type="number" value={throttleMax} onChange={e => setThrottleMax(+e.target.value)} min={1} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {channel === "whatsapp"
                ? "Pausa aleatória entre envios reduz risco de banimento no WhatsApp. Recomendado: 5–15s."
                : "Pausa entre envios respeita o limite diário do Gmail (~500/dia) e Outlook (~300/dia)."}
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Tabs value={audienceSource} onValueChange={(v) => { setAudienceSource(v as any); setRecipients([]); }}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="clients"><UsersRound className="h-4 w-4 mr-1" />Base Clientes</TabsTrigger>
                <TabsTrigger value="leads"><Users className="h-4 w-4 mr-1" />CRM Leads</TabsTrigger>
                <TabsTrigger value="csv"><FileSpreadsheet className="h-4 w-4 mr-1" />Excel</TabsTrigger>
              </TabsList>
              <TabsContent value="clients" className="space-y-3 pt-3">
                <Button onClick={() => loadAudience("clients")} disabled={loadingAudience} size="sm">
                  {loadingAudience && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Carregar Base de Clientes
                </Button>
              </TabsContent>
              <TabsContent value="leads" className="space-y-3 pt-3">
                <Button onClick={() => loadAudience("leads")} disabled={loadingAudience} size="sm">
                  {loadingAudience && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Carregar CRM Leads
                </Button>
              </TabsContent>
              <TabsContent value="csv" className="space-y-3 pt-3">
                <div className="flex items-center justify-between rounded-md border border-dashed border-border bg-muted/20 p-3">
                  <div className="text-xs">
                    <div className="font-medium text-foreground flex items-center gap-1">
                      <FileSpreadsheet className="h-3.5 w-3.5" /> Modelo de planilha Excel
                    </div>
                    <p className="text-muted-foreground mt-0.5">
                      Baixe o template .xlsx, preencha e faça o upload abaixo.
                    </p>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={downloadTemplate}>
                    Baixar modelo .xlsx
                  </Button>
                </div>
                <Input
                  type="file"
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={e => e.target.files?.[0] && handleExcel(e.target.files[0])}
                />
                <p className="text-xs text-muted-foreground">
                  A primeira planilha do arquivo será lida. Cabeçalho obrigatório: <code>nome, email</code> (e-mail) ou <code>nome, telefone</code> (WhatsApp). Outras colunas viram variáveis dinâmicas (ex: <code>{"{{empresa}}"}</code>).
                </p>
              </TabsContent>
            </Tabs>
            {recipients.length > 0 && (
              <div className="rounded-md border border-border bg-muted/20 p-3 text-sm">
                <strong>{recipients.length}</strong> destinatários carregados.{" "}
                <span className="text-muted-foreground">
                  Prévia: {recipients.slice(0, 3).map(r => r.name || r.contact).join(", ")}
                  {recipients.length > 3 && "…"}
                </span>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {channel === "email" && (
              <div className="grid grid-cols-2 gap-3 mb-2">
                <button
                  type="button"
                  onClick={() => setPickTemplateOpen(true)}
                  className="flex items-center gap-3 p-4 rounded-xl border-2 border-border hover:border-violet-400 bg-card hover:bg-violet-500/5 transition text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-[13.5px] font-bold text-foreground">Escolher template</div>
                    <div className="text-[11px] text-muted-foreground">Use um da sua biblioteca</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { setSubject(""); setBody(""); }}
                  className="flex items-center gap-3 p-4 rounded-xl border-2 border-border hover:border-emerald-400 bg-card hover:bg-emerald-500/5 transition text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-[13.5px] font-bold text-foreground">Criar do zero</div>
                    <div className="text-[11px] text-muted-foreground">Escreva HTML manualmente</div>
                  </div>
                </button>
              </div>
            )}
            {channel === "email" && (
              <div>
                <Label>Assunto</Label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Assunto do e-mail" />
              </div>
            )}
            <div>
              <Label>{channel === "email" ? "Corpo (HTML permitido)" : "Mensagem"}</Label>
              <Textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={8}
                placeholder={channel === "whatsapp"
                  ? "Olá {{nome}}, temos uma novidade pra você…"
                  : "<p>Olá {{nome}},</p><p>Temos uma novidade…</p>"}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Variáveis disponíveis: <code>{"{{nome}}"}</code> e qualquer coluna do CSV.
              </p>
            </div>
            <EmailTemplateManager
              open={pickTemplateOpen}
              onOpenChange={setPickTemplateOpen}
              mode="pick"
              onSelectTemplate={(t) => {
                setSubject(t.subject);
                setBody(t.body_html);
                toast.success("Template aplicado! Você pode editar antes de enviar.");
              }}
            />
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={submitting}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          )}
          {step < 3 && (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={(step === 1 && !canGoStep2) || (step === 2 && !canGoStep3)}
            >
              Continuar <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {step === 3 && (
            <Button onClick={handleCreate} disabled={!canSubmit || submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar e enfileirar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
