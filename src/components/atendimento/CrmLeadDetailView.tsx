import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft, Building2, User, Mail, Phone as PhoneIcon, MapPin, Calendar, Calculator,
  DollarSign, Clock, Tag, StickyNote, CheckCircle, XCircle, Plus,
  MessageSquare, PhoneCall, FileText, Activity, Trash2, Send, Loader2,
  FileSignature, Eye, Download, Copy, Image as ImageIcon,
  FileSpreadsheet, Edit, MoreVertical, ThumbsUp, ThumbsDown,
  Link2, CopyPlus, ClipboardList, UserRoundPen
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { downloadContractPdf } from "@/lib/generateContractPdf";
import { LeadAtividadesTab } from "./LeadAtividadesTab";
import { NoteEditor } from "./NoteEditor";
import { LeadPropostasTab } from "./LeadPropostasTab";
import { LeadContratosTab } from "./LeadContratosTab";
import { LeadSimulacaoTab } from "./LeadSimulacaoTab";
import { LeadCadastroTab } from "./LeadCadastroTab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CrmLead, STAGES, ADMIN_STAGES, ALL_STAGES } from "@/hooks/useCrmLeads";
import { useCrmActivities } from "@/hooks/useCrmActivities";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { WonConfirmDialog, WonCelebrationDialog } from "./WonCelebrationDialog";

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatFullDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

// Render **bold** markdown in text
const renderFormattedText = (text: string) => {
  // Handle **bold** and _italic_
  const parts = text.split(/(\*\*.*?\*\*|_.*?_)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("_") && part.endsWith("_") && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    // Handle bullet points
    if (part.startsWith("• ")) {
      return <span key={i}>• {part.slice(2)}</span>;
    }
    return part;
  });
};
const renderBoldText = renderFormattedText;

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
  isAdminPipeline?: boolean;
}

const LOST_REASONS = [
  { value: "dados_incorretos", label: "DADOS INCORRETOS", description: "Os dados fornecidos não são do cliente ou não são verídicos" },
  { value: "desistiu", label: "DESISTIU", description: "Cliente desistiu do negócio após um prazo de negociação ou adiou o investimento" },
  { value: "parou_responder", label: "PAROU DE RESPONDER", description: "Cliente chegou a atender, mas após alguns contatos deixou de responder" },
  { value: "preco_contrato", label: "PREÇO CONTRATO", description: "Cliente desistiu do negócio devido ao preço do contrato" },
  { value: "sem_contato", label: "SEM CONTATO", description: "Não obteve sucesso em nenhum dos contatos" },
];

