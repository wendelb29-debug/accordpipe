import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft, Building2, User, Mail, Phone as PhoneIcon, MapPin, Calendar, Calculator,
  DollarSign, Clock, Tag, StickyNote, CheckCircle, XCircle, Plus,
  MessageSquare, PhoneCall, FileText, Activity, Trash2, Send, Loader2,
  FileSignature, Eye, Download, Copy, Image as ImageIcon, Search,
  FileSpreadsheet, Edit, MoreVertical, ThumbsUp, ThumbsDown, Paperclip,
  Link2, CopyPlus, ClipboardList, UserRoundPen, Headphones, ChevronDown, ChevronUp, PanelLeftClose, PanelLeftOpen, MessageCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { downloadContractPdf } from "@/lib/generateContractPdf";
import { LeadAtividadesTab } from "./LeadAtividadesTab";
import { NoteEditor } from "./NoteEditor";
import { LeadPropostasTab } from "./LeadPropostasTab";

import { LeadDocsTab } from "./LeadDocsTab";
import { LeadDocumentosTab } from "./LeadDocumentosTab";
import { LeadPosVendaTab } from "./LeadPosVendaTab";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LeadCadastroTab } from "./LeadCadastroTab";
import { LeadWhatsAppTab } from "./LeadWhatsAppTab";
import { WhatsAppSendDialog } from "./WhatsAppSendDialog";
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
import { getLeadContractSignatureStats } from "@/lib/contractSigners";
import { CrmLead, STAGES, ADMIN_STAGES, ALL_STAGES, DynamicStage } from "@/hooks/useCrmLeads";
import { useCrmActivities } from "@/hooks/useCrmActivities";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { WonConfirmDialog, WonCelebrationDialog } from "./WonCelebrationDialog";
import { getOrCreateCadastroWorkspace } from "@/lib/cadastroWorkspace";
import { KanbanStageHeader } from "./KanbanStageHeader";
import { NewCallDialog } from "./NewCallDialog";

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
  dynamicStages?: DynamicStage[];
  stagesLoading?: boolean;
}

const LOST_REASONS = [
  { value: "dados_incorretos", label: "DADOS INCORRETOS", description: "Os dados fornecidos não são do cliente ou não são verídicos" },
  { value: "desistiu", label: "DESISTIU", description: "Cliente desistiu do negócio após um prazo de negociação ou adiou o investimento" },
  { value: "parou_responder", label: "PAROU DE RESPONDER", description: "Cliente chegou a atender, mas após alguns contatos deixou de responder" },
  { value: "preco_contrato", label: "PREÇO CONTRATO", description: "Cliente desistiu do negócio devido ao preço do contrato" },
  { value: "sem_contato", label: "SEM CONTATO", description: "Não obteve sucesso em nenhum dos contatos" },
];

