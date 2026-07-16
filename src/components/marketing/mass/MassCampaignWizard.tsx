import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, Mail, ChevronLeft, ChevronRight, Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Props {
  open: boolean;
  onClose: () => void;
  tenantId: string;
}

type Channel = "whatsapp" | "email";
type Speed = "slow" | "medium" | "fast";

interface FormState {
  name: string;
  description: string;
  channel: Channel;
  channel_ref: string;
  audience_mode: "file" | "crm" | "manual";
  audience_snapshot: any[];
  content_type: "template" | "editor";
  subject: string;
  body: string;
  speed: Speed;
  batch_size: number;
  batch_interval_min: number;
  scheduled_at: string;
  daily_window_start: string;
  daily_window_end: string;
}

const initialForm: FormState = {
  name: "",
  description: "",
  channel: "whatsapp",
  channel_ref: "",
  audience_mode: "manual",
  audience_snapshot: [],
  content_type: "editor",
  subject: "",
  body: "",
  speed: "medium",
  batch_size: 20,
  batch_interval_min: 5,
  scheduled_at: "",
  daily_window_start: "09:00",
  daily_window_end: "18:00",
};

const steps = ["Dados", "Público-alvo", "Conteúdo", "Configurações"];

export function MassCampaignWizard({ open, onClose, tenantId }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [saving, setSaving] = useState(false);
  const [manualText, setManualText] = useState("");

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(p => ({ ...p, [k]: v }));

  const parseManual = () => {
    const rows = manualText.split("\n").map(l => l.trim()).filter(Boolean).map(l => {
      const [name, contact, ...rest] = l.split(/[,;\t]/).map(s => s.trim());
      return { name: name || "", contact: contact || name, variables: { extra: rest.join(",") } };
    }).filter(r => r.contact);
    update("audience_snapshot", rows);
    toast.success(`${rows.length} contato(s) importado(s)`);
  };

  const canProceed = () => {
    if (step === 0) return form.name.trim().length >= 2;
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
      tenant_id: tenantId,
      name: form.name,
      description: form.description || null,
      channel: form.channel,
      channel_ref: form.channel_ref || null,
      status,
      audience_mode: form.audience_mode,
      audience_snapshot: form.audience_snapshot,
      content_type: form.content_type,
      subject: form.channel === "email" ? form.subject : null,
      body: form.body,
      speed: form.speed,
      batch_size: form.batch_size,
      batch_interval_min: form.batch_interval_min,
      scheduled_at: form.scheduled_at || null,
      daily_window_start: form.daily_window_start || null,
      daily_window_end: form.daily_window_end || null,
      totals: { queued: form.audience_snapshot.length, sent: 0, failed: 0, replied: 0 },
      created_by: user.user?.id,
    }).select().single() as any);
    if (error || !camp) { toast.error(error?.message || "Erro ao salvar"); setSaving(false); return; }

    const recipients = form.audience_snapshot.map((r: any) => ({
      campaign_id: camp.id,
      tenant_id: tenantId,
      name: r.name || null,
      contact: r.contact,
      variables: r.variables || {},
      status: "pending",
    }));
    if (recipients.length) {
      await supabase.from("mass_campaign_recipients" as any).insert(recipients);
    }

    toast.success(asDraft ? "Rascunho salvo" : "Campanha criada");
    setSaving(false);
    setForm(initialForm);
    setStep(0);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
              <Label>Canal de envio *</Label>
              <RadioGroup value={form.channel} onValueChange={(v) => update("channel", v as Channel)} className="grid grid-cols-2 gap-3 mt-2">
                <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${form.channel === "whatsapp" ? "border-primary bg-primary/5" : "border-border"}`}>
                  <RadioGroupItem value="whatsapp" />
                  <MessageSquare className="w-5 h-5 text-emerald-400" />
                  <div><div className="font-medium">WhatsApp</div><div className="text-xs text-muted-foreground">Instância conectada</div></div>
                </label>
                <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${form.channel === "email" ? "border-primary bg-primary/5" : "border-border"}`}>
                  <RadioGroupItem value="email" />
                  <Mail className="w-5 h-5 text-blue-400" />
                  <div><div className="font-medium">E-mail</div><div className="text-xs text-muted-foreground">Conta Outlook/Gmail conectada</div></div>
                </label>
              </RadioGroup>
            </div>
            <div>
              <Label>Identificador do canal (opcional)</Label>
              <Input value={form.channel_ref} onChange={e => update("channel_ref", e.target.value)} placeholder="ID da instância ou conta de e-mail" />
              <p className="text-xs text-muted-foreground mt-1">Deixe em branco para usar o canal padrão do tenant.</p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Modo de seleção</Label>
              <RadioGroup value={form.audience_mode} onValueChange={(v) => update("audience_mode", v as any)} className="grid grid-cols-3 gap-2 mt-2">
                {[
                  { v: "manual", label: "Manual" },
                  { v: "file", label: "Upload CSV/XLSX" },
                  { v: "crm", label: "Base do CRM" },
                ].map(o => (
                  <label key={o.v} className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer text-sm ${form.audience_mode === o.v ? "border-primary bg-primary/5" : "border-border"}`}>
                    <RadioGroupItem value={o.v} />
                    {o.label}
                  </label>
                ))}
              </RadioGroup>
            </div>
            {form.audience_mode === "manual" && (
              <div>
                <Label>Contatos (uma linha por contato: nome, telefone/email)</Label>
                <Textarea value={manualText} onChange={e => setManualText(e.target.value)} rows={8} placeholder={"João Silva, 5511999999999\nMaria, maria@exemplo.com"} />
                <Button variant="outline" size="sm" className="mt-2" onClick={parseManual}>Importar contatos</Button>
              </div>
            )}
            {form.audience_mode === "file" && (
              <Alert><AlertTriangle className="w-4 h-4" /><AlertDescription>Upload de arquivo será liberado na Onda B. Por enquanto use o modo Manual.</AlertDescription></Alert>
            )}
            {form.audience_mode === "crm" && (
              <Alert><AlertTriangle className="w-4 h-4" /><AlertDescription>Seleção pela base do CRM será liberada na Onda B.</AlertDescription></Alert>
            )}
            {form.audience_snapshot.length > 0 && (
              <div className="text-sm text-muted-foreground">✓ {form.audience_snapshot.length} destinatários prontos.</div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {form.channel === "email" && (
              <div>
                <Label>Assunto *</Label>
                <Input value={form.subject} onChange={e => update("subject", e.target.value)} placeholder="Olá {{nome}}, novidade da semana" />
              </div>
            )}
            <div>
              <Label>{form.channel === "email" ? "Corpo do e-mail" : "Mensagem"} * — use {"{{"}nome{"}}"}  para variáveis</Label>
              <Textarea value={form.body} onChange={e => update("body", e.target.value)} rows={form.channel === "email" ? 10 : 6} placeholder={form.channel === "email" ? "Olá {{nome}},\n\n..." : "Olá {{nome}}, tudo bem?"} />
            </div>
            <div className="border rounded-lg p-4 bg-muted/30">
              <p className="text-xs text-muted-foreground mb-2">Pré-visualização</p>
              {form.channel === "whatsapp" ? (
                <div className="max-w-sm mx-auto bg-emerald-500/10 rounded-2xl p-3 text-sm whitespace-pre-wrap">{renderPreview(form.body, form.audience_snapshot[0]) || <span className="text-muted-foreground">Digite a mensagem...</span>}</div>
              ) : (
                <div className="bg-background border rounded-lg p-4 text-sm">
                  <p className="font-semibold">{renderPreview(form.subject, form.audience_snapshot[0]) || <span className="text-muted-foreground">(sem assunto)</span>}</p>
                  <div className="mt-2 whitespace-pre-wrap">{renderPreview(form.body, form.audience_snapshot[0]) || <span className="text-muted-foreground">Digite o corpo...</span>}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <Label>Velocidade de envio</Label>
              <RadioGroup value={form.speed} onValueChange={(v) => update("speed", v as Speed)} className="grid grid-cols-3 gap-2 mt-2">
                {[
                  { v: "slow", label: "Lento", desc: "menor risco" },
                  { v: "medium", label: "Médio", desc: "recomendado" },
                  { v: "fast", label: "Rápido", desc: "atenção: risco de bloqueio" },
                ].map(o => (
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
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                Avançar <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
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
