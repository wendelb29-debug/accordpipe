import { useEffect, useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, Mail, ChevronLeft, ChevronRight, Loader2, AlertTriangle, Upload, Save, Star, Info, Trash2, Plus, Braces, Paperclip, Image as ImageIcon, FileText, Mic, Video, X, Rabbit, Gauge, Zap, Hand } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import * as XLSX from "xlsx";
import { COUNTRIES, DEFAULT_COUNTRY, findCountryByDial, Country } from "./countries";
import { DdiPicker } from "./DdiPicker";

interface Props {
  open: boolean;
  onClose: () => void;
  tenantId: string;
}

type Channel = "whatsapp" | "email";
type Speed = "slow" | "medium" | "fast" | "manual";

interface AudienceRow {
  name?: string;
  contact: string;
  variables?: Record<string, any>;
}

interface MediaAttachment {
  url: string;
  path: string;
  type: "image" | "video" | "audio" | "document";
  mime: string;
  filename: string;
}

interface FormState {
  name: string;
  description: string;
  channel: Channel;
  channel_ref: string;
  audience_mode: "file" | "crm" | "manual";
  audience_snapshot: AudienceRow[];
  content_type: "template" | "editor";
  template_id: string | null;
  subject: string;
  body: string;
  media: MediaAttachment | null;
  speed: Speed;
  batch_size: number;
  batch_interval_min: number;
  scheduled_at: string;
  daily_window_start: string;
  daily_window_end: string;
}

const initialForm: FormState = {
  name: "", description: "", channel: "whatsapp", channel_ref: "",
  audience_mode: "manual", audience_snapshot: [],
  content_type: "editor", template_id: null, subject: "", body: "", media: null,
  speed: "medium", batch_size: 50, batch_interval_min: 10,
  scheduled_at: "", daily_window_start: "00:00", daily_window_end: "23:59",
};

const steps = ["Dados", "Público-alvo", "Conteúdo", "Configurações"];