export function CrmLeadDetailView({ lead, onBack, onUpdate, onMoveStage, onDelete, isAdminPipeline, dynamicStages, stagesLoading }: CrmLeadDetailViewProps) {
  const { role, profile } = useAuth();
  const { activities, loading: activitiesLoading, addActivity, refetch: refetchActivities } = useCrmActivities(lead.id);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("historico");
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('accord-sidebar-collapsed') === 'true'; } catch { return false; }
  });
  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('accord-sidebar-collapsed', String(next)); } catch {}
      return next;
    });
  };
  const [form, setForm] = useState<any>({ ...lead });
  const [newActivity, setNewActivity] = useState({ type: "note", title: "", description: "" });
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchingCnpj, setSearchingCnpj] = useState(false);
  const [searchingCep, setSearchingCep] = useState(false);
  const [companyAddress, setCompanyAddress] = useState<any>({});
  const [showLostDialog, setShowLostDialog] = useState(false);
  const [selectedLostReason, setSelectedLostReason] = useState("");
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [reopenUserId, setReopenUserId] = useState("");
  const [reopenUsers, setReopenUsers] = useState<{ user_id: string; name: string }[]>([]);
  const [showWonCelebration, setShowWonCelebration] = useState(false);
  const [showWonConfirm, setShowWonConfirm] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [returnNote, setReturnNote] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferUserId, setTransferUserId] = useState("");
  const [transferUsers, setTransferUsers] = useState<{ user_id: string; name: string }[]>([]);

  // Signature status tracking
  const [signatureStats, setSignatureStats] = useState<{ signed: number; total: number } | null>(null);

  // Note compose state
  const [noteText, setNoteText] = useState("");
  const [noteImage, setNoteImage] = useState<File | null>(null);
  const [noteImagePreview, setNoteImagePreview] = useState<string | null>(null);
  const [newCallOpen, setNewCallOpen] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [savingEditNote, setSavingEditNote] = useState(false);
  const noteFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) {
      setForm({ ...lead });
    } else {
      // Load company address when editing starts
      if (lead.company_id) {
        supabase.from("companies").select("endereco, numero, bairro, complemento, cidade, estado, cep, razao_social, nome_fantasia, email, telefone, cnpj")
          .eq("id", lead.company_id).maybeSingle().then(({ data }) => {
            if (data) {
              setCompanyAddress(data);
              setForm(prev => ({
                ...prev,
                comp_endereco: data.endereco || prev.comp_endereco || "",
                comp_numero: data.numero || prev.comp_numero || "",
                comp_bairro: data.bairro || prev.comp_bairro || "",
                comp_complemento: data.complemento || prev.comp_complemento || "",
                comp_cep: data.cep || prev.comp_cep || "",
                comp_razao_social: data.razao_social || "",
                comp_nome_fantasia: data.nome_fantasia || "",
                comp_email: data.email || "",
                comp_telefone: data.telefone || "",
              }));
            }
          });
      } else {
        // Load address from lead itself
        setForm(prev => ({
          ...prev,
          comp_cep: (lead as any).cep || prev.comp_cep || "",
          comp_endereco: (lead as any).endereco || prev.comp_endereco || "",
          comp_bairro: (lead as any).bairro || prev.comp_bairro || "",
          comp_numero: (lead as any).numero || prev.comp_numero || "",
          comp_complemento: (lead as any).complemento || prev.comp_complemento || "",
        }));
      }
    }
  }, [lead, editing]);

  // Fetch signature stats for this lead's contract
  useEffect(() => {
    const fetchSignatureStats = async () => {
      const { data: contract } = await supabase
        .from("contracts")
        .select("id, signature_status")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!contract) {
        setSignatureStats(null);
        return;
      }
      await loadSignerStats(contract.id, contract.signature_status);
    };

    const loadSignerStats = async (contractId: string, signatureStatus?: string | null) => {
      const { data: signers } = await supabase
        .from("contract_signatures")
        .select("id, signed_at, signer_role, signer_name, signer_document")
        .eq("contract_id", contractId);

      if (signers) {
        const { signed, total, allSigned } = getLeadContractSignatureStats(signers as any[]);
        setSignatureStats({ signed, total });
        if (allSigned && signatureStatus !== "signed") {
          await supabase.from("contracts").update({ signature_status: "signed" } as any).eq("id", contractId);
        }
      }
    };

    fetchSignatureStats();

    // Realtime subscription for signature updates
    const channel = supabase
      .channel(`sig-status-${lead.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contract_signatures' }, () => {
        fetchSignatureStats();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [lead.id, lead.company_id, lead.servidor_id]);

  // pipelineStages now handled by KanbanStageHeader

  const getDaysTotal = () => {
    const created = new Date(lead.created_at);
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  };

  const handleCnpjSearch = async () => {
    const cnpjClean = (form.documento || "").replace(/\D/g, "");
    if (cnpjClean.length !== 14) {
      toast.error("CNPJ inválido. Informe 14 dígitos.");
      return;
    }
    setSearchingCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjClean}`);
      if (!res.ok) throw new Error("CNPJ não encontrado");
      const data = await res.json();
      setForm(prev => ({
        ...prev,
        company_name: data.razao_social || prev.company_name,
        contact_name: data.qsa?.[0]?.nome_socio || prev.contact_name,
        email: data.email && data.email !== "" ? data.email : prev.email,
        phone: data.ddd_telefone_1 || prev.phone,
        cidade: data.municipio || prev.cidade,
        estado: data.uf || prev.estado,
        comp_endereco: data.logradouro || prev.comp_endereco,
        comp_bairro: data.bairro || prev.comp_bairro,
        comp_numero: data.numero || prev.comp_numero,
        comp_cep: data.cep ? data.cep.replace(/\D/g, "") : prev.comp_cep,
        comp_razao_social: data.razao_social || prev.comp_razao_social,
      }));
      toast.success("Dados do CNPJ preenchidos!");
    } catch {
      toast.error("Não foi possível consultar o CNPJ");
    } finally {
      setSearchingCnpj(false);
    }
  };

  const handleCepSearch = async () => {
    const cepClean = (form.comp_cep || "").replace(/\D/g, "");
    if (cepClean.length !== 8) {
      toast.error("CEP inválido. Informe 8 dígitos.");
      return;
    }
    setSearchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
      if (!res.ok) throw new Error("CEP não encontrado");
      const data = await res.json();
      if (data.erro) throw new Error("CEP não encontrado");
      setForm(prev => ({
        ...prev,
        comp_endereco: data.logradouro || prev.comp_endereco,
        comp_bairro: data.bairro || prev.comp_bairro,
        cidade: data.localidade || prev.cidade,
        estado: data.uf || prev.estado,
      }));
      toast.success("Endereço preenchido pelo CEP!");
    } catch {
      toast.error("Não foi possível consultar o CEP");
    } finally {
      setSearchingCep(false);
    }
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
        documento: form.documento,
        cep: form.comp_cep || null,
        endereco: form.comp_endereco || null,
        bairro: form.comp_bairro || null,
        numero: form.comp_numero || null,
        complemento: form.comp_complemento || null,
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
        // Also update company address if company_id exists
        if (lead.company_id) {
          await supabase.from("companies").update({
            endereco: form.comp_endereco || null,
            numero: form.comp_numero || null,
            bairro: form.comp_bairro || null,
            complemento: form.comp_complemento || null,
            cep: form.comp_cep || null,
            cidade: form.cidade || null,
            estado: form.estado || null,
            email: form.comp_email || null,
            telefone: form.comp_telefone || null,
            razao_social: form.comp_razao_social || form.company_name,
          } as any).eq("id", lead.company_id);
        }

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
      // Find or create the Cadastro workspace for this tenant
      const cadastro = await getOrCreateCadastroWorkspace(lead.servidor_id, profile?.user_id);
      if (!cadastro) {
        toast.error("Erro ao localizar/criar workspace de Cadastro");
        setSaving(false);
        return;
      }

      // Save origin info before moving
      const originWorkspaceId = lead.workspace_id;
      const originStage = lead.stage;

      // Move lead to Cadastro workspace first column
      await onUpdate(lead.id, {
        lead_status: "won",
        stage: cadastro.firstColumnId,
        stage_entered_at: new Date().toISOString(),
        workspace_id: cadastro.workspaceId,
      } as any);

      const desc = observation.trim()
        ? `Lead marcado como ganho e transferido para o workspace **Cadastro**.\nObservação: ${observation.trim()}`
        : "Lead marcado como ganho e transferido para o workspace **Cadastro**.";
      await addActivity({
        type: "won",
        title: "Oportunidade ganha! Transferida para Cadastro.",
        description: desc,
        metadata: {
          origin_workspace_id: originWorkspaceId,
          origin_stage: originStage,
          origin_created_by_user_id: lead.created_by_user_id,
          origin_created_by_name: lead.created_by_name,
        },
      });
      
      // Create registration with pendente status
      await supabase.from("crm_client_registrations" as any).insert({
        lead_id: lead.id,
        servidor_id: lead.servidor_id,
        nome_completo: lead.contact_name || lead.company_name || "",
        email: lead.email || "",
        cpf: (lead as any).documento || null,
        cep: lead.cep || null,
        endereco: lead.endereco || null,
        numero: lead.numero || null,
        bairro: lead.bairro || null,
        cidade: lead.cidade || null,
        estado: lead.estado || null,
        valor_mensal: lead.value_mrr || 0,
        created_by_user_id: profile?.user_id || null,
        created_by_name: profile?.name || null,
      } as any);

      // Notify admin users
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
              _message: `A oportunidade "${lead.company_name}" foi marcada como ganha e aguarda conferência no workspace Cadastro.`,
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
      toast.info("Oportunidade marcada como perdida e enviada para o Descarte");
      setShowLostDialog(false);
      setSelectedLostReason("");
      onBack();
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
        const { data: signedData } = await supabase.storage.from("documents").createSignedUrl(path, 3600);
        imageUrl = signedData?.signedUrl || "";
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

  const handleEditNote = (activity: any) => {
    setEditingNoteId(activity.id);
    setEditingNoteText(activity.description || activity.title || "");
  };

  const handleSaveEditNote = async () => {
    if (!editingNoteId || !editingNoteText.trim()) return;
    setSavingEditNote(true);
    try {
      await supabase.from("crm_lead_activities").update({
        description: editingNoteText.trim(),
        title: editingNoteText.trim().slice(0, 100),
      } as any).eq("id", editingNoteId);
      toast.success("Nota atualizada!");
      setEditingNoteId(null);
      setEditingNoteText("");
      refetchActivities?.();
    } catch {
      toast.error("Erro ao atualizar nota");
    } finally {
      setSavingEditNote(false);
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
      <div className="border-b bg-card px-3 sm:px-4 py-1.5 sm:py-2">
        <div className="flex items-center justify-between mb-1 sm:mb-1.5 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold text-foreground truncate">{lead.source} - {lead.contact_name || lead.company_name}</h2>
              {/* Form origin tags */}
              {lead.tags && lead.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {lead.tags.filter(t => t !== "formulario" && t !== "landing-page" && t !== "Devolvido" && t !== "Pendente de Correção").map(tag => (
                    <Badge key={tag} variant="outline" className="text-[10px] h-5 gap-1 border-emerald-500/30 text-emerald-600 bg-emerald-500/5">
                      <Plus className="h-2.5 w-2.5" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap justify-end">
            {lead.lead_status === "open" && (
              <>
                {(() => {
                  const currentStage = dynamicStages?.find(s => s.id === lead.stage);
                  const wonAllowed = currentStage ? (currentStage.allow_mark_as_won ?? false) : true;
                  return wonAllowed ? (
                    <Button size="sm" onClick={handleWon} disabled={saving} className="gap-1 sm:gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white h-7 sm:h-8 text-[11px] sm:text-xs px-2 sm:px-3 border-0" style={{ backgroundImage: 'none', backgroundColor: '#10B981' }}>
                      <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Ganho
                    </Button>
                  ) : null;
                })()}
                <Button size="sm" variant="destructive" onClick={handleLost} disabled={saving} className="gap-1 sm:gap-1.5 h-7 sm:h-8 text-[11px] sm:text-xs px-2 sm:px-3">
                  <XCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Perdido
                </Button>
              </>
            )}
            {lead.lead_status === "won" && (
              <>
                <Badge className="bg-green-600 text-white text-[10px]">✓ Ganho</Badge>
                {(role === "admin" || role === "administrativo" || role === "ceo") && (
                  <>
                    <Button size="sm" onClick={async () => {
                      setSaving(true);
                      try {
                        const { data: reg } = await supabase
                          .from("crm_client_registrations")
                          .select("id")
                          .eq("lead_id", lead.id)
                          .maybeSingle();
                        if (reg) {
                          const regUpdate: any = {
                            client_status: "ativo",
                            status: "concluido",
                            nome_completo: lead.contact_name || lead.company_name || null,
                            cpf: lead.documento || null,
                            email: lead.email || null,
                            cep: lead.cep || null,
                            endereco: lead.endereco || null,
                            numero: lead.numero || null,
                            bairro: lead.bairro || null,
                            cidade: lead.cidade || null,
                            estado: lead.estado || null,
                            plano_contratado: null,
                            valor_mensal: lead.value_mrr || 0,
                          };
                          await supabase.from("crm_client_registrations")
                            .update(regUpdate)
                            .eq("id", reg.id);
                        }
                        const currentTags = lead.tags || [];
                        const cleanTags = currentTags.filter(t => t !== "Pendente de Correção");
                        await onUpdate(lead.id, { stage: "cadastro-concluido", tags: cleanTags } as any);
                        await addActivity({ type: "won", title: "Cadastro aprovado pelo administrativo", description: `Cliente aprovado e ativado na **Base de Clientes** por ${profile?.name || "Admin"}.` });
                        toast.success("Cliente aprovado e ativado na Base de Clientes!");
                        onBack();
                      } catch (err) {
                        toast.error("Erro ao aprovar cadastro");
                      } finally { setSaving(false); }
                    }} disabled={saving} className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white h-7 sm:h-8 text-[11px] sm:text-xs px-2 sm:px-3 border-0">
                      <CheckCircle className="h-3 w-3" /> Aprovar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      setReturnNote("");
                      setReturnReason("");
                      setShowReturnDialog(true);
                    }} disabled={saving} className="gap-1 border-orange-300 text-orange-700 hover:bg-orange-50 h-7 sm:h-8 text-[11px] sm:text-xs px-2 sm:px-3">
                      <ArrowLeft className="h-3 w-3" /> Devolver
                    </Button>
                  </>
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={handleTransferOwnership} disabled={saving} className="focus:outline-none">
                    <Avatar className="h-7 w-7 sm:h-8 sm:w-8 ring-2 ring-primary/20 cursor-pointer hover:ring-primary/40 transition-all">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                        {lead.created_by_name
                          ? lead.created_by_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
                          : "?"}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs font-medium">
                  {lead.created_by_name || "Sem responsável"} — Clique para transferir
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Dynamic Pipeline Progress Bar */}
        <KanbanStageHeader
          currentStageId={lead.stage}
          stageEnteredAt={lead.stage_entered_at}
          dynamicStages={dynamicStages}
          isAdminPipeline={isAdminPipeline}
          stagesLoading={stagesLoading}
          saving={saving}
          onChangeStage={handleStageChange}
        />
      </div>

      {/* Content: Stack on mobile, side-by-side on desktop */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
        {/* Left Sidebar - Details (full width on mobile, collapsible on desktop) */}
        <div
          className={cn(
            "shrink-0 min-h-0 border-b md:border-b-0 md:border-r overflow-y-auto transition-all duration-250 ease-in-out",
            sidebarCollapsed
              ? "hidden md:block md:w-10 p-0"
              : "w-full md:w-72 p-3 sm:p-4",
            !sidebarCollapsed && (detailsCollapsed ? 'max-h-fit' : 'max-h-[40vh]'),
            "md:max-h-none"
          )}
        >
          {/* Collapsed state - desktop only */}
          {sidebarCollapsed && (
            <div className="hidden md:flex flex-col items-center py-2 gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={toggleSidebar} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                    <PanelLeftOpen className="h-4 w-4 text-muted-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">Expandir dados do cliente</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-1.5">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">Dados do Cliente</TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Expanded state */}
          {!sidebarCollapsed && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setDetailsCollapsed(!detailsCollapsed)}
                  className="flex items-center gap-1.5 md:pointer-events-none"
                >
                  <h3 className="text-sm font-semibold flex items-center gap-1.5">
                    <FileText className="h-4 w-4" /> Dados do Cliente
                  </h3>
                  {detailsCollapsed ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground md:hidden" />
                  ) : (
                    <ChevronUp className="h-4 w-4 text-muted-foreground md:hidden" />
                  )}
                </button>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => editing ? handleSave() : setEditing(true)} disabled={saving} className="h-7 text-xs">
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : editing ? "Salvar" : "Editar"}
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button onClick={toggleSidebar} className="hidden md:inline-flex p-1.5 rounded-md hover:bg-muted transition-colors">
                        <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">Recolher painel</TooltipContent>
                  </Tooltip>
                </div>
              </div>

          <div className={`space-y-3 text-xs ${detailsCollapsed ? 'hidden md:block' : ''}`}>
            <DetailField icon={Clock} label="Última atualização" value={new Date(lead.updated_at).toLocaleString("pt-BR")} />
            <DetailField icon={Tag} label="ID da oportunidade" value={lead.id.slice(0, 8)} />

            {editing ? (
              <>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">CNPJ/CPF</Label>
                  <div className="flex gap-1">
                    <Input className="h-7 text-xs flex-1" placeholder="00.000.000/0000-00" value={form.documento || ""} onChange={(e) => setForm({ ...form, documento: e.target.value })} />
                    <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={handleCnpjSearch} disabled={searchingCnpj} title="Buscar dados do CNPJ">
                      {searchingCnpj ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Empresa</Label>
                  <Input className="h-7 text-xs" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Nome do Cliente</Label>
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

                {/* Address section with CEP lookup */}
                <div className="pt-1 border-t border-border/50">
                  <Label className="text-[10px] text-muted-foreground font-semibold">Endereço da Empresa</Label>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">CEP</Label>
                  <div className="flex gap-1">
                    <Input className="h-7 text-xs flex-1" placeholder="00000-000" value={form.comp_cep || ""} onChange={(e) => setForm({ ...form, comp_cep: e.target.value })} />
                    <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={handleCepSearch} disabled={searchingCep} title="Buscar endereço pelo CEP">
                      {searchingCep ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Endereço</Label>
                  <Input className="h-7 text-xs" value={form.comp_endereco || ""} onChange={(e) => setForm({ ...form, comp_endereco: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Número</Label>
                    <Input className="h-7 text-xs" value={form.comp_numero || ""} onChange={(e) => setForm({ ...form, comp_numero: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Complemento</Label>
                    <Input className="h-7 text-xs" value={form.comp_complemento || ""} onChange={(e) => setForm({ ...form, comp_complemento: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Bairro</Label>
                  <Input className="h-7 text-xs" value={form.comp_bairro || ""} onChange={(e) => setForm({ ...form, comp_bairro: e.target.value })} />
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
                <DetailField icon={FileText} label="CNPJ/CPF" value={lead.documento || "Não informado"} />
                <DetailField icon={Building2} label="Empresa" value={lead.company_name} />
                <DetailField icon={User} label="Nome do Cliente" value={lead.contact_name || "Não informado"} />
                <DetailField icon={Mail} label="Email" value={lead.email || "Não informado"} />
                <div>
                  <p className="text-[10px] text-primary font-medium flex items-center gap-1">
                    <PhoneIcon className="h-3 w-3" /> Telefone
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <p className="text-xs text-foreground">{lead.phone || "Não informado"}</p>
                    {lead.phone?.trim() && (
                      <button
                        type="button"
                        onClick={() => setWhatsAppOpen(true)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-medium transition-colors"
                      >
                        <MessageSquare className="h-3 w-3" />
                        Enviar mensagem
                      </button>
                    )}
                  </div>
                </div>
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
          )}
        </div>

        {/* Main Content - Tabs */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="shrink-0 overflow-x-auto scrollbar-hide border-b bg-card">
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
                <TabsTrigger value="propostas" className="text-[11px] sm:text-xs gap-1">
                  <FileSpreadsheet className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Propostas
                </TabsTrigger>
                <TabsTrigger value="docs" className="text-[11px] sm:text-xs gap-1">
                  <FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Docs
                </TabsTrigger>
                {(isAdminPipeline || role === "administrativo" || role === "admin" || role === "ceo" || profile?.is_master) && (
                  <TabsTrigger value="pos-venda" className="text-[11px] sm:text-xs gap-1">
                    <Headphones className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Pós-Venda
                  </TabsTrigger>
                )}
                <TabsTrigger value="conversa" className="text-[11px] sm:text-xs gap-1">
                  <MessageCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Conversa
                </TabsTrigger>
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
                          {editingNoteId === activity.id ? (
                            <div className="space-y-2">
                              <textarea
                                className="w-full text-xs border border-border rounded-md p-2 bg-background text-foreground resize-none min-h-[60px]"
                                value={editingNoteText}
                                onChange={(e) => setEditingNoteText(e.target.value)}
                              />
                              <div className="flex gap-2 justify-end">
                                <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => setEditingNoteId(null)}>Cancelar</Button>
                                <Button size="sm" className="h-6 text-[10px]" onClick={handleSaveEditNote} disabled={savingEditNote}>
                                  {savingEditNote ? <Loader2 className="h-3 w-3 animate-spin" /> : "Salvar"}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
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
                                <div className="flex items-center gap-1 shrink-0 ml-3">
                                  <span className="text-[10px] text-muted-foreground text-right">
                                    {activity.created_by_name || "Sistema"}
                                  </span>
                                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleEditNote(activity)} title="Editar nota">
                                    <Edit className="h-3 w-3 text-muted-foreground" />
                                  </Button>
                                </div>
                              </div>
                              <p className="text-[10px] text-primary mt-2">
                                {formatFullDate(activity.created_at)}
                              </p>
                            </>
                          )}
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
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Ligações registradas</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Histórico de contatos telefônicos com este lead
                  </p>
                </div>
                <button
                  onClick={() => setNewCallOpen(true)}
                  className="h-9 px-3.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[12px] font-semibold inline-flex items-center gap-1.5 transition"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  Registrar ligação
                </button>
              </div>
              <ActivityFilteredList activities={activities.filter((a) => a.type === "call")} loading={activitiesLoading} emptyLabel="ligações" />
            </TabsContent>


            {/* Propostas */}
            <TabsContent value="propostas" className="flex-1 min-h-0 overflow-hidden p-2 sm:p-4 mt-0 w-full max-w-full data-[state=active]:flex data-[state=active]:flex-col">
              <LeadPropostasTab lead={lead} addActivity={addActivity} onUpdateLead={onUpdate} />
            </TabsContent>

             {/* Docs - Documentos Gerados + Arquivos */}
            <TabsContent value="docs" className="flex-1 overflow-y-auto p-2 sm:p-4 mt-0 space-y-6">
              <LeadDocumentosTab lead={lead} addActivity={addActivity} />
              <LeadDocsTab lead={lead} />
            </TabsContent>


             {/* Pós-Venda */}
            {(isAdminPipeline || role === "administrativo" || role === "admin" || role === "ceo" || profile?.is_master) && (
              <TabsContent value="pos-venda" className="flex-1 overflow-y-auto p-4 mt-0">
                <LeadPosVendaTab lead={lead} />
              </TabsContent>
            )}

            {/* Conversa WhatsApp */}
            <TabsContent value="conversa" className="flex-1 overflow-hidden p-0 mt-0 flex flex-col">
              <LeadWhatsAppTab lead={lead} onBack={() => setActiveTab("historico")} />
            </TabsContent>
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

      <WhatsAppSendDialog
        open={whatsAppOpen}
        onOpenChange={setWhatsAppOpen}
        phone={lead.phone || ""}
        contactName={lead.contact_name}
        companyName={lead.company_name}
        tenantId={lead.servidor_id}
        onSent={(text, formattedPhone) => {
          const preview = text.length > 60 ? `${text.slice(0, 60)}...` : text;
          addActivity({
            type: "whatsapp_sent",
            title: `📱 WhatsApp enviado para +${formattedPhone}`,
            description: preview,
          });
        }}
      />

      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Devolver ao Operador</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              O card será devolvido ao operador <strong>{lead.created_by_name || "original"}</strong> no workspace e etapa de origem.
            </p>
            <div className="space-y-2">
              <Label htmlFor="return-reason" className="text-sm font-medium">Motivo da devolução *</Label>
              <Select value={returnReason} onValueChange={setReturnReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motivo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dados_incompletos">Dados incompletos</SelectItem>
                  <SelectItem value="documento_pendente">Documento pendente</SelectItem>
                  <SelectItem value="contrato_nao_assinado">Contrato não assinado</SelectItem>
                  <SelectItem value="cadastro_inconsistente">Cadastro inconsistente</SelectItem>
                  <SelectItem value="correcao_comercial">Necessidade de correção comercial</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="return-note" className="text-sm font-medium">Observação</Label>
              <Textarea
                id="return-note"
                placeholder="Observação adicional (opcional)..."
                value={returnNote}
                onChange={(e) => setReturnNote(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowReturnDialog(false)} disabled={saving} className="flex-1">
              Cancelar
            </Button>
            <Button
              disabled={saving || !returnReason}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              onClick={async () => {
                if (!returnReason) {
                  toast.error("Selecione o motivo da devolução");
                  return;
                }
                setSaving(true);
                try {
                  // Find origin workspace/stage from won activity metadata
                  const { data: wonActivities } = await supabase
                    .from("crm_lead_activities")
                    .select("metadata")
                    .eq("lead_id", lead.id)
                    .eq("type", "won")
                    .order("created_at", { ascending: false })
                    .limit(1);

                  const wonMeta = wonActivities?.[0]?.metadata as any;
                  const originWorkspaceId = wonMeta?.origin_workspace_id || lead.workspace_id;
                  const originStage = wonMeta?.origin_stage || wonMeta?.previous_stage || "contrato-fechado";

                  // Add "Devolvido" tag
                  const currentTags = lead.tags || [];
                  let newTags = [...currentTags];
                  if (!newTags.includes("Devolvido")) newTags.push("Devolvido");
                  if (!newTags.includes("Pendente de Correção")) newTags.push("Pendente de Correção");

                  const success = await onUpdate(lead.id, {
                    lead_status: "open",
                    stage: originStage,
                    workspace_id: originWorkspaceId,
                    stage_entered_at: new Date().toISOString(),
                    tags: newTags,
                  } as any);
                  if (success) {
                    const reasonLabels: Record<string, string> = {
                      dados_incompletos: "Dados incompletos",
                      documento_pendente: "Documento pendente",
                      contrato_nao_assinado: "Contrato não assinado",
                      cadastro_inconsistente: "Cadastro inconsistente",
                      correcao_comercial: "Necessidade de correção comercial",
                      outro: "Outro",
                    };
                    const reasonText = reasonLabels[returnReason] || returnReason;
                    const obsText = returnNote.trim() ? `\n**Observação:** ${returnNote.trim()}` : "";

                    await addActivity({
                      type: "stage_change",
                      title: "Card devolvido ao operador",
                      description: `Lead devolvido ao pipeline comercial pelo setor administrativo.\n\n**Motivo:** ${reasonText}${obsText}\n**Operador original:** ${lead.created_by_name || "Não identificado"}`,
                    });

                    // Notify the original operator
                    if (lead.created_by_user_id) {
                      await supabase.rpc("create_notification", {
                        _user_id: lead.created_by_user_id,
                        _title: "Card devolvido",
                        _message: `O card "${lead.company_name}" foi devolvido para você. Motivo: ${reasonText}`,
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
