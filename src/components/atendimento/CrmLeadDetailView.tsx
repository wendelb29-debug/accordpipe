import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft, Building2, User, Mail, Phone as PhoneIcon, MapPin, Calendar,
  DollarSign, Clock, Tag, StickyNote, CheckCircle, XCircle, Plus,
  MessageSquare, PhoneCall, FileText, Activity, Trash2, Send, Loader2,
  FileSignature, Eye, Download, Copy, Image as ImageIcon,
  FileSpreadsheet, Edit, MoreVertical, ThumbsUp, ThumbsDown,
  Link2, CopyPlus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { downloadContractPdf } from "@/lib/generateContractPdf";
import { LeadAtividadesTab } from "./LeadAtividadesTab";
import { LeadPropostasTab } from "./LeadPropostasTab";
import { LeadContratosTab } from "./LeadContratosTab";
import { LeadSimulacaoTab } from "./LeadSimulacaoTab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CrmLead, STAGES } from "@/hooks/useCrmLeads";
import { useCrmActivities } from "@/hooks/useCrmActivities";
import { toast } from "sonner";

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatFullDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

// Render **bold** markdown in text
const renderBoldText = (text: string) => {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
};

const activityTypeIcons: Record<string, React.ElementType> = {
  note: StickyNote,
  call: PhoneCall,
  email: Mail,
  activity: Activity,
  stage_change: Tag,
  meeting: Calendar,
  won: CheckCircle,
  lost: XCircle,
  created: Plus,
  edit: FileText,
  proposal: FileSpreadsheet,
  proposal_status: ThumbsUp,
  proposal_delete: Trash2,
  proposal_duplicate: CopyPlus,
  pdf_download: Download,
  signature: FileSignature,
  signature_link: Link2,
  activity_completed: CheckCircle,
  activity_reopened: Activity,
};

const activityTypeLabels: Record<string, string> = {
  note: "Nota",
  call: "Ligação",
  email: "E-mail",
  activity: "Atividade",
  stage_change: "Mudança de etapa",
  meeting: "Reunião",
  won: "Ganho",
  lost: "Perdido",
  created: "Criação",
  edit: "Edição",
  proposal: "Proposta",
  proposal_status: "Status Proposta",
  proposal_delete: "Proposta Excluída",
  proposal_duplicate: "Proposta Duplicada",
  pdf_download: "PDF Gerado",
  signature: "Assinatura",
  signature_link: "Link de Assinatura",
  activity_completed: "Atividade Concluída",
  activity_reopened: "Atividade Reaberta",
};

const fieldLabels: Record<string, string> = {
  company_name: "Empresa",
  contact_name: "Contato",
  email: "Email",
  phone: "Telefone",
  value_ps: "Valor P&S",
  value_mrr: "Valor MRR",
  notes: "Observação",
  cidade: "Cidade",
  estado: "Estado",
  forecast_date: "Previsão de fechamento",
  source: "Origem",
};

