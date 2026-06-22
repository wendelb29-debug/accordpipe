import { useState, useEffect, useMemo } from "react";
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
import { Loader2, MessageSquare, Mail, Users, FileSpreadsheet, UsersRound, ChevronRight, ChevronLeft, Sparkles, FileText, Eye, Code, Monitor, Smartphone, Settings2, Play, AlertCircle, UploadCloud, Download, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { captureAppError } from "@/lib/monitoring";
import { EmailTemplateManager } from "./EmailTemplateManager";
import { CampaignProgressModal } from "./CampaignProgressModal";

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

function providerInitial(p: string): string {
  return ({ gmail: "G", outlook: "O", office365: "O", exchange: "E" } as Record<string, string>)[p] || "@";
}
function providerLabel(p: string): string {
  return ({ gmail: "Gmail", outlook: "Outlook", office365: "Office 365", exchange: "Exchange" } as Record<string, string>)[p] || p;
}
function providerGradient(p: string): string {
  return ({
    gmail: "linear-gradient(135deg, #EA4335, #FBBC04, #34A853, #4285F4)",
    outlook: "linear-gradient(135deg, #0078D4, #50E6FF)",
    office365: "linear-gradient(135deg, #D83B01, #F25022)",
    exchange: "linear-gradient(135deg, #2563EB, #0078D4)",
  } as Record<string, string>)[p] || "linear-gradient(135deg, #64748b, #334155)";
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
  const [excelFile, setExcelFile] = useState<{ name: string; size: number } | null>(null);
  const [excelDragging, setExcelDragging] = useState(false);
  const [excelParsing, setExcelParsing] = useState(false);

  // Preview + send-config + progress state
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [showRaw, setShowRaw] = useState(false);
  const [sampleVars, setSampleVars] = useState<Record<string, string>>({
    nome: "Wendel Silva",
    empresa: "Empresa Exemplo",
    email: "wendel@exemplo.com",
  });
  const [sendConfigOpen, setSendConfigOpen] = useState(false);
  const [campaignProgress, setCampaignProgress] = useState<{ id: string; total: number } | null>(null);

  const renderPreview = (html: string): string => {
    let rendered = html || "";
    Object.entries(sampleVars).forEach(([key, value]) => {
      rendered = rendered.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), value);
    });
    rendered = rendered.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, "[$1]");
    return rendered;
  };

  const previewHtml = useMemo(() => `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;background:#f5f5f5;font-family:Arial,sans-serif;color:#111;">
${renderPreview(body)}
</body></html>`, [body, sampleVars]);

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
        .select("id, provider, email_address, display_name, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          const list = data || [];
          setEmailConnections(list);
          if (list.length === 1) setEmailConnId(list[0].id);
        });
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
    setExcelParsing(true);
    setExcelFile({ name: file.name, size: file.size });
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
      captureAppError(e, { module: "marketing.campaign", action: "parse_spreadsheet" }, "error");
      toast.error("Não foi possível ler o arquivo");
    } finally {
      setExcelParsing(false);
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

      if (channel === "email") {
        // Fire-and-forget processor; UI watches progress via Realtime
        supabase.functions
          .invoke("process-marketing-campaign", { body: { campaign_id: campaign.id } })
          .catch((err) => console.error("[process-marketing-campaign]", err));
        toast.success("Envio iniciado!", { description: "Acompanhe o progresso em tempo real." });
        setCampaignProgress({ id: campaign.id, total: recipients.length });
        setSendConfigOpen(false);
      } else {
        // WhatsApp: fire-and-forget processor; UI watches progress via Realtime
        supabase.functions
          .invoke("process-whatsapp-campaign", { body: { campaign_id: campaign.id } })
          .catch((err) => console.error("[process-whatsapp-campaign]", err));
        toast.success("Envio iniciado!", { description: "Acompanhe o progresso em tempo real." });
        setCampaignProgress({ id: campaign.id, total: recipients.length });
        setSendConfigOpen(false);
      }
    } catch (e: any) {
      captureAppError(e, { module: "marketing.campaign", action: "create" }, "error");
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
                <Label>Conta de envio *</Label>
                {emailConnections.length === 0 ? (
                  <div className="mt-2 p-3.5 rounded-xl border border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-500/10 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                      Nenhuma conta de e-mail conectada.{" "}
                      <a href="/marketing?tab=connections" className="font-bold underline hover:text-amber-900 dark:hover:text-amber-200">
                        Conectar Gmail ou Outlook
                      </a>{" "}
                      antes de criar a campanha.
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    {emailConnections.map((acc) => {
                      const selected = emailConnId === acc.id;
                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => setEmailConnId(acc.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition text-left ${
                            selected
                              ? "border-violet-500 bg-violet-500/5"
                              : "border-border bg-card hover:border-violet-300 hover:bg-violet-500/[0.03]"
                          }`}
                        >
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                            style={{ background: providerGradient(acc.provider) }}
                          >
                            {providerInitial(acc.provider)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold text-foreground truncate flex items-center gap-1.5">
                              {providerLabel(acc.provider)}
                              {selected && <CheckCircle2 className="w-3.5 h-3.5 text-violet-500" />}
                            </div>
                            <div className="text-[11.5px] text-muted-foreground truncate">
                              {acc.display_name ? `${acc.display_name} · ` : ""}{acc.email_address}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    <p className="text-[10.5px] text-muted-foreground pt-1">
                      Os e-mails serão enviados a partir dessa conta. Respeita o limite diário do provedor (Gmail ~500/dia · Outlook ~300/dia).
                    </p>
                  </div>
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
                {/* Step 1 — Template */}
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 shrink-0">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">Modelo de planilha</div>
                      <p className="text-xs text-muted-foreground truncate">
                        Baixe o template, preencha e faça o upload abaixo.
                      </p>
                    </div>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={downloadTemplate} className="gap-1.5 shrink-0">
                    <Download className="h-3.5 w-3.5" /> Baixar .xlsx
                  </Button>
                </div>

                {/* Step 2 — Dropzone */}
                <label
                  htmlFor="campaign-excel-input"
                  onDragOver={e => { e.preventDefault(); setExcelDragging(true); }}
                  onDragLeave={() => setExcelDragging(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setExcelDragging(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleExcel(f);
                  }}
                  className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 cursor-pointer transition ${
                    excelDragging
                      ? "border-emerald-500 bg-emerald-500/5"
                      : excelFile
                        ? "border-emerald-500/40 bg-emerald-500/[0.03]"
                        : "border-border bg-muted/10 hover:border-emerald-500/60 hover:bg-muted/20"
                  }`}
                >
                  <input
                    id="campaign-excel-input"
                    type="file"
                    className="sr-only"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={e => e.target.files?.[0] && handleExcel(e.target.files[0])}
                  />
                  {excelParsing ? (
                    <>
                      <Loader2 className="h-7 w-7 text-emerald-500 animate-spin" />
                      <p className="text-sm font-medium text-foreground">Lendo planilha…</p>
                    </>
                  ) : excelFile ? (
                    <>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div className="flex items-center gap-2 max-w-full">
                        <FileSpreadsheet className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate max-w-[260px]">{excelFile.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {(excelFile.size / 1024).toFixed(1)} KB
                        </span>
                        <button
                          type="button"
                          onClick={e => { e.preventDefault(); e.stopPropagation(); setExcelFile(null); setRecipients([]); }}
                          className="ml-1 flex h-5 w-5 items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
                          aria-label="Remover arquivo"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {recipients.length > 0
                          ? `${recipients.length} destinatários prontos · clique para trocar`
                          : "Clique ou arraste outro arquivo para substituir"}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full transition ${excelDragging ? "bg-emerald-500/20" : "bg-muted"}`}>
                        <UploadCloud className={`h-6 w-6 ${excelDragging ? "text-emerald-500" : "text-muted-foreground"}`} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-foreground">
                          {excelDragging ? "Solte o arquivo aqui" : "Arraste o arquivo ou clique para escolher"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">Formatos suportados: .xlsx, .xls</p>
                      </div>
                    </>
                  )}
                </label>

                {/* Helper */}
                <div className="flex items-start gap-2 rounded-lg bg-muted/30 px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Cabeçalho obrigatório: <code className="rounded bg-background px-1 py-0.5 text-[10px]">nome, email</code> (e-mail) ou{" "}
                    <code className="rounded bg-background px-1 py-0.5 text-[10px]">nome, telefone</code> (WhatsApp). Outras colunas viram variáveis dinâmicas (ex: <code className="rounded bg-background px-1 py-0.5 text-[10px]">{"{{empresa}}"}</code>).
                  </p>
                </div>
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
            {channel === "email" ? (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="mb-0">Corpo do e-mail</Label>
                  <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setShowRaw(false)}
                      className={`h-7 px-3 rounded-md text-[11px] font-semibold inline-flex items-center gap-1 transition ${
                        !showRaw ? "bg-background shadow-sm text-violet-500" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Eye className="w-3 h-3" /> Pré-visualização
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRaw(true)}
                      className={`h-7 px-3 rounded-md text-[11px] font-semibold inline-flex items-center gap-1 transition ${
                        showRaw ? "bg-background shadow-sm text-violet-500" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Code className="w-3 h-3" /> HTML
                    </button>
                  </div>
                </div>

                {showRaw ? (
                  <Textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    rows={12}
                    className="font-mono text-[12px]"
                    placeholder="<p>Olá {{nome}}, ...</p>"
                  />
                ) : (
                  <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card/60">
                      <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground flex-1">
                        Como o destinatário vai ver
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewDevice("desktop")}
                        className={`w-7 h-7 rounded flex items-center justify-center transition ${
                          previewDevice === "desktop" ? "bg-violet-500/15 text-violet-500" : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <Monitor className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewDevice("mobile")}
                        className={`w-7 h-7 rounded flex items-center justify-center transition ${
                          previewDevice === "mobile" ? "bg-violet-500/15 text-violet-500" : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="p-4 bg-muted/30 max-h-[420px] overflow-y-auto flex justify-center">
                      <iframe
                        srcDoc={previewHtml}
                        title="Pré-visualização"
                        className={`bg-white rounded-lg shadow-md border border-border ${
                          previewDevice === "mobile" ? "w-[375px] h-[500px]" : "w-full max-w-2xl h-[450px]"
                        }`}
                        sandbox="allow-same-origin"
                      />
                    </div>
                    <details className="px-3 py-2 border-t border-border bg-muted/10 text-[11px]">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-semibold">
                        Editar valores de exemplo (não afeta o envio real)
                      </summary>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {Object.entries(sampleVars).map(([key, val]) => (
                          <div key={key}>
                            <label className="text-[9.5px] font-mono text-muted-foreground">{`{{${key}}}`}</label>
                            <input
                              value={val}
                              onChange={e => setSampleVars(p => ({ ...p, [key]: e.target.value }))}
                              className="w-full h-7 px-2 rounded border border-border bg-card text-[10.5px] outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
                <p className="text-[10.5px] text-muted-foreground mt-1">
                  Variáveis disponíveis: <code className="font-mono">{`{{nome}}`}</code>{" "}
                  <code className="font-mono">{`{{empresa}}`}</code> + qualquer coluna do Excel.
                </p>
              </div>
            ) : (
              <div>
                <Label>Mensagem</Label>
                <Textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={8}
                  placeholder="Olá {{nome}}, temos uma novidade pra você…"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Variáveis disponíveis: <code>{"{{nome}}"}</code> e qualquer coluna do Excel.
                </p>
              </div>
            )}
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
          {step === 3 && channel === "email" && (
            <Button
              onClick={() => {
                const missing: string[] = [];
                if (!subject.trim()) missing.push("assunto");
                if (!body.trim()) missing.push("corpo do e-mail");
                if (!emailConnId) missing.push(emailConnections.length === 0 ? "conectar uma conta de e-mail" : "selecionar a conta de envio");
                if (missing.length) { toast.error(`Faltando: ${missing.join(", ")}`); return; }
                setSendConfigOpen(true);
              }}
              disabled={submitting}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90 text-white disabled:opacity-60"
            >
              <Play className="h-4 w-4 mr-1.5" fill="currentColor" />
              Configurar e iniciar envio
            </Button>
          )}
          {step === 3 && channel !== "email" && (
            <Button onClick={handleCreate} disabled={!canSubmit || submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar e enfileirar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Send config modal */}
      <Dialog open={sendConfigOpen} onOpenChange={setSendConfigOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
                <Settings2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <div>Configurar envio em massa</div>
                <div className="text-[11px] font-normal text-muted-foreground">
                  Ritmo de disparo evita marca de spam
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">Destinatários</div>
                  <div className="text-[22px] font-bold text-foreground mt-0.5">{recipients.length}</div>
                </div>
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">Tempo estimado</div>
                  <div className="text-[22px] font-bold text-foreground mt-0.5">
                    ~{Math.max(1, Math.ceil((recipients.length * ((throttleMin + throttleMax) / 2)) / 60))} min
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-[12px] font-semibold mb-2 block">Pausa entre cada envio (segundos)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Mínimo</div>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={throttleMin}
                    onChange={e => setThrottleMin(Math.max(1, parseInt(e.target.value) || 1))}
                    className="font-mono"
                  />
                </div>
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Máximo</div>
                  <Input
                    type="number"
                    min={throttleMin}
                    max={120}
                    value={throttleMax}
                    onChange={e => setThrottleMax(Math.max(throttleMin, parseInt(e.target.value) || throttleMin))}
                    className="font-mono"
                  />
                </div>
              </div>
              <p className="text-[10.5px] text-muted-foreground mt-1.5">
                O sistema pausa um tempo aleatório entre <strong>{throttleMin}s</strong> e <strong>{throttleMax}s</strong> entre cada envio. Pausa randomizada imita comportamento humano e reduz risco de spam.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-[11px] text-foreground leading-relaxed">
                <strong>Importante:</strong> uma vez iniciado, o envio não pode ser cancelado para e-mails que já saíram. Você pode fechar essa tela — o envio continua no servidor.
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setSendConfigOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={submitting}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90 text-white"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-1.5" fill="currentColor" />}
              Iniciar envio agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Progress modal */}
      {campaignProgress && (
        <CampaignProgressModal
          campaignId={campaignProgress.id}
          total={campaignProgress.total}
          onClose={() => {
            const id = campaignProgress.id;
            setCampaignProgress(null);
            onCreated(id);
          }}
        />
      )}
    </Dialog>
  );
}
