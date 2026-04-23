import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspacePermissions } from "@/hooks/useWorkspacePermissions";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Loader2, KanbanSquare, Search, Check, ExternalLink, AlertTriangle,
  ArrowLeft, Sparkles,
} from "lucide-react";
import { InboxContact } from "@/hooks/useWhatsAppInbox";
import { cn } from "@/lib/utils";

interface CreateDemandModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: InboxContact;
  companyId: string;
  lastMessages: string;
}

interface WorkspaceOption {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  type: string | null;
  group_id: string | null;
  is_default: boolean;
  columns_count?: number;
}

interface GroupOption {
  id: string;
  name: string;
  color: string | null;
}

interface ColumnOption {
  id: string;
  name: string;
  position: number;
  color: string | null;
}

interface ExistingCard {
  id: string;
  company_name: string;
  stage: string;
  workspace_id: string;
}

type Step = "workspace" | "column" | "confirm" | "duplicate";

export function CreateDemandModal({
  open, onOpenChange, contact, companyId, lastMessages,
}: CreateDemandModalProps) {
  const { user, profile } = useAuth();
  const { filterAllowedWorkspaces, isCeoOrMaster } = useWorkspacePermissions();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("workspace");
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [columns, setColumns] = useState<ColumnOption[]>([]);
  const [search, setSearch] = useState("");

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [selectedColumnId, setSelectedColumnId] = useState("");
  const [leadName, setLeadName] = useState(contact.name);
  const [notes, setNotes] = useState("");

  const [loadingWs, setLoadingWs] = useState(true);
  const [loadingCols, setLoadingCols] = useState(false);
  const [creating, setCreating] = useState(false);

  const [existingCard, setExistingCard] = useState<ExistingCard | null>(null);

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setStep("workspace");
    setSearch("");
    setSelectedWorkspaceId("");
    setSelectedColumnId("");
    setLeadName(contact.name || contact.phone);
    setNotes("");
    setExistingCard(null);
  }, [open, contact.name, contact.phone]);

  // Fetch workspaces + groups + counts
  useEffect(() => {
    if (!open || !companyId) return;
    setLoadingWs(true);

    (async () => {
      const [wsRes, grpRes] = await Promise.all([
        supabase
          .from("workspaces")
          .select("id, name, color, icon, type, group_id, is_default")
          .eq("servidor_id", companyId)
          .order("is_default", { ascending: false })
          .order("name"),
        supabase
          .from("workspace_groups")
          .select("id, name, color")
          .eq("servidor_id", companyId)
          .order("position"),
      ]);

      const allWs = (wsRes.data || []) as WorkspaceOption[];
      const allowed = filterAllowedWorkspaces(allWs);

      // Fetch column counts in parallel
      const counts = await Promise.all(
        allowed.map((w) =>
          supabase
            .from("kanban_columns")
            .select("id", { count: "exact", head: true })
            .eq("workspace_id", w.id)
            .then((r) => ({ id: w.id, count: r.count || 0 }))
        )
      );
      const countMap = new Map(counts.map((c) => [c.id, c.count]));
      const enriched = allowed.map((w) => ({ ...w, columns_count: countMap.get(w.id) || 0 }));

      setWorkspaces(enriched);
      setGroups((grpRes.data || []) as GroupOption[]);
      setLoadingWs(false);
    })();
  }, [open, companyId, filterAllowedWorkspaces]);

  // Fetch columns when workspace selected
  useEffect(() => {
    if (!selectedWorkspaceId) {
      setColumns([]);
      return;
    }
    setLoadingCols(true);
    supabase
      .from("kanban_columns")
      .select("id, name, position, color")
      .eq("workspace_id", selectedWorkspaceId)
      .order("position")
      .then(({ data }) => {
        const cols = (data || []) as ColumnOption[];
        setColumns(cols);
        if (cols.length > 0) setSelectedColumnId(cols[0].id);
        setLoadingCols(false);
      });
  }, [selectedWorkspaceId]);

  const filteredWorkspaces = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces.filter((w) => w.name.toLowerCase().includes(q));
  }, [workspaces, search]);

  // Group workspaces by camada
  const grouped = useMemo(() => {
    const map = new Map<string | null, WorkspaceOption[]>();
    filteredWorkspaces.forEach((w) => {
      const k = w.group_id || null;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(w);
    });
    const sections: { group: GroupOption | null; items: WorkspaceOption[] }[] = [];
    groups.forEach((g) => {
      const items = map.get(g.id);
      if (items && items.length > 0) sections.push({ group: g, items });
    });
    const ungrouped = map.get(null);
    if (ungrouped && ungrouped.length > 0) {
      sections.push({ group: null, items: ungrouped });
    }
    return sections;
  }, [filteredWorkspaces, groups]);

  const handleSelectWorkspace = async (wsId: string) => {
    setSelectedWorkspaceId(wsId);

    // Check for existing active card with same phone in this workspace
    const { data: existing } = await supabase
      .from("crm_leads")
      .select("id, company_name, stage, workspace_id")
      .eq("servidor_id", companyId)
      .eq("workspace_id", wsId)
      .eq("phone", contact.phone)
      .not("lead_status", "in", "(perdido,cancelado)")
      .order("created_at", { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
      setExistingCard(existing[0] as ExistingCard);
      setStep("duplicate");
    } else {
      setStep("column");
    }
  };

  const openCardInCrm = (leadId: string, workspaceId: string) => {
    onOpenChange(false);
    navigate(`/atendimento?workspace=${workspaceId}&lead=${leadId}`);
  };

  const handleCreate = async () => {
    if (!selectedWorkspaceId) {
      toast.error("Selecione um workspace");
      return;
    }
    setCreating(true);
    try {
      const insertData: Record<string, unknown> = {
        servidor_id: companyId,
        company_name: leadName || contact.name || contact.phone,
        contact_name: contact.name,
        phone: contact.phone,
        source: "whatsapp",
        workspace_id: selectedWorkspaceId,
        notes: notes || `Demanda criada via Accord Stack.\n\nÚltimas mensagens:\n${lastMessages}`.slice(0, 2000),
        created_by_user_id: user?.id,
        created_by_name: profile?.name,
        tags: ["WhatsApp", "Accord Stack"],
      };
      if (selectedColumnId) insertData.stage = selectedColumnId;

      const { data: lead, error } = await supabase
        .from("crm_leads")
        .insert(insertData as any)
        .select("id, workspace_id")
        .single();

      if (error) throw error;

      // Link contact to lead
      await supabase
        .from("whatsapp_contacts")
        .update({ lead_id: lead.id, workspace_id: selectedWorkspaceId })
        .eq("id", contact.id);

      const wsName = workspaces.find((w) => w.id === selectedWorkspaceId)?.name || "Workspace";
      const colName = columns.find((c) => c.id === selectedColumnId)?.name || "Primeira coluna";

      toast.success(`Card criado em ${wsName} › ${colName}`, {
        action: {
          label: "Abrir card",
          onClick: () => openCardInCrm(lead.id, selectedWorkspaceId),
        },
      });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar demanda");
    } finally {
      setCreating(false);
    }
  };

  const initials = (contact.name || contact.phone)
    .split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const selectedWs = workspaces.find((w) => w.id === selectedWorkspaceId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <KanbanSquare className="h-4 w-4 text-primary" />
            </div>
            Criar demanda no Kanban
          </DialogTitle>
          <DialogDescription className="text-xs">
            Selecione o workspace e a coluna para criar o card a partir desta conversa.
          </DialogDescription>
        </DialogHeader>

        {/* Contact card (always visible) */}
        <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center gap-3">
          <Avatar className="h-10 w-10">
            {contact.avatar_url && <AvatarImage src={contact.avatar_url} />}
            <AvatarFallback className="bg-emerald-500 text-white text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{contact.name}</p>
            <p className="text-xs text-muted-foreground truncate">{contact.phone}</p>
          </div>
          <Badge variant="outline" className="text-[10px] gap-1">
            <Sparkles className="h-2.5 w-2.5" />
            WhatsApp
          </Badge>
        </div>

        {/* STEP: workspace */}
        {step === "workspace" && (
          <div className="flex flex-col">
            <div className="px-5 pt-4 pb-2">
              <div className="flex items-center gap-2 bg-muted/60 border border-border/50 rounded-lg px-3 py-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  className="bg-transparent outline-none text-sm w-full placeholder:text-muted-foreground"
                  placeholder="Buscar workspace..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <ScrollArea className="max-h-[380px] px-5">
              {loadingWs ? (
                <div className="flex items-center justify-center py-10 text-xs text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando workspaces...
                </div>
              ) : filteredWorkspaces.length === 0 ? (
                <div className="text-center py-10 text-xs text-muted-foreground">
                  {workspaces.length === 0
                    ? "Você não tem acesso a nenhum workspace."
                    : "Nenhum workspace encontrado."}
                </div>
              ) : (
                <div className="space-y-4 pb-3">
                  {grouped.map((section) => (
                    <div key={section.group?.id || "ungrouped"}>
                      <div className="flex items-center gap-2 mb-1.5 px-1">
                        <div
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: section.group?.color || "hsl(var(--muted-foreground))" }}
                        />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {section.group?.name || "Outros"}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {section.items.map((ws) => (
                          <button
                            key={ws.id}
                            onClick={() => handleSelectWorkspace(ws.id)}
                            className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                          >
                            <div
                              className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-white text-xs font-semibold"
                              style={{ backgroundColor: ws.color || "hsl(var(--primary))" }}
                            >
                              {ws.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground truncate">{ws.name}</span>
                                {ws.is_default && (
                                  <Badge variant="secondary" className="text-[9px] h-4 px-1.5">Padrão</Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                {ws.columns_count} {ws.columns_count === 1 ? "coluna" : "colunas"}
                                {ws.type ? ` · ${ws.type}` : ""}
                              </p>
                            </div>
                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="px-5 py-3 border-t border-border flex justify-end">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs">
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* STEP: duplicate found */}
        {step === "duplicate" && existingCard && (
          <div className="p-5 space-y-4">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 flex gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Card já existente</p>
                <p className="text-xs text-muted-foreground">
                  Já existe um card ativo deste contato em <strong>{selectedWs?.name}</strong>.
                  Você pode abrir o existente ou criar um novo mesmo assim.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border p-3 bg-muted/30">
              <p className="text-sm font-medium text-foreground">{existingCard.company_name}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Workspace: {selectedWs?.name}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline" size="sm"
                onClick={() => { setExistingCard(null); setStep("workspace"); }}
                className="h-8 text-xs"
              >
                <ArrowLeft className="h-3 w-3 mr-1" /> Voltar
              </Button>
              <Button
                variant="outline" size="sm"
                onClick={() => setStep("column")}
                className="h-8 text-xs"
              >
                Criar novo mesmo assim
              </Button>
              <Button
                size="sm"
                onClick={() => openCardInCrm(existingCard.id, existingCard.workspace_id)}
                className="h-8 text-xs gap-1.5"
              >
                <ExternalLink className="h-3 w-3" /> Abrir card existente
              </Button>
            </div>
          </div>
        )}

        {/* STEP: column + confirm */}
        {step === "column" && (
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep("workspace")}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3 w-3" /> Trocar workspace
              </button>
              {selectedWs && (
                <div className="flex items-center gap-1.5 text-xs">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: selectedWs.color || "hsl(var(--primary))" }}
                  />
                  <span className="font-medium text-foreground">{selectedWs.name}</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Nome do card</Label>
              <Input
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                className="h-9 text-sm"
                placeholder="Nome do lead/demanda"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Coluna inicial</Label>
              {loadingCols ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando colunas...
                </div>
              ) : columns.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Este workspace não tem colunas configuradas.</p>
              ) : (
                <ScrollArea className="max-h-[160px]">
                  <div className="grid grid-cols-2 gap-1.5 pr-2">
                    {columns.map((col) => (
                      <button
                        key={col.id}
                        onClick={() => setSelectedColumnId(col.id)}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg border text-left transition-all",
                          selectedColumnId === col.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        )}
                      >
                        <div
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: col.color || "hsl(var(--muted-foreground))" }}
                        />
                        <span className="text-xs font-medium text-foreground truncate flex-1">{col.name}</span>
                        {selectedColumnId === col.id && <Check className="h-3 w-3 text-primary shrink-0" />}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Observação (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-sm min-h-[60px] resize-none"
                placeholder="Notas internas sobre esta demanda..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-9 text-xs">
                Cancelar
              </Button>
              <Button
                size="sm" onClick={handleCreate}
                disabled={creating || !selectedWorkspaceId}
                className="h-9 text-xs gap-1.5"
              >
                {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Criar card
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