export function CrmLeadDetailView({ lead, onBack, onUpdate, onMoveStage, onDelete, isAdminPipeline }: CrmLeadDetailViewProps) {
  const { role, profile } = useAuth();
  const { activities, loading: activitiesLoading, addActivity, refetch: refetchActivities } = useCrmActivities(lead.id);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...lead });
  const [newActivity, setNewActivity] = useState({ type: "note", title: "", description: "" });
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showLostDialog, setShowLostDialog] = useState(false);
  const [selectedLostReason, setSelectedLostReason] = useState("");
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [reopenUserId, setReopenUserId] = useState("");
  const [reopenUsers, setReopenUsers] = useState<{ user_id: string; name: string }[]>([]);
  const [showWonCelebration, setShowWonCelebration] = useState(false);
  const [showWonConfirm, setShowWonConfirm] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [returnNote, setReturnNote] = useState("");
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferUserId, setTransferUserId] = useState("");
  const [transferUsers, setTransferUsers] = useState<{ user_id: string; name: string }[]>([]);

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

  const pipelineStages = isAdminPipeline ? ADMIN_STAGES : STAGES;
  const currentStageIndex = pipelineStages.findIndex((s) => s.id === lead.stage);

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

  const handleWon = () => {
    if (saving) return;

    // Validate required fields before allowing "Ganho"
    const missingFields: string[] = [];
    if (!lead.company_name?.trim()) missingFields.push("Empresa");
    if (!lead.contact_name?.trim()) missingFields.push("Contato");
    if (!lead.phone?.trim()) missingFields.push("Telefone");
    if (!lead.email?.trim()) missingFields.push("Email");

    if (missingFields.length > 0) {
      toast.error(`Preencha os campos obrigatórios antes de marcar como Ganho: ${missingFields.join(", ")}`);
      return;
    }

    setShowWonConfirm(true);
  };

  const executeWon = async (observation: string) => {
    if (saving) return;
    setSaving(true);
    try {
      await onUpdate(lead.id, { lead_status: "won", stage: "cadastro-pendente", stage_entered_at: new Date().toISOString() } as any);
      const desc = observation.trim()
        ? `Lead marcado como ganho e transferido para o pipeline Administrativo.\nObservação: ${observation.trim()}`
        : "Lead marcado como ganho e transferido para o pipeline Administrativo.";
      await addActivity({ type: "won", title: "Oportunidade ganha! Transferida para Cadastro.", description: desc });
      
      await supabase.from("crm_client_registrations" as any).insert({
        lead_id: lead.id,
        servidor_id: lead.servidor_id,
        nome_completo: lead.contact_name || "",
        email: lead.email || "",
      } as any);

      const { data: adminProfiles } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("company_id", lead.servidor_id)
        .eq("is_active", true);
      if (adminProfiles) {
        for (const ap of adminProfiles) {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", ap.user_id)
            .maybeSingle();
          if (roleData?.role === "administrativo" || roleData?.role === "admin") {
            await supabase.rpc("create_notification", {
              _user_id: ap.user_id,
              _title: "Novo cadastro pendente",
              _message: `A oportunidade "${lead.company_name}" foi marcada como ganha e aguarda cadastro.`,
              _type: "cadastro_pendente",
            });
          }
        }
      }

      setShowWonConfirm(false);
      setShowWonCelebration(true);
    } catch (error) {
      console.error("Error marking won:", error);
      toast.error("Erro ao marcar como ganho");
    } finally {
      setSaving(false);
    }
  };

  const handleReopen = async () => {
    // Fetch users for assignment
    const { data: users } = await supabase
      .from("profiles")
      .select("user_id, name")
      .eq("company_id", lead.servidor_id)
      .eq("is_active", true)
      .order("name");
    
    if (users) {
      // Filter to only comercial/operador/admin roles
      const filteredUsers: { user_id: string; name: string }[] = [];
      for (const u of users) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", u.user_id)
          .maybeSingle();
        if (roleData && ["admin", "operador", "comercial", "ceo"].includes(roleData.role)) {
          filteredUsers.push(u);
        }
      }
      setReopenUsers(filteredUsers);
    }
    setReopenUserId("");
    setShowReopenDialog(true);
  };

  const confirmReopen = async () => {
    if (!reopenUserId) {
      toast.error("Selecione um usuário");
      return;
    }
    if (saving) return;
    setSaving(true);
    const selectedUser = reopenUsers.find(u => u.user_id === reopenUserId);
    try {
      await onUpdate(lead.id, { 
        lead_status: "open", 
        lost_reason: null, 
        stage: "novos", 
        stage_entered_at: new Date().toISOString(),
        created_by_user_id: reopenUserId,
        created_by_name: selectedUser?.name || null,
      } as any);
      await addActivity({ 
        type: "stage_change", 
        title: "Oportunidade reaberta", 
        description: `Lead foi reaberto e atribuído a **${selectedUser?.name || "usuário"}**, movido para **Novos Leads**.` 
      });
      toast.success("Oportunidade reaberta com sucesso!");
      setShowReopenDialog(false);
    } catch (error) {
      console.error("Error reopening lead:", error);
      toast.error("Erro ao reabrir oportunidade");
    } finally {
      setSaving(false);
    }
  };

  const handleLost = () => {
    setShowLostDialog(true);
  };

  const confirmLost = async () => {
    if (!selectedLostReason) {
      toast.error("Selecione um motivo");
      return;
    }
    if (saving) return;
    setSaving(true);
    const reason = LOST_REASONS.find(r => r.value === selectedLostReason);
    const reasonText = reason ? `${reason.label}: ${reason.description}` : selectedLostReason;
    try {
      await onUpdate(lead.id, { lead_status: "lost", lost_reason: reasonText } as any);
      await addActivity({ type: "lost", title: "Oportunidade perdida", description: `Motivo: ${reasonText}` });
      toast.info("Oportunidade marcada como perdida");
      setShowLostDialog(false);
      setSelectedLostReason("");
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

  const canTransferOwnership = role === "admin" || role === "administrativo" || role === "ceo" || profile?.is_master;

  const handleTransferOwnership = async () => {
    const { data: users } = await supabase
      .from("profiles")
      .select("user_id, name")
      .eq("company_id", lead.servidor_id)
      .eq("is_active", true)
      .order("name");
    if (users) {
      const filtered: { user_id: string; name: string }[] = [];
      for (const u of users) {
        if (u.user_id === lead.created_by_user_id) continue;
        if (profile?.is_master) {
          // Master tem acesso total — pode transferir para qualquer usuário do servidor
          filtered.push(u);
        } else {
          const { data: roleData } = await supabase
            .from("user_roles").select("role").eq("user_id", u.user_id).maybeSingle();
          if (roleData && ["admin", "operador", "comercial", "ceo", "administrativo"].includes(roleData.role)) {
            filtered.push(u);
          }
        }
      }
      setTransferUsers(filtered);
    }
    setTransferUserId("");
    setShowTransferDialog(true);
  };

  const confirmTransferOwnership = async () => {
    if (!transferUserId) { toast.error("Selecione um usuário"); return; }
    if (saving) return;
    setSaving(true);
    const selectedUser = transferUsers.find(u => u.user_id === transferUserId);
    try {
      await onUpdate(lead.id, {
        created_by_user_id: transferUserId,
        created_by_name: selectedUser?.name || null,
      } as any);
      await addActivity({
        type: "stage_change",
        title: "Propriedade transferida",
        description: `Responsável alterado de **${lead.created_by_name || "—"}** para **${selectedUser?.name || "usuário"}** por **${profile?.name || "Admin"}**.`,
      });
      // Notify the new owner
      await supabase.rpc("create_notification", {
        _user_id: transferUserId,
        _title: "Card transferido para você",
        _message: `A oportunidade "${lead.company_name}" foi transferida para você por ${profile?.name || "um administrador"}.`,
        _type: "transfer",
      });
      toast.success("Propriedade transferida com sucesso!");
      setShowTransferDialog(false);
    } catch (error) {
      console.error("Error transferring ownership:", error);
      toast.error("Erro ao transferir propriedade");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header with pipeline progress */}
      <div className="border-b bg-card px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-foreground truncate">{lead.source} - {lead.contact_name || lead.company_name}</h2>
              <p className="text-xs text-muted-foreground truncate">
                Etapa atual: <strong>{pipelineStages.find((s) => s.id === lead.stage)?.title || ALL_STAGES.find((s) => s.id === lead.stage)?.title}</strong>
                {" · "}{getDaysInStage()} dia(s) nesta etapa
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap justify-end">
            {lead.lead_status === "open" && (
              <>
                <Button size="sm" variant="default" onClick={handleWon} disabled={saving} className="gap-1 sm:gap-1.5 bg-green-600 hover:bg-green-700 text-white h-7 sm:h-8 text-[11px] sm:text-xs px-2 sm:px-3">
                  <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Ganho
                </Button>
                <Button size="sm" variant="destructive" onClick={handleLost} disabled={saving} className="gap-1 sm:gap-1.5 h-7 sm:h-8 text-[11px] sm:text-xs px-2 sm:px-3">
                  <XCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Perdido
                </Button>
              </>
            )}
            {lead.lead_status === "won" && (
              <>
                <Badge className="bg-green-600 text-white text-[10px]">✓ Ganho</Badge>
                {(role === "admin" || role === "administrativo" || role === "ceo") && (
                  <Button size="sm" variant="outline" onClick={() => {
                    setReturnNote("");
                    setShowReturnDialog(true);
                  }} disabled={saving} className="gap-1 border-orange-300 text-orange-700 hover:bg-orange-50 h-7 sm:h-8 text-[11px] sm:text-xs px-2 sm:px-3">
                    <ArrowLeft className="h-3 w-3" /> Devolver
                  </Button>
                )}
                {(role === "admin" || role === "administrativo") && (
                  <Button size="sm" variant="outline" onClick={() => window.location.href = "/cadastrados"} className="gap-1 h-7 sm:h-8 text-[11px] sm:text-xs px-2 sm:px-3 hidden sm:flex">
                    <ClipboardList className="h-3 w-3" /> Cadastro
                  </Button>
                )}
              </>
            )}
            {lead.lead_status === "lost" && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="destructive" className="text-[10px]">✕ Perdido</Badge>
                {(role === "admin" || role === "ceo" || profile?.is_master) && (
                  <Button size="sm" variant="outline" onClick={handleReopen} disabled={saving} className="gap-1 h-7 sm:h-8 text-[11px] sm:text-xs px-2 sm:px-3">
                    <Activity className="h-3 w-3" /> Reabrir
                  </Button>
                )}
              </div>
            )}
            {canTransferOwnership && (
              <Button size="sm" variant="ghost" onClick={handleTransferOwnership} disabled={saving} title="Transferir propriedade" className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                <UserRoundPen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Pipeline Progress Bar - scrollable on mobile */}
        <div className="flex gap-0.5 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
          {pipelineStages.map((stage, i) => {
            const isActive = i === currentStageIndex;
            const isPast = i < currentStageIndex;
            return (
              <button
                key={stage.id}
                onClick={() => handleStageChange(stage.id)}
                disabled={saving}
                className={cn(
                  "flex-shrink-0 min-w-[70px] sm:flex-1 py-1.5 text-[10px] font-medium rounded-sm transition-all text-center truncate px-1.5",
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

      {/* Content: Stack on mobile, side-by-side on desktop */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Left Sidebar - Details (full width on mobile, fixed on desktop) */}
        <div className="w-full md:w-72 shrink-0 border-b md:border-b-0 md:border-r overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 max-h-[40vh] md:max-h-none">
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
            <div className="overflow-x-auto scrollbar-hide border-b bg-card">
              <TabsList className="w-max sm:w-full justify-start rounded-none bg-card px-3 sm:px-4 h-10">
                <TabsTrigger value="historico" className="text-[11px] sm:text-xs gap-1">
                  <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Histórico
                </TabsTrigger>
                <TabsTrigger value="notas" className="text-[11px] sm:text-xs gap-1">
                  <StickyNote className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Notas
                </TabsTrigger>
                <TabsTrigger value="atividades" className="text-[11px] sm:text-xs gap-1">
                  <Activity className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Atividades
                </TabsTrigger>
                <TabsTrigger value="ligacoes" className="text-[11px] sm:text-xs gap-1">
                  <PhoneCall className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Ligações
                </TabsTrigger>
                <TabsTrigger value="contratos" className="text-[11px] sm:text-xs gap-1">
                  <FileSignature className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Contratos
                </TabsTrigger>
                <TabsTrigger value="propostas" className="text-[11px] sm:text-xs gap-1">
                  <FileSpreadsheet className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Propostas
                </TabsTrigger>
                <TabsTrigger value="assinatura" className="text-[11px] sm:text-xs gap-1">
                  <FileSignature className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Assinatura
                </TabsTrigger>
                <TabsTrigger value="simulacao" className="text-[11px] sm:text-xs gap-1">
                  <Calculator className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Simulação
                </TabsTrigger>
                {(isAdminPipeline || role === "administrativo" || role === "admin") && (
                  <TabsTrigger value="cadastro" className="text-[11px] sm:text-xs gap-1">
                    <ClipboardList className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Cadastro
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

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
                  <NoteEditor
                    value={noteText}
                    onChange={setNoteText}
                    placeholder="Escreva sua nota aqui..."
                    leadContext={`Empresa: ${lead.company_name}, Contato: ${lead.contact_name || "N/A"}, Etapa: ${lead.stage}, Valor MRR: ${lead.value_mrr}, Origem: ${lead.source}`}
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
              <LeadPropostasTab lead={lead} addActivity={addActivity} onUpdateLead={onUpdate} />
            </TabsContent>

            {/* Assinatura - select accepted proposal to send for signature */}
            <TabsContent value="assinatura" className="flex-1 overflow-y-auto p-4 mt-0">
              <LeadPropostasTab lead={lead} addActivity={addActivity} signatureMode />
            </TabsContent>

            {/* Simulação */}
            <TabsContent value="simulacao" className="flex-1 overflow-y-auto p-4 mt-0">
              <LeadSimulacaoTab lead={lead} addActivity={addActivity} />
            </TabsContent>

            {/* Cadastro do Cliente */}
            {(isAdminPipeline || role === "administrativo" || role === "admin") && (
              <TabsContent value="cadastro" className="flex-1 overflow-y-auto p-4 mt-0">
                <LeadCadastroTab lead={lead} onUpdate={onUpdate} />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
      {/* Lost reason dialog */}
      <Dialog open={showLostDialog} onOpenChange={setShowLostDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Negócio Perdido</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Por favor informe o motivo da perda do negócio:</p>
            <Select value={selectedLostReason} onValueChange={setSelectedLostReason}>
              <SelectTrigger><SelectValue placeholder="Selecione um motivo" /></SelectTrigger>
              <SelectContent>
                {LOST_REASONS.map(r => (
                  <SelectItem key={r.value} value={r.value} className="text-xs">
                    <span className="font-semibold">{r.label}:</span> {r.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowLostDialog(false); setSelectedLostReason(""); }}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmLost} disabled={!selectedLostReason || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen dialog with user assignment */}
      <Dialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Reabrir Oportunidade</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Selecione o vendedor que ficará responsável por esta oportunidade:</p>
            <Select value={reopenUserId} onValueChange={setReopenUserId}>
              <SelectTrigger><SelectValue placeholder="Selecione um usuário" /></SelectTrigger>
              <SelectContent>
                {reopenUsers.map(u => (
                  <SelectItem key={u.user_id} value={u.user_id} className="text-xs">
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowReopenDialog(false); setReopenUserId(""); }}>Cancelar</Button>
            <Button onClick={confirmReopen} disabled={!reopenUserId || saving} className="bg-green-600 hover:bg-green-700 text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reabrir e Atribuir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <WonConfirmDialog
        open={showWonConfirm}
        onClose={() => setShowWonConfirm(false)}
        onConfirm={executeWon}
        saving={saving}
      />

      <WonCelebrationDialog
        open={showWonCelebration}
        onClose={() => setShowWonCelebration(false)}
        leadName={lead.contact_name || lead.company_name}
      />

      {/* Return to operator dialog */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Devolver ao Operador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground text-center">
              O card será devolvido ao operador <strong>{lead.created_by_name || "original"}</strong> na etapa <strong>Contrato Fechado</strong>.
            </p>
            <div className="space-y-2">
              <Label htmlFor="return-note" className="text-sm font-medium">Motivo da devolução *</Label>
              <Textarea
                id="return-note"
                placeholder="Descreva o motivo da devolução do card..."
                value={returnNote}
                onChange={(e) => setReturnNote(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowReturnDialog(false)} disabled={saving} className="flex-1">
              Cancelar
            </Button>
            <Button
              disabled={saving || !returnNote.trim()}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              onClick={async () => {
                if (!returnNote.trim()) {
                  toast.error("Informe o motivo da devolução");
                  return;
                }
                setSaving(true);
                try {
                  // Add "Devolvido" tag
                  const currentTags = lead.tags || [];
                  const newTags = currentTags.includes("Devolvido") ? currentTags : [...currentTags, "Devolvido"];

                  const success = await onUpdate(lead.id, {
                    lead_status: "open",
                    stage: "contrato-fechado",
                    stage_entered_at: new Date().toISOString(),
                    tags: newTags,
                  } as any);
                  if (success) {
                    await addActivity({
                      type: "stage_change",
                      title: "Card devolvido ao operador",
                      description: `Lead devolvido ao pipeline comercial (etapa **Contrato Fechado**) pelo setor administrativo.\n\n**Motivo:** ${returnNote.trim()}\n**Operador original:** ${lead.created_by_name || "Não identificado"}`,
                    });

                    // Notify the original operator
                    if (lead.created_by_user_id) {
                      await supabase.rpc("create_notification", {
                        _user_id: lead.created_by_user_id,
                        _title: "Card devolvido",
                        _message: `O card "${lead.company_name}" foi devolvido para você. Motivo: ${returnNote.trim()}`,
                        _type: "card_devolvido",
                        _link: "/atendimento",
                      });
                    }

                    toast.success("Card devolvido ao operador com sucesso!");
                    setShowReturnDialog(false);
                    onBack();
                  }
                } catch (error) {
                  console.error("Error returning lead:", error);
                  toast.error("Erro ao devolver card");
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar Devolução
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Ownership Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Transferir Propriedade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground text-center">
              Selecione o novo responsável por esta oportunidade.
            </p>
            <p className="text-xs text-muted-foreground text-center">
              Responsável atual: <strong>{lead.created_by_name || "—"}</strong>
            </p>
            <Select value={transferUserId} onValueChange={setTransferUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um usuário" />
              </SelectTrigger>
              <SelectContent>
                {transferUsers.map(u => (
                  <SelectItem key={u.user_id} value={u.user_id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>Cancelar</Button>
            <Button onClick={confirmTransferOwnership} disabled={saving || !transferUserId}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserRoundPen className="h-4 w-4 mr-2" />}
              Transferir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