interface CrmLeadDetailViewProps {
  lead: CrmLead;
  onBack: () => void;
  onUpdate: (id: string, updates: Partial<CrmLead>) => Promise<boolean>;
  onMoveStage: (id: string, stage: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

export function CrmLeadDetailView({ lead, onBack, onUpdate, onMoveStage, onDelete }: CrmLeadDetailViewProps) {
  const { activities, loading: activitiesLoading, addActivity, refetch: refetchActivities } = useCrmActivities(lead.id);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...lead });
  const [newActivity, setNewActivity] = useState({ type: "note", title: "", description: "" });
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Note compose state
  const [noteText, setNoteText] = useState("");
  const [noteImage, setNoteImage] = useState<File | null>(null);
  const [noteImagePreview, setNoteImagePreview] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const noteFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) {
      setForm({ ...lead });
    }
  }, [lead, editing]);

  const currentStageIndex = STAGES.findIndex((s) => s.id === lead.stage);

  const getDaysInStage = () => {
    const entered = new Date(lead.stage_entered_at);
    const now = new Date();
    return Math.floor((now.getTime() - entered.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getDaysTotal = () => {
    const created = new Date(lead.created_at);
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Detect changes and log them
  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const updates: Partial<CrmLead> = {
        company_name: form.company_name,
        contact_name: form.contact_name,
        email: form.email,
        phone: form.phone,
        value_ps: form.value_ps,
        value_mrr: form.value_mrr,
        notes: form.notes,
        cidade: form.cidade,
        estado: form.estado,
        forecast_date: form.forecast_date,
        source: form.source,
      } as any;

      // Detect what changed
      const changes: string[] = [];
      for (const key of Object.keys(updates) as (keyof typeof updates)[]) {
        const oldVal = (lead as any)[key] ?? "";
        const newVal = (updates as any)[key] ?? "";
        if (String(oldVal) !== String(newVal)) {
          const label = fieldLabels[key] || key;
          changes.push(`${label}: "${oldVal || '-'}" → "${newVal || '-'}"`);
        }
      }

      const success = await onUpdate(lead.id, updates);
      if (success) {
        setEditing(false);
        toast.success("Dados atualizados!");

        // Log edit in history
        if (changes.length > 0) {
          await addActivity({
            type: "edit",
            title: `Cadastro editado (${changes.length} campo${changes.length > 1 ? "s" : ""})`,
            description: changes.join("\n"),
          });
        }
      }
    } catch (error) {
      console.error("Error saving lead:", error);
      toast.error("Erro ao salvar dados");
    } finally {
      setSaving(false);
    }
  };

  const handleStageChange = async (stage: string) => {
    if (saving || stage === lead.stage) return;
    setSaving(true);
    try {
      await onMoveStage(lead.id, stage);
      await refetchActivities();
    } catch (error) {
      console.error("Error changing stage:", error);
      toast.error("Erro ao mudar etapa");
    } finally {
      setSaving(false);
    }
  };

  const handleWon = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onUpdate(lead.id, { lead_status: "won", stage: "contrato-fechado" } as any);
      await addActivity({ type: "won", title: "Oportunidade ganha!", description: "Lead marcado como ganho." });
      toast.success("🎉 Oportunidade marcada como ganha!");
    } catch (error) {
      console.error("Error marking won:", error);
      toast.error("Erro ao marcar como ganho");
    } finally {
      setSaving(false);
    }
  };

  const handleLost = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onUpdate(lead.id, { lead_status: "lost" } as any);
      await addActivity({ type: "lost", title: "Oportunidade perdida", description: "Lead marcado como perdido." });
      toast.info("Oportunidade marcada como perdida");
    } catch (error) {
      console.error("Error marking lost:", error);
      toast.error("Erro ao marcar como perdido");
    } finally {
      setSaving(false);
    }
  };

  const handleAddActivity = async () => {
    if (!newActivity.title.trim() || saving) return;
    setSaving(true);
    try {
      await addActivity(newActivity);
      setNewActivity({ type: "note", title: "", description: "" });
      setShowActivityForm(false);
      toast.success("Atividade registrada!");
    } catch (error) {
      console.error("Error adding activity:", error);
      toast.error("Erro ao registrar atividade");
    } finally {
      setSaving(false);
    }
  };

  // Handle note with image upload
  const handleNoteImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 5MB");
      return;
    }
    setNoteImage(file);
    setNoteImagePreview(URL.createObjectURL(file));
  };

  const handleSaveNote = async () => {
    if (!noteText.trim() && !noteImage) return;
    setSavingNote(true);
    try {
      let imageUrl: string | null = null;

      // Upload image if present
      if (noteImage) {
        const ext = noteImage.name.split(".").pop();
        const path = `crm-notes/${lead.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("documents").upload(path, noteImage);
        if (uploadError) {
          toast.error("Erro ao enviar imagem");
          setSavingNote(false);
          return;
        }
        const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      await addActivity({
        type: "note",
        title: noteText.trim() || "Nota com imagem",
        description: noteText.trim() || undefined,
        metadata: imageUrl ? { image_url: imageUrl } : undefined,
      });

      setNoteText("");
      setNoteImage(null);
      setNoteImagePreview(null);
      toast.success("Nota salva!");
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Erro ao salvar nota");
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header with pipeline progress */}
      <div className="border-b bg-card px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-sm font-bold text-foreground">{lead.source} - {lead.contact_name || lead.company_name}</h2>
              <p className="text-xs text-muted-foreground">
                Etapa atual: <strong>{STAGES.find((s) => s.id === lead.stage)?.title}</strong>
                {" · "}{getDaysInStage()} dia(s) nesta etapa
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lead.lead_status === "open" && (
              <>
                <Button size="sm" variant="default" onClick={handleWon} disabled={saving} className="gap-1.5 bg-green-600 hover:bg-green-700 text-white">
                  <CheckCircle className="h-3.5 w-3.5" /> Ganho
                </Button>
                <Button size="sm" variant="destructive" onClick={handleLost} disabled={saving} className="gap-1.5">
                  <XCircle className="h-3.5 w-3.5" /> Perdido
                </Button>
              </>
            )}
            {lead.lead_status === "won" && (
              <Badge className="bg-green-600 text-white">✓ Ganho</Badge>
            )}
            {lead.lead_status === "lost" && (
              <Badge variant="destructive">✕ Perdido</Badge>
            )}
          </div>
        </div>

        {/* Pipeline Progress Bar */}
        <div className="flex gap-0.5">
          {STAGES.map((stage, i) => {
            const isActive = i === currentStageIndex;
            const isPast = i < currentStageIndex;
            return (
              <button
                key={stage.id}
                onClick={() => handleStageChange(stage.id)}
                disabled={saving}
                className={cn(
                  "flex-1 py-1.5 text-[10px] font-medium rounded-sm transition-all text-center truncate px-1",
                  isActive && `${stage.color} text-white`,
                  isPast && "bg-primary/20 text-primary",
                  !isActive && !isPast && "bg-muted text-muted-foreground hover:bg-muted/80",
                  saving && "opacity-50 cursor-not-allowed"
                )}
                title={stage.title}
              >
                {stage.title}
                {isActive && stage.daysLimit && (
                  <span className="block text-[9px] opacity-80">{getDaysInStage()} dia(s)</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content: Sidebar + Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Details */}
        <div className="w-72 shrink-0 border-r overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <FileText className="h-4 w-4" /> Detalhes
            </h3>
            <Button size="sm" variant="ghost" onClick={() => editing ? handleSave() : setEditing(true)} disabled={saving} className="h-7 text-xs">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : editing ? "Salvar" : "Editar"}
            </Button>
          </div>

          <div className="space-y-3 text-xs">
            <DetailField icon={Clock} label="Última atualização" value={new Date(lead.updated_at).toLocaleString("pt-BR")} />
            <DetailField icon={Tag} label="ID da oportunidade" value={lead.id.slice(0, 8)} />

            {editing ? (
              <>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Empresa</Label>
                  <Input className="h-7 text-xs" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Contato</Label>
                  <Input className="h-7 text-xs" value={form.contact_name || ""} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Email</Label>
                  <Input className="h-7 text-xs" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Telefone</Label>
                  <Input className="h-7 text-xs" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Valor P&S</Label>
                    <Input className="h-7 text-xs" type="number" value={form.value_ps} onChange={(e) => setForm({ ...form, value_ps: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Valor MRR</Label>
                    <Input className="h-7 text-xs" type="number" value={form.value_mrr} onChange={(e) => setForm({ ...form, value_mrr: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Cidade</Label>
                    <Input className="h-7 text-xs" value={form.cidade || ""} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Estado</Label>
                    <Input className="h-7 text-xs" value={form.estado || ""} onChange={(e) => setForm({ ...form, estado: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Previsão de fechamento</Label>
                  <Input className="h-7 text-xs" type="date" value={form.forecast_date || ""} onChange={(e) => setForm({ ...form, forecast_date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Origem</Label>
                  <Input className="h-7 text-xs" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Observação</Label>
                  <Textarea className="text-xs min-h-[60px]" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </>
            ) : (
              <>
                <DetailField icon={Building2} label="Empresa" value={lead.company_name} />
                <DetailField icon={User} label="Contato" value={lead.contact_name || "Não informado"} />
                <DetailField icon={Mail} label="Email" value={lead.email || "Não informado"} />
                <DetailField icon={PhoneIcon} label="Telefone" value={lead.phone || "Não informado"} />
                <DetailField icon={DollarSign} label="Valor de P&S" value={formatCurrency(lead.value_ps)} />
                <DetailField icon={DollarSign} label="Valor de MRR" value={formatCurrency(lead.value_mrr)} />
                <DetailField icon={Clock} label="Tempo da oportunidade" value={`${getDaysTotal()} dia(s) (${new Date(lead.created_at).toLocaleDateString("pt-BR")})`} />
                <DetailField icon={Calendar} label="Previsão de fechamento" value={lead.forecast_date ? new Date(lead.forecast_date).toLocaleDateString("pt-BR") : "Não informado"} />
                <DetailField icon={MapPin} label="Cidade (UF)" value={lead.cidade && lead.estado ? `${lead.cidade} (${lead.estado})` : "Não informado"} />
                <DetailField icon={Tag} label="Origem" value={lead.source} />
                <DetailField icon={StickyNote} label="Observação" value={lead.notes || "Não informado"} />
                {lead.created_by_name && <DetailField icon={User} label="Criado por" value={lead.created_by_name} />}
              </>
            )}
          </div>
        </div>

        {/* Main Content - Tabs */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs defaultValue="historico" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full justify-start rounded-none border-b bg-card px-4 h-10">
              <TabsTrigger value="historico" className="text-xs gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Histórico
              </TabsTrigger>
              <TabsTrigger value="notas" className="text-xs gap-1.5">
                <StickyNote className="h-3.5 w-3.5" /> Notas
              </TabsTrigger>
              <TabsTrigger value="atividades" className="text-xs gap-1.5">
                <Activity className="h-3.5 w-3.5" /> Atividades
              </TabsTrigger>
              <TabsTrigger value="ligacoes" className="text-xs gap-1.5">
                <PhoneCall className="h-3.5 w-3.5" /> Ligações
              </TabsTrigger>
              <TabsTrigger value="contratos" className="text-xs gap-1.5">
                <FileSignature className="h-3.5 w-3.5" /> Contratos
              </TabsTrigger>
              <TabsTrigger value="propostas" className="text-xs gap-1.5">
                <FileSpreadsheet className="h-3.5 w-3.5" /> Propostas
              </TabsTrigger>
              <TabsTrigger value="assinatura" className="text-xs gap-1.5">
                <FileSignature className="h-3.5 w-3.5" /> Assinatura
              </TabsTrigger>
              <TabsTrigger value="simulacao" className="text-xs gap-1.5">
                <Calculator className="h-3.5 w-3.5" /> Simulação
              </TabsTrigger>
            </TabsList>

            {/* Histórico - all activities */}
            <TabsContent value="historico" className="flex-1 overflow-y-auto p-4 mt-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Histórico</h3>
                <Button size="sm" variant="outline" onClick={() => setShowActivityForm(!showActivityForm)} className="gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Registrar
                </Button>
              </div>

              {showActivityForm && (
                <Card className="mb-4">
                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Tipo</Label>
                        <Select value={newActivity.type} onValueChange={(v) => setNewActivity({ ...newActivity, type: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="note">Nota</SelectItem>
                            <SelectItem value="call">Ligação</SelectItem>
                            <SelectItem value="email">E-mail</SelectItem>
                            <SelectItem value="meeting">Reunião</SelectItem>
                            <SelectItem value="activity">Atividade</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Título</Label>
                        <Input className="h-8 text-xs" value={newActivity.title} onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })} placeholder="Título da atividade" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Descrição</Label>
                      <Textarea className="text-xs min-h-[60px]" value={newActivity.description} onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })} placeholder="Descreva a atividade..." />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setShowActivityForm(false)} className="text-xs">Cancelar</Button>
                      <Button size="sm" onClick={handleAddActivity} disabled={!newActivity.title.trim() || saving} className="text-xs gap-1.5">
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Salvar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activitiesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nenhuma atividade registrada</p>
                  <p className="text-xs mt-1">Clique em "Registrar" para adicionar a primeira</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {activities.map((activity, i) => (
                    <TimelineEntry key={activity.id} activity={activity} isLast={i === activities.length - 1} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Notas - compose + list */}
            <TabsContent value="notas" className="flex-1 overflow-y-auto p-4 mt-0">
              {/* Note compose area */}
              <Card className="mb-4">
                <CardContent className="p-4 space-y-3">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <StickyNote className="h-3.5 w-3.5" /> Nova Nota
                  </Label>
                  <Textarea
                    className="text-xs min-h-[80px]"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Escreva sua nota aqui..."
                  />
                  {noteImagePreview && (
                    <div className="relative inline-block">
                      <img src={noteImagePreview} alt="Preview" className="max-h-32 rounded-md border" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-5 w-5 absolute top-1 right-1 rounded-full"
                        onClick={() => { setNoteImage(null); setNoteImagePreview(null); }}
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      <input
                        ref={noteFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleNoteImageSelect}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs gap-1.5 h-7"
                        onClick={() => noteFileRef.current?.click()}
                      >
                        <ImageIcon className="h-3.5 w-3.5" /> Imagem
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleSaveNote}
                      disabled={(!noteText.trim() && !noteImage) || savingNote}
                      className="text-xs gap-1.5"
                    >
                      {savingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Salvar Nota
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Notes list */}
              {activitiesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (() => {
                const notes = activities.filter((a) => a.type === "note");
                if (notes.length === 0) {
                  return (
                    <div className="text-center py-12 text-muted-foreground">
                      <StickyNote className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Nenhuma nota registrada</p>
                    </div>
                  );
                }
                return (
                  <div className="space-y-3">
                    {notes.map((activity) => (
                      <Card key={activity.id}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-foreground whitespace-pre-wrap">{renderBoldText(activity.description || activity.title)}</p>
                              {(activity.metadata as any)?.image_url && (
                                <img
                                  src={(activity.metadata as any).image_url}
                                  alt="Nota"
                                  className="mt-2 max-h-40 rounded-md border cursor-pointer"
                                  onClick={() => window.open((activity.metadata as any).image_url, "_blank")}
                                />
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0 ml-3 text-right">
                              {activity.created_by_name || "Sistema"}
                            </span>
                          </div>
                          <p className="text-[10px] text-primary mt-2">
                            {formatFullDate(activity.created_at)}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                );
              })()}
            </TabsContent>

            {/* Atividades - rich tab */}
            <TabsContent value="atividades" className="flex-1 overflow-y-auto p-4 mt-0">
              <LeadAtividadesTab lead={lead} addActivity={addActivity} />
            </TabsContent>

            {/* Ligações - filtered */}
            <TabsContent value="ligacoes" className="flex-1 overflow-y-auto p-4 mt-0">
              <ActivityFilteredList activities={activities.filter((a) => a.type === "call")} loading={activitiesLoading} emptyLabel="ligações" />
            </TabsContent>

            {/* Contratos */}
            <TabsContent value="contratos" className="flex-1 overflow-y-auto p-4 mt-0">
              <LeadContratosTab lead={lead} addActivity={addActivity} />
            </TabsContent>

            {/* Propostas */}
            <TabsContent value="propostas" className="flex-1 overflow-y-auto p-4 mt-0">
              <LeadPropostasTab lead={lead} addActivity={addActivity} />
            </TabsContent>

            {/* Assinatura - select accepted proposal to send for signature */}
            <TabsContent value="assinatura" className="flex-1 overflow-y-auto p-4 mt-0">
              <LeadPropostasTab lead={lead} addActivity={addActivity} signatureMode />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

// Timeline entry as a "balloon" with date+time+seconds and user name on the right
function TimelineEntry({ activity, isLast }: { activity: any; isLast: boolean }) {
  const Icon = activityTypeIcons[activity.type] || Activity;
  const imageUrl = (activity.metadata as any)?.image_url;

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
          activity.type === "won" ? "bg-green-100 text-green-600" :
          activity.type === "lost" ? "bg-destructive/10 text-destructive" :
          activity.type === "stage_change" ? "bg-primary/10 text-primary" :
          activity.type === "edit" ? "bg-amber-100 text-amber-600" :
          activity.type === "proposal" ? "bg-blue-100 text-blue-600" :
          activity.type === "proposal_status" ? "bg-emerald-100 text-emerald-600" :
          activity.type === "proposal_delete" ? "bg-red-100 text-red-600" :
          activity.type === "proposal_duplicate" ? "bg-violet-100 text-violet-600" :
          activity.type === "pdf_download" ? "bg-cyan-100 text-cyan-600" :
          activity.type === "signature" ? "bg-indigo-100 text-indigo-600" :
          activity.type === "signature_link" ? "bg-teal-100 text-teal-600" :
          activity.type === "activity_completed" ? "bg-green-100 text-green-600" :
          activity.type === "activity_reopened" ? "bg-amber-100 text-amber-600" :
          "bg-muted text-muted-foreground"
        )}>
          <Icon className="h-4 w-4" />
        </div>
        {!isLast && <div className="w-px flex-1 bg-border min-h-[20px]" />}
      </div>
      <div className="pb-4 flex-1 min-w-0">
        <div className="rounded-lg border bg-card p-3 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">{activity.title}</p>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {activityTypeLabels[activity.type] || activity.type}
                </Badge>
              </div>
              {activity.description && (
                <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{renderBoldText(activity.description)}</p>
              )}
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Anexo"
                  className="mt-2 max-h-32 rounded-md border cursor-pointer"
                  onClick={() => window.open(imageUrl, "_blank")}
                />
              )}
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0 text-right font-medium">
              {activity.created_by_name || "Sistema"}
            </span>
          </div>
          <p className="text-[10px] text-primary mt-2">
            {formatFullDate(activity.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
}



function DetailField({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-primary font-medium flex items-center gap-1">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className="text-xs text-foreground mt-0.5">{value}</p>
    </div>
  );
}

function ActivityFilteredList({ activities, loading, emptyLabel }: { activities: any[]; loading: boolean; emptyLabel: string }) {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <StickyNote className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Nenhuma {emptyLabel} registrada</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const Icon = activityTypeIcons[activity.type] || Activity;
        return (
          <Card key={activity.id}>
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-medium text-foreground">{activity.title}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2 font-medium">
                      {activity.created_by_name || "Sistema"}
                    </span>
                  </div>
                  {activity.description && <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{renderBoldText(activity.description)}</p>}
                  <p className="text-[10px] text-primary mt-1">
                    {formatFullDate(activity.created_at)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