export function MassCampaignWizard({ open, onClose, tenantId }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [saving, setSaving] = useState(false);
  const [manualText, setManualText] = useState("");
  const [customVars, setCustomVars] = useState<string[]>([]);
  const [newVar, setNewVar] = useState("");
  const [manualCountries, setManualCountries] = useState<Country[]>([]);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Channel options
  const [waInstances, setWaInstances] = useState<any[]>([]);
  const [emailAccounts, setEmailAccounts] = useState<any[]>([]);

  // Templates (mass + whatsapp official)
  const [templates, setTemplates] = useState<any[]>([]);
  const [waTemplates, setWaTemplates] = useState<any[]>([]);
  const [templateSearch, setTemplateSearch] = useState("");

  // CRM filter
  const [crmLoading, setCrmLoading] = useState(false);
  const [crmTags, setCrmTags] = useState<any[]>([]);
  const [crmWorkspaces, setCrmWorkspaces] = useState<any[]>([]);
  const [crmFilter, setCrmFilter] = useState<{ workspace_id?: string; tag?: string; ddd?: string; domain?: string }>({});
  const [crmPreview, setCrmPreview] = useState<any[]>([]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!open || !tenantId) return;
    (async () => {
      const sb = supabase as any;
      const [wa, waInt, em, tpl, waTpl, tags, ws] = await Promise.all([
        sb.from("whatsapp_instances").select("id,instance_name,phone_number,status").eq("tenant_id", tenantId),
        sb.from("tenant_whatsapp_integrations")
          .select("id,provider_type,instance_name,connected_phone,is_active,connection_status")
          .eq("tenant_id", tenantId)
          .eq("is_active", true),
        sb.from("email_accounts").select("id,email_address,display_name,provider,status").eq("servidor_id", tenantId).in("status", ["connected", "active"]),
        sb.from("mass_templates").select("*").eq("tenant_id", tenantId).order("updated_at", { ascending: false }),
        sb.from("whatsapp_templates").select("*").eq("tenant_id", tenantId).order("updated_at", { ascending: false }),
        sb.from("crm_tags").select("id,name").eq("server_id", tenantId).limit(200),
        sb.from("workspaces").select("id,name").eq("server_id", tenantId).limit(200),
      ]);
      const fromIntegrations = ((waInt.data as any[]) || []).map((r) => ({
        id: r.id,
        instance_name: r.instance_name || (r.provider_type === "uazapi" ? "Uazapi" : r.provider_type === "zapi" ? "Z-API" : "WhatsApp"),
        phone_number: r.connected_phone || null,
        status: r.connection_status || (r.is_active ? "connected" : "disconnected"),
      }));
      const fromInstances = ((wa.data as any[]) || []).map((r) => ({
        id: r.id,
        instance_name: r.instance_name || "Instância",
        phone_number: r.phone_number || null,
        status: r.status || null,
      }));
      const merged = fromIntegrations.length ? fromIntegrations : fromInstances;
      setWaInstances(merged);
      setEmailAccounts((em.data as any) || []);
      setTemplates((tpl.data as any) || []);
      setWaTemplates((waTpl.data as any) || []);
      setCrmTags((tags.data as any) || []);
      setCrmWorkspaces((ws.data as any) || []);
    })();
  }, [open, tenantId]);

  const filteredTemplates = useMemo(() => {
    const q = templateSearch.toLowerCase();
    if (form.channel === "whatsapp") {
      // Prefer WhatsApp official templates from "Templates" page; keep saved mass_templates too
      const wa = waTemplates.map((t: any) => ({
        id: `wa:${t.id}`,
        raw_id: t.id,
        source: "whatsapp_templates" as const,
        name: t.name,
        body: t.body,
        subject: null,
        category: t.header_type && t.header_type !== "none" ? t.header_type : null,
        is_favorite: !!t.is_favorite,
        header_type: t.header_type,
        header_media_url: t.header_media_url,
      }));
      const mass = templates.filter(t => t.channel === "whatsapp").map((t: any) => ({
        id: `mass:${t.id}`,
        raw_id: t.id,
        source: "mass_templates" as const,
        name: t.name,
        body: t.body,
        subject: null,
        category: t.category,
        is_favorite: !!t.is_favorite,
      }));
      return [...wa, ...mass].filter(t => !q || t.name.toLowerCase().includes(q));
    }
    return templates
      .filter(t => t.channel === "email" && (!q || t.name.toLowerCase().includes(q)))
      .map((t: any) => ({ id: `mass:${t.id}`, raw_id: t.id, source: "mass_templates" as const, name: t.name, body: t.body, subject: t.subject, category: t.category, is_favorite: !!t.is_favorite }));
  }, [templates, waTemplates, form.channel, templateSearch]);

  const parseManual = () => {
    const rows = manualText.split("\n").map(l => l.trim()).filter(Boolean).map(l => {
      const [name, contact, ...rest] = l.split(/[,;\t]/).map(s => s.trim());
      return { name: name || "", contact: contact || name, variables: { extra: rest.join(",") } };
    }).filter(r => r.contact);
    update("audience_snapshot", rows);
    toast.success(`${rows.length} contato(s) importado(s)`);
  };

  const handleFileUpload = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const rows: AudienceRow[] = json.map(r => {
        const keys = Object.keys(r);
        const nameKey = keys.find(k => /nome|name/i.test(k));
        const contactKey = keys.find(k => form.channel === "email" ? /e-?mail/i.test(k) : /(telefone|phone|whats|celular|contato)/i.test(k));
        const name = nameKey ? String(r[nameKey]) : "";
        const contact = contactKey ? String(r[contactKey]) : String(r[keys[1] || keys[0]] || "");
        const variables: Record<string, any> = {};
        keys.forEach(k => { if (k !== nameKey && k !== contactKey) variables[k] = r[k]; });
        return { name, contact, variables };
      }).filter(r => r.contact);
      update("audience_snapshot", rows);
      toast.success(`${rows.length} contato(s) importado(s) do arquivo`);
    } catch (e: any) {
      toast.error("Erro ao ler arquivo: " + e.message);
    }
  };

  const loadCrmAudience = async () => {
    setCrmLoading(true);
    let q: any = (supabase as any).from("crm_leads").select("id,name,email,phone,whatsapp,tags,workspace_id").eq("server_id", tenantId).limit(2000);
    if (crmFilter.workspace_id) q = q.eq("workspace_id", crmFilter.workspace_id);
    const { data, error } = await q;
    setCrmLoading(false);
    if (error) { toast.error(error.message); return; }
    let rows = (data || []) as any[];
    if (crmFilter.tag) rows = rows.filter(r => Array.isArray(r.tags) && r.tags.includes(crmFilter.tag));
    if (form.channel === "whatsapp") {
      if (crmFilter.ddd) rows = rows.filter(r => (r.whatsapp || r.phone || "").replace(/\D/g, "").includes(crmFilter.ddd!));
      rows = rows.filter(r => r.whatsapp || r.phone);
    } else {
      if (crmFilter.domain) rows = rows.filter(r => (r.email || "").toLowerCase().endsWith(crmFilter.domain!.toLowerCase()));
      rows = rows.filter(r => r.email);
    }
    const audience: AudienceRow[] = rows.map(r => ({
      name: r.name,
      contact: form.channel === "email" ? r.email : (r.whatsapp || r.phone),
      variables: { nome: r.name, email: r.email, phone: r.whatsapp || r.phone },
    }));
    setCrmPreview(audience.slice(0, 5));
    update("audience_snapshot", audience);
    toast.success(`${audience.length} lead(s) selecionado(s)`);
  };

  const applyTemplate = (t: any) => {
    update("template_id", t.id);
    update("content_type", "template");
    update("subject", t.subject || "");
    update("body", t.body || "");
  };

  const saveAsTemplate = async () => {
    if (!form.body.trim()) { toast.error("Escreva o conteúdo antes de salvar"); return; }
    const name = window.prompt("Nome do modelo:", form.name || "Novo modelo");
    if (!name) return;
    const { data: user } = await supabase.auth.getUser();
    const { error } = await supabase.from("mass_templates" as any).insert({
      tenant_id: tenantId, name, channel: form.channel,
      subject: form.channel === "email" ? form.subject : null,
      body: form.body, created_by: user.user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Modelo salvo");
    const { data: tpl } = await supabase.from("mass_templates" as any).select("*").eq("tenant_id", tenantId).order("updated_at", { ascending: false });
    setTemplates((tpl as any) || []);
  };

  const canProceed = () => {
    if (step === 0) return form.name.trim().length >= 2 && !!form.channel_ref;
    if (step === 1) return form.audience_snapshot.length > 0;
    if (step === 2) return form.body.trim().length > 0 && (form.channel !== "email" || form.subject.trim().length > 0);
    return true;
  };

  const handleSave = async (asDraft: boolean) => {
    if (!tenantId) { toast.error("Tenant não identificado"); return; }
    setSaving(true);
    const status = asDraft ? "draft" : form.scheduled_at ? "scheduled" : "running";
    const { data: user } = await supabase.auth.getUser();
    const { data: camp, error } = await (supabase.from("mass_campaigns" as any).insert({
      tenant_id: tenantId, name: form.name, description: form.description || null,
      channel: form.channel, channel_ref: form.channel_ref || null, status,
      audience_mode: form.audience_mode, audience_snapshot: form.audience_snapshot,
      content_type: form.content_type, template_id: form.template_id,
      subject: form.channel === "email" ? form.subject : null, body: form.body,
      speed: form.speed, batch_size: form.batch_size, batch_interval_min: form.batch_interval_min,
      scheduled_at: form.scheduled_at || null,
      daily_window_start: form.daily_window_start || null, daily_window_end: form.daily_window_end || null,
      totals: { queued: form.audience_snapshot.length, sent: 0, failed: 0, replied: 0 },
      created_by: user.user?.id,
    }).select().single() as any);
    if (error || !camp) { toast.error(error?.message || "Erro ao salvar"); setSaving(false); return; }

    const recipients = form.audience_snapshot.map((r: any) => ({
      campaign_id: camp.id, tenant_id: tenantId, name: r.name || null,
      contact: r.contact, variables: r.variables || {}, status: "pending",
    }));
    if (recipients.length) await supabase.from("mass_campaign_recipients" as any).insert(recipients);

    toast.success(asDraft ? "Rascunho salvo" : "Campanha criada");
    setSaving(false);
    setForm(initialForm); setStep(0); onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova campanha — {steps[step]}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 my-4">
          {steps.map((s, i) => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-emerald-500/20 text-emerald-400" : "bg-muted text-muted-foreground"}`}>{i + 1}</div>
              <span className={`text-xs ${i === step ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s}</span>
              {i < steps.length - 1 && <div className="flex-1 h-px bg-border" />}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <div>
              <Label>Nome da campanha *</Label>
              <Input value={form.name} onChange={e => update("name", e.target.value)} placeholder="Ex.: Black Friday — reativação" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={e => update("description", e.target.value)} rows={2} />
            </div>
            <div>
              <Label>Canal *</Label>
              <RadioGroup value={form.channel} onValueChange={(v) => { update("channel", v as Channel); update("channel_ref", ""); }} className="grid grid-cols-2 gap-3 mt-2">
                <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${form.channel === "whatsapp" ? "border-primary bg-primary/5" : "border-border"}`}>
                  <RadioGroupItem value="whatsapp" />
                  <MessageSquare className="w-5 h-5 text-emerald-400" />
                  <div><div className="font-medium">WhatsApp</div><div className="text-xs text-muted-foreground">{waInstances.length} instância(s)</div></div>
                </label>
                <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${form.channel === "email" ? "border-primary bg-primary/5" : "border-border"}`}>
                  <RadioGroupItem value="email" />
                  <Mail className="w-5 h-5 text-blue-400" />
                  <div><div className="font-medium">E-mail</div><div className="text-xs text-muted-foreground">{emailAccounts.length} conta(s)</div></div>
                </label>
              </RadioGroup>
            </div>
            <div>
              <Label>{form.channel === "whatsapp" ? "Instância WhatsApp *" : "Conta de e-mail *"}</Label>
              <Select value={form.channel_ref} onValueChange={(v) => update("channel_ref", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {form.channel === "whatsapp"
                    ? waInstances.map(i => <SelectItem key={i.id} value={i.id}>{i.instance_name} {i.phone_number ? `· ${i.phone_number}` : ""} {i.status ? `(${i.status})` : ""}</SelectItem>)
                    : emailAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.email_address || a.display_name} · {a.provider}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.channel === "whatsapp" && waInstances.length === 0 && (
                <p className="text-xs text-amber-400 mt-1">Nenhuma instância conectada. Configure em /configuracoes/whatsapp.</p>
              )}
              {form.channel === "email" && emailAccounts.length === 0 && (
                <p className="text-xs text-amber-400 mt-1">Nenhuma conta de e-mail conectada. Configure em /email.</p>
              )}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Modo de seleção</Label>
              <RadioGroup value={form.audience_mode} onValueChange={(v) => { update("audience_mode", v as any); update("audience_snapshot", []); }} className="grid grid-cols-3 gap-2 mt-2">
                {[{ v: "manual", label: "Manual" }, { v: "file", label: "Upload CSV/XLSX" }, { v: "crm", label: "Base do CRM" }].map(o => (
                  <label key={o.v} className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer text-sm ${form.audience_mode === o.v ? "border-primary bg-primary/5" : "border-border"}`}>
                    <RadioGroupItem value={o.v} />{o.label}
                  </label>
                ))}
              </RadioGroup>
            </div>

            {form.audience_mode === "manual" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold">Para quem quer enviar?</h3>
                  <p className="text-xs text-muted-foreground">
                    Adicione os contatos que receberão as mensagens. {form.channel === "email" ? "E-mail" : "Telefone"} é obrigatório.
                  </p>
                </div>

                <Alert
                  className="border-amber-400/30 bg-amber-500/10 cursor-pointer"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (!text.trim()) { toast.error("Área de transferência vazia"); return; }
                      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                      if (lines.length < 2) { toast.error("Cole ao menos um cabeçalho e uma linha"); return; }
                      const sep = lines[0].includes(";") ? ";" : lines[0].includes("\t") ? "\t" : ",";
                      const headers = lines[0].split(sep).map(h => h.trim().toLowerCase());
                      const nameIdx = headers.findIndex(h => /nome|name/.test(h));
                      const contactIdx = headers.findIndex(h => form.channel === "email" ? /e-?mail/.test(h) : /telefone|phone|whats|celular/.test(h));
                      const extraKeys = headers.filter((h, i) => i !== nameIdx && i !== contactIdx);
                      const rows: AudienceRow[] = lines.slice(1).map(l => {
                        const parts = l.split(sep).map(s => s.trim());
                        const variables: Record<string, any> = {};
                        headers.forEach((h, i) => { if (i !== nameIdx && i !== contactIdx) variables[h] = parts[i] || ""; });
                        return { name: nameIdx >= 0 ? parts[nameIdx] || "" : "", contact: contactIdx >= 0 ? parts[contactIdx] || "" : parts[1] || parts[0] || "", variables };
                      }).filter(r => r.contact);
                      setCustomVars(prev => Array.from(new Set([...prev, ...extraKeys])));
                      update("audience_snapshot", rows);
                      toast.success(`${rows.length} contato(s) importado(s) da área de transferência`);
                    } catch {
                      toast.error("Não foi possível ler a área de transferência");
                    }
                  }}
                >
                  <Info className="w-4 h-4 text-amber-400" />
                  <AlertDescription className="text-xs text-amber-200">
                    Cole uma lista CSV. Com cabeçalho (ex.: <strong>Nome, {form.channel === "email" ? "Email" : "Telefone"}, CPF</strong>), as colunas extras viram variáveis automaticamente.
                  </AlertDescription>
                </Alert>

                <div className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Braces className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Variáveis personalizadas</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {customVars.map(v => (
                      <Badge key={v} variant="secondary" className="gap-1">
                        {v}
                        <button
                          type="button"
                          className="ml-1 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setCustomVars(prev => prev.filter(x => x !== v));
                            update("audience_snapshot", form.audience_snapshot.map(r => {
                              const { [v]: _drop, ...rest } = r.variables || {};
                              return { ...r, variables: rest };
                            }));
                          }}
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                    <Input
                      value={newVar}
                      onChange={e => setNewVar(e.target.value)}
                      placeholder="ex.: cpf, empresa..."
                      className="w-40 h-8 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const k = newVar.trim().toLowerCase().replace(/\s+/g, "_");
                          if (k && !customVars.includes(k)) setCustomVars(prev => [...prev, k]);
                          setNewVar("");
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1"
                      onClick={() => {
                        const k = newVar.trim().toLowerCase().replace(/\s+/g, "_");
                        if (k && !customVars.includes(k)) setCustomVars(prev => [...prev, k]);
                        setNewVar("");
                      }}
                    >
                      <Plus className="w-3 h-3" /> Variável
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use no conteúdo como <code className="text-amber-400">{"{{variavel}}"}</code>. Nome e {form.channel === "email" ? "Email" : "Telefone"} já são padrão.
                  </p>
                </div>

                <div className="space-y-2">
                  {(form.audience_snapshot.length === 0 ? [{ name: "", contact: "", variables: {} } as AudienceRow] : form.audience_snapshot).map((row, idx) => (
                    <div key={idx} className="grid gap-2 items-end" style={{ gridTemplateColumns: `1fr 1fr ${customVars.map(() => "1fr").join(" ")} auto` }}>
                      <div>
                        {idx === 0 && <Label className="text-xs">Nome</Label>}
                        <Input
                          value={row.name || ""}
                          placeholder="Nome do contato"
                          onChange={(e) => {
                            const list = form.audience_snapshot.length === 0 ? [row] : [...form.audience_snapshot];
                            list[idx] = { ...list[idx], name: e.target.value };
                            update("audience_snapshot", list);
                          }}
                        />
                      </div>
                      <div>
                        {idx === 0 && <Label className="text-xs">{form.channel === "email" ? "E-mail" : "Telefone"}</Label>}
                        <div className="relative">
                          {form.channel === "whatsapp" && (
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">🇧🇷</span>
                          )}
                          <Input
                            value={row.contact || ""}
                            placeholder={form.channel === "email" ? "email@exemplo.com" : "+55"}
                            className={form.channel === "whatsapp" ? "pl-9" : ""}
                            onChange={(e) => {
                              const list = form.audience_snapshot.length === 0 ? [row] : [...form.audience_snapshot];
                              list[idx] = { ...list[idx], contact: e.target.value };
                              update("audience_snapshot", list);
                            }}
                          />
                        </div>
                      </div>
                      {customVars.map(v => (
                        <div key={v}>
                          {idx === 0 && <Label className="text-xs">{v}</Label>}
                          <Input
                            value={(row.variables || {})[v] || ""}
                            placeholder={v}
                            onChange={(e) => {
                              const list = form.audience_snapshot.length === 0 ? [row] : [...form.audience_snapshot];
                              list[idx] = { ...list[idx], variables: { ...(list[idx].variables || {}), [v]: e.target.value } };
                              update("audience_snapshot", list);
                            }}
                          />
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-red-400 hover:text-red-500 hover:bg-red-500/10"
                        onClick={() => {
                          const list = form.audience_snapshot.filter((_, i) => i !== idx);
                          update("audience_snapshot", list);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed gap-2 border-amber-400/40 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                  onClick={() => {
                    const list = form.audience_snapshot.length === 0
                      ? [{ name: "", contact: "", variables: {} }, { name: "", contact: "", variables: {} }]
                      : [...form.audience_snapshot, { name: "", contact: "", variables: {} }];
                    update("audience_snapshot", list);
                  }}
                >
                  <Plus className="w-4 h-4" /> Adicionar nova linha
                </Button>
              </div>
            )}

            {form.audience_mode === "file" && (
              <div className="space-y-2">
                <Label>Arquivo CSV ou XLSX</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} className="text-sm" />
                  <p className="text-xs text-muted-foreground mt-2">A primeira coluna deve conter nome; a coluna de {form.channel === "email" ? "e-mail" : "telefone"} é detectada pelo cabeçalho. Demais colunas viram variáveis.</p>
                </div>
              </div>
            )}

            {form.audience_mode === "crm" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Pipeline (workspace)</Label>
                    <Select value={crmFilter.workspace_id || "__all"} onValueChange={(v) => setCrmFilter(f => ({ ...f, workspace_id: v === "__all" ? undefined : v }))}>
                      <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all">Todos</SelectItem>
                        {crmWorkspaces.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tag</Label>
                    <Select value={crmFilter.tag || "__all"} onValueChange={(v) => setCrmFilter(f => ({ ...f, tag: v === "__all" ? undefined : v }))}>
                      <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all">Todas</SelectItem>
                        {crmTags.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {form.channel === "whatsapp" ? (
                    <div><Label>DDD contém</Label><Input value={crmFilter.ddd || ""} onChange={e => setCrmFilter(f => ({ ...f, ddd: e.target.value }))} placeholder="Ex.: 11" /></div>
                  ) : (
                    <div><Label>Domínio</Label><Input value={crmFilter.domain || ""} onChange={e => setCrmFilter(f => ({ ...f, domain: e.target.value }))} placeholder="@empresa.com.br" /></div>
                  )}
                </div>
                <Button onClick={loadCrmAudience} disabled={crmLoading} size="sm">
                  {crmLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Carregar leads
                </Button>
                {crmPreview.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Amostra: {crmPreview.map(p => p.name || p.contact).join(", ")}
                  </div>
                )}
              </div>
            )}

            {form.audience_snapshot.length > 0 && (
              <Alert><AlertDescription>✓ {form.audience_snapshot.length} destinatários prontos.</AlertDescription></Alert>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-12 gap-4">
            {/* Coluna esquerda — Tipo de conteúdo */}
            <div className="col-span-12 md:col-span-3 space-y-2">
              <div>
                <p className="text-sm font-semibold">Tipo de conteúdo</p>
                <p className="text-xs text-muted-foreground">Escolha como o conteúdo será enviado aos contatos</p>
              </div>
              <button
                type="button"
                onClick={() => update("content_type", "editor")}
                className={`w-full text-left p-3 border rounded-xl transition ${form.content_type === "editor" ? "border-primary bg-primary/5 ring-1 ring-primary/40" : "border-border hover:bg-muted/40"}`}
              >
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Save className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Criar mensagem</span>
                      <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary/15 text-primary border-0">NEW</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Selecione o template a enviar e configure as variáveis e ações de botões, se necessário</p>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => update("content_type", "template")}
                className={`w-full text-left p-3 border rounded-xl transition ${form.content_type === "template" ? "border-primary bg-primary/5 ring-1 ring-primary/40" : "border-border hover:bg-muted/40"}`}
              >
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                    <Star className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium">Usar modelo salvo</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Reaproveite um modelo já salvo anteriormente</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Coluna central — Template + editor */}
            <div className="col-span-12 md:col-span-6 space-y-3">
              <div>
                <p className="text-sm font-semibold">Selecione o template</p>
                <p className="text-xs text-muted-foreground">Canal oficial: escolha um template aprovado e mapeie as variáveis.</p>
              </div>

              {form.content_type === "template" ? (
                <div className="space-y-2">
                  <Input value={templateSearch} onChange={e => setTemplateSearch(e.target.value)} placeholder="Buscar modelo..." />
                  <div className="max-h-56 overflow-y-auto space-y-1 border rounded-lg p-2">
                    {filteredTemplates.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-2">Nenhum modelo para {form.channel}. Volte a "Criar mensagem" e clique em "Salvar modelo".</p>
                    ) : filteredTemplates.map(t => (
                      <button key={t.id} type="button" onClick={() => applyTemplate(t)} className={`w-full text-left p-2 rounded hover:bg-muted text-sm ${form.template_id === t.id ? "bg-primary/10 border border-primary" : ""}`}>
                        <div className="flex items-center gap-2">
                          {t.is_favorite && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
                          <span className="font-medium">{t.name}</span>
                          {t.category && <Badge variant="outline" className="text-xs">{t.category}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{t.body}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {form.template_id ? (
                    <div className="flex items-center justify-between border rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                          <Save className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {templates.find(t => t.id === form.template_id)?.name || "Template selecionado"}
                          </p>
                          <p className="text-xs text-muted-foreground">Template selecionado</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => { update("template_id", null); update("content_type", "template"); }}>
                        Trocar template
                      </Button>
                    </div>
                  ) : (
                    <div className="border border-dashed rounded-lg p-4 text-center text-xs text-muted-foreground">
                      Nenhum template selecionado — use "Usar modelo salvo" ou edite abaixo.
                    </div>
                  )}

                  {form.channel === "email" && (
                    <div>
                      <Label>Assunto *</Label>
                      <Input value={form.subject} onChange={e => update("subject", e.target.value)} placeholder="Olá {{nome}}, novidade da semana" />
                    </div>
                  )}
                  <div>
                    <Label>{form.channel === "email" ? "Corpo do e-mail" : "Mensagem"} * — use {"{{"}nome{"}}"}  para variáveis</Label>
                    <Textarea value={form.body} onChange={e => update("body", e.target.value)} rows={form.channel === "email" ? 8 : 6} placeholder={form.channel === "email" ? "Olá {{nome}},\n\n..." : "Olá {{nome}}, tudo bem?"} />
                    <div className="flex justify-end mt-2">
                      <Button variant="outline" size="sm" onClick={saveAsTemplate} className="gap-2"><Save className="w-3 h-3" />Salvar modelo</Button>
                    </div>
                  </div>
                </>
              )}

              <Alert className="border-primary/30 bg-primary/5">
                <AlertDescription className="text-xs">
                  Sem ações de botão, a conversa é <span className="font-medium">finalizada</span> automaticamente após o envio — exceto se um atendente já estiver conduzindo a conversa.
                </AlertDescription>
              </Alert>
            </div>

            {/* Coluna direita — Pré-visualização */}
            <div className="col-span-12 md:col-span-3">
              <div className="border rounded-xl p-3 bg-muted/20 sticky top-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                  <Star className="w-3 h-3" /> Pré-visualização
                </p>
                {form.channel === "whatsapp" ? (
                  <div className="bg-emerald-500/10 rounded-2xl p-3 text-xs whitespace-pre-wrap min-h-[120px]">
                    {renderPreview(form.body, form.audience_snapshot[0]) || <span className="text-muted-foreground">Digite a mensagem...</span>}
                  </div>
                ) : (
                  <div className="bg-background border rounded-lg p-3 text-xs">
                    <p className="font-semibold">{renderPreview(form.subject, form.audience_snapshot[0]) || <span className="text-muted-foreground">(sem assunto)</span>}</p>
                    <div className="mt-2 whitespace-pre-wrap">{renderPreview(form.body, form.audience_snapshot[0]) || <span className="text-muted-foreground">Digite o corpo...</span>}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}


        {step === 3 && (
          <div className="space-y-4">
            <div>
              <Label>Velocidade de envio</Label>
              <RadioGroup value={form.speed} onValueChange={(v) => update("speed", v as Speed)} className="grid grid-cols-3 gap-2 mt-2">
                {[{ v: "slow", label: "Lento", desc: "menor risco" }, { v: "medium", label: "Médio", desc: "recomendado" }, { v: "fast", label: "Rápido", desc: "risco de bloqueio/spam" }].map(o => (
                  <label key={o.v} className={`p-3 border rounded-lg cursor-pointer text-sm ${form.speed === o.v ? "border-primary bg-primary/5" : "border-border"}`}>
                    <RadioGroupItem value={o.v} className="mr-2" />
                    <span className="font-medium">{o.label}</span>
                    <div className="text-xs text-muted-foreground">{o.desc}</div>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Contatos por lote</Label><Input type="number" min={1} value={form.batch_size} onChange={e => update("batch_size", parseInt(e.target.value) || 1)} /></div>
              <div><Label>Intervalo entre lotes (min)</Label><Input type="number" min={1} value={form.batch_interval_min} onChange={e => update("batch_interval_min", parseInt(e.target.value) || 1)} /></div>
            </div>
            <div>
              <Label>Agendar início (opcional)</Label>
              <Input type="datetime-local" value={form.scheduled_at} onChange={e => update("scheduled_at", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Janela diária — início</Label><Input type="time" value={form.daily_window_start} onChange={e => update("daily_window_start", e.target.value)} /></div>
              <div><Label>Janela diária — fim</Label><Input type="time" value={form.daily_window_end} onChange={e => update("daily_window_end", e.target.value)} /></div>
            </div>
            <Alert><AlertTriangle className="w-4 h-4" /><AlertDescription>Fora da janela diária, o envio pausa e retoma no dia seguinte automaticamente.</AlertDescription></Alert>
          </div>
        )}

        <DialogFooter className="flex justify-between gap-2 pt-4">
          <Button variant="ghost" onClick={() => step > 0 ? setStep(step - 1) : onClose()} disabled={saving}>
            <ChevronLeft className="w-4 h-4 mr-1" /> {step === 0 ? "Cancelar" : "Voltar"}
          </Button>
          <div className="flex gap-2">
            {step === steps.length - 1 ? (
              <>
                <Button variant="outline" onClick={() => handleSave(true)} disabled={saving}>Salvar rascunho</Button>
                <Button onClick={() => handleSave(false)} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {form.scheduled_at ? "Agendar" : "Iniciar campanha"}
                </Button>
              </>
            ) : (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>Avançar <ChevronRight className="w-4 h-4 ml-1" /></Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function renderPreview(tpl: string, sample: any): string {
  if (!tpl) return "";
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (sample?.variables?.[k] ?? sample?.[k] ?? `{{${k}}}`));
}
