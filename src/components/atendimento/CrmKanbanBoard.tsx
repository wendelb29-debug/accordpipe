import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock, Users, MessageSquare, Phone, RefreshCw, FileSignature, GripVertical,
  MoreVertical, Trash2, Edit, Building2, Mail, PhoneCall, Loader2,
  Plus, TrendingUp, Sparkles, Link2, Check, Tag, Search
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CrmLeadDialog } from "./CrmLeadDialog";
import { CrmLeadDetailView } from "./CrmLeadDetailView";
import { FormLinkDialog } from "./FormLinkDialog";
import { useCrmLeads, CrmLead, STAGES } from "@/hooks/useCrmLeads";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const stageIcons: Record<string, React.ElementType> = {
  "novos": Sparkles,
  "standby": Clock,
  
  "primeiro-contato": MessageSquare,
  "call-negocio": Phone,
  "follow-up-1": RefreshCw,
  "follow-up-2": RefreshCw,
  "informe-cs": TrendingUp,
  "contrato-fechado": FileSignature,
};

interface CrmKanbanBoardProps {
  searchTerm: string;
}

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CrmKanbanBoard({ searchTerm }: CrmKanbanBoardProps) {
  const { leads, loading, createLead, updateLead, deleteLead, moveToStage, markAsWonAndTransfer, totalLeads, totalPS, totalMRR, stageStats } = useCrmLeads("commercial");
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [draggedLead, setDraggedLead] = useState<CrmLead | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [detailLead, setDetailLead] = useState<CrmLead | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [formLinkOpen, setFormLinkOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [teamMembers, setTeamMembers] = useState<{ user_id: string; name: string }[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchTerm);

  const isAdminOrMaster = profile?.is_master || false;

  // Fetch team members for admin/master
  useEffect(() => {
    if (!isAdminOrMaster || !profile?.company_id) return;
    const fetchTeam = async () => {
      // Check if user has admin role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", profile.user_id)
        .maybeSingle();
      
      const hasAdminRole = roleData?.role === "admin" || roleData?.role === "ceo";
      if (!profile.is_master && !hasAdminRole) return;

      const { data } = await supabase
        .from("profiles")
        .select("user_id, name")
        .eq("company_id", profile.company_id)
        .eq("is_active", true)
        .order("name");
      if (data) setTeamMembers(data);
    };
    fetchTeam();
  }, [isAdminOrMaster, profile?.company_id, profile?.user_id, profile?.is_master]);

  const copyFormLink = async () => {
    let companyId = profile?.company_id;
    if (!companyId) {
      const { data } = await supabase
        .from("companies")
        .select("id")
        .is("servidor_id", null)
        .in("status", ["active", "teste"])
        .limit(1)
        .maybeSingle();
      companyId = data?.id || null;
    }
    if (!companyId) {
      toast.error("Nenhuma empresa encontrada");
      return;
    }
    const url = `${window.location.origin}/captura/${companyId}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    toast.success("Link do formulário copiado!");
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const filteredLeads = leads.filter((l) => {
    // Filter by selected collaborator
    if (selectedUserId !== "all" && l.created_by_user_id !== selectedUserId) return false;
    const term = localSearch || searchTerm;
    if (!term) return true;
    const s = term.toLowerCase();
    return (
      l.company_name.toLowerCase().includes(s) ||
      l.contact_name?.toLowerCase().includes(s) ||
      l.phone?.includes(s) ||
      l.email?.toLowerCase().includes(s) ||
      l.source?.toLowerCase().includes(s)
    );
  });

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    if (!draggedLead || draggedLead.stage === targetStage) {
      setDraggedLead(null);
      setDragOverStage(null);
      return;
    }
    await moveToStage(draggedLead.id, targetStage);
    setDraggedLead(null);
    setDragOverStage(null);
  };

  const openNew = () => {
    setSelectedLead(null);
    setIsNew(true);
    setDialogOpen(true);
  };

  const openEdit = (lead: CrmLead) => {
    setSelectedLead(lead);
    setIsNew(false);
    setDialogOpen(true);
  };

  const openDetail = (lead: CrmLead) => {
    setDetailLead(lead);
  };

  const handleSave = async (data: Partial<CrmLead>) => {
    if (isNew) {
      await createLead(data);
    } else if (selectedLead) {
      await updateLead(selectedLead.id, data);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (detailLead) {
    const currentLead = leads.find((l) => l.id === detailLead.id) || detailLead;
    return (
      <CrmLeadDetailView
        lead={currentLead}
        onBack={() => setDetailLead(null)}
        onUpdate={updateLead}
        onMoveStage={moveToStage}
        onDelete={async (id) => {
          await deleteLead(id);
          setDetailLead(null);
          return true;
        }}
      />
    );
  }


  return (
    <>
      {/* Compact Summary Bar */}
      <div className="px-3 py-1 border-b bg-card/80 flex items-center gap-2 text-[11px] text-muted-foreground min-h-[28px]">
        <span className="font-medium text-foreground text-xs">{filteredLeads.length} oportunidades</span>
        <span>|</span>
        <span>Total de P&S: <strong className="text-foreground">{formatCurrency(totalPS)}</strong></span>
        <span>|</span>
        <span>Total de MRR: <strong className="text-foreground">{formatCurrency(totalMRR)}</strong></span>
        <div className="ml-auto flex items-center gap-0.5">
          {searchOpen && (
            <Input
              autoFocus
              type="search"
              placeholder="Buscar..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="h-6 w-36 text-[11px] border-0 bg-muted/50 focus-visible:ring-1 rounded-md"
              onBlur={() => { if (!localSearch) setSearchOpen(false); }}
            />
          )}
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setSearchOpen(!searchOpen)}>
            <Search className="h-3 w-3" />
          </Button>
          {(isAdminOrMaster || teamMembers.length > 0) && teamMembers.length > 0 && (
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="h-6 w-32 text-[10px] border-0 bg-muted/50">
                <Users className="h-3 w-3 mr-1 shrink-0" />
                <SelectValue placeholder="Equipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos</SelectItem>
                {teamMembers.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id} className="text-xs">
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setFormLinkOpen(true)}>
            <Tag className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => navigate("/contato")}>
            <Link2 className="h-3 w-3" />
          </Button>
          <Button size="sm" onClick={openNew} className="h-6 gap-1 text-[11px] px-2">
            <Plus className="h-3 w-3" /> Novo
          </Button>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="flex gap-2 p-2 h-[calc(100%-28px)] overflow-x-auto">
        {stageStats.map((stage) => {
          const Icon = stageIcons[stage.id] || Clock;
          const stageLeads = filteredLeads.filter((l) => l.stage === stage.id);

          return (
            <div
              key={stage.id}
              className={cn(
                "flex-shrink-0 w-56 bg-muted/40 rounded-lg flex flex-col",
                dragOverStage === stage.id && "ring-2 ring-primary"
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.id); }}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {/* Column Header */}
              <div className="p-2.5 border-b bg-background rounded-t-lg">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className={cn("p-1 rounded", stage.color)}>
                      <Icon className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="font-semibold text-xs">{stage.title}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{stage.count}</Badge>
                  </div>
                  {stage.daysLimit && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{stage.daysLimit}</Badge>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {formatCurrency(stage.totalPS)} / {formatCurrency(stage.totalMRR)}
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 p-1 space-y-1 overflow-y-auto">
                {stageLeads.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Icon className="h-8 w-8 mb-2 opacity-30" />
                    <p className="text-xs">Etapa vazia</p>
                  </div>
                )}
                {stageLeads.map((lead) => (
                  <Card
                    key={lead.id}
                    draggable
                    onDragStart={() => setDraggedLead(lead)}
                    onClick={() => openDetail(lead)}
                    className={cn(
                      "cursor-grab active:cursor-grabbing hover:shadow-md transition-all text-xs",
                      draggedLead?.id === lead.id && "opacity-50"
                    )}
                  >
                    <CardContent className="p-2 space-y-1">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-1.5 min-w-0">
                          <GripVertical className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold text-xs truncate text-foreground">{lead.source}</p>
                            <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                              <Building2 className="h-3 w-3 shrink-0" />
                              <span className="truncate">{lead.company_name}</span>
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-5 w-5">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(lead); }}>
                              <Edit className="h-3.5 w-3.5 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); deleteLead(lead.id); }}>
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {lead.contact_name && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-3 w-3 shrink-0" />
                          <span className="truncate">{lead.contact_name}</span>
                        </div>
                      )}
                      {lead.email && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{lead.email}</span>
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <PhoneCall className="h-3 w-3 shrink-0" />
                          <span>{lead.phone}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                        <span className="text-muted-foreground">→ {formatCurrency(lead.value_ps)}</span>
                        <span className="text-muted-foreground">↺ {formatCurrency(lead.value_mrr)}</span>
                      </div>

                      {lead.lead_status === "won" && (
                        <div className="pt-1">
                          <Badge variant="outline" className="text-[9px] bg-green-500/10 text-green-700 border-green-300">
                            ✅ Ganho
                          </Badge>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground/70">
                        <span>📅 {new Date(lead.created_at).toLocaleDateString("pt-BR")}</span>
                        <span>🕐 {new Date(lead.updated_at).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <CrmLeadDialog
        lead={selectedLead}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        onDelete={deleteLead}
        isNew={isNew}
      />
      <FormLinkDialog open={formLinkOpen} onOpenChange={setFormLinkOpen} />
    </>
  );
}
