import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertTriangle, RotateCcw, Layers, User, Columns3 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface RescueLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: any;
  onRescued: () => void;
}

interface WorkspaceOption {
  id: string;
  name: string;
}

interface ColumnOption {
  id: string;
  name: string;
  position: number;
}

interface UserOption {
  user_id: string;
  name: string;
  email: string;
}

export function RescueLeadDialog({ open, onOpenChange, lead, onRescued }: RescueLeadDialogProps) {
  const { profile } = useAuth();
  const companyId = lead?.servidor_id;

  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [columns, setColumns] = useState<ColumnOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [selectedColumnId, setSelectedColumnId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [reason, setReason] = useState("");
  const [observation, setObservation] = useState("");

  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch workspaces on open
  useEffect(() => {
    if (!open || !companyId) return;
    setSelectedWorkspaceId("");
    setSelectedColumnId("");
    setSelectedUserId("");
    setReason("");
    setObservation("");
    setColumns([]);

    const fetchWorkspaces = async () => {
      setLoadingWorkspaces(true);
      const { data } = await supabase
        .from("workspaces")
        .select("id, name")
        .eq("servidor_id", companyId)
        .order("name");
      setWorkspaces((data as WorkspaceOption[]) || []);
      setLoadingWorkspaces(false);
    };

    const fetchUsers = async () => {
      setLoadingUsers(true);
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name");
      setUsers((data as UserOption[]) || []);
      setLoadingUsers(false);
    };

    fetchWorkspaces();
    fetchUsers();
  }, [open, companyId]);

  // Fetch columns when workspace changes
  useEffect(() => {
    setSelectedColumnId("");
    if (!selectedWorkspaceId) {
      setColumns([]);
      return;
    }
    const fetchCols = async () => {
      setLoadingColumns(true);
      const { data } = await supabase
        .from("kanban_columns")
        .select("id, name, position")
        .eq("workspace_id", selectedWorkspaceId)
        .order("position", { ascending: true });
      setColumns((data as ColumnOption[]) || []);
      setLoadingColumns(false);
    };
    fetchCols();
  }, [selectedWorkspaceId]);

  const noColumns = selectedWorkspaceId && !loadingColumns && columns.length === 0;
  const canConfirm = selectedWorkspaceId && selectedColumnId && selectedUserId && !noColumns;

  const handleRescue = async () => {
    if (!canConfirm) return;
    setSaving(true);

    try {
      const selectedUser = users.find(u => u.user_id === selectedUserId);
      const selectedCol = columns.find(c => c.id === selectedColumnId);
      const selectedWs = workspaces.find(w => w.id === selectedWorkspaceId);

      const { error: updateError } = await supabase
        .from("crm_leads")
        .update({
          lead_status: "open",
          stage: selectedColumnId,
          stage_entered_at: new Date().toISOString(),
          workspace_id: selectedWorkspaceId,
          lost_reason: null,
          created_by_user_id: selectedUserId,
          created_by_name: selectedUser?.name || "",
          updated_at: new Date().toISOString(),
        })
        .eq("id", lead.id);

      if (updateError) throw updateError;

      // Card history
      await supabase.from("card_history").insert({
        lead_id: lead.id,
        workspace_id: selectedWorkspaceId,
        to_column_id: selectedColumnId,
        from_column_id: null,
        moved_by_user_id: profile?.user_id || null,
        moved_by_name: profile?.name || null,
      });

      // Activity log
      const parts = [
        `Resgatado por ${profile?.name || "Admin"}`,
        `Workspace: ${selectedWs?.name}`,
        `Coluna: ${selectedCol?.name}`,
        `Responsável: ${selectedUser?.name}`,
        `Motivo anterior: ${lead.lost_reason || "N/A"}`,
      ];
      if (reason.trim()) parts.push(`Motivo do resgate: ${reason.trim()}`);
      if (observation.trim()) parts.push(`Observação: ${observation.trim()}`);

      await supabase.from("crm_lead_activities").insert({
        lead_id: lead.id,
        servidor_id: lead.servidor_id,
        title: "Lead resgatado do descarte",
        description: parts.join(" | "),
        type: "note",
        created_by_user_id: profile?.user_id || null,
        created_by_name: profile?.name || null,
        metadata: {
          event: "lead_rescued_from_discard",
          workspace_id: selectedWorkspaceId,
          workspace_name: selectedWs?.name,
          column_id: selectedColumnId,
          column_name: selectedCol?.name,
          assigned_user_id: selectedUserId,
          assigned_user_name: selectedUser?.name,
          previous_lost_reason: lead.lost_reason,
          rescue_reason: reason.trim() || null,
          rescue_observation: observation.trim() || null,
        } as any,
      });

      // Audit log
      await supabase.from("audit_logs").insert({
        user_id: profile?.user_id || "",
        user_name: profile?.name || null,
        servidor_id: lead.servidor_id,
        action: "lead_rescued_from_discard",
        target_type: "crm_lead",
        target_id: lead.id,
        details: {
          lead_name: lead.company_name,
          workspace: selectedWs?.name,
          column: selectedCol?.name,
          assigned_to: selectedUser?.name,
          previous_lost_reason: lead.lost_reason,
        } as any,
      });

      toast.success("Lead resgatado com sucesso!");
      onOpenChange(false);
      onRescued();
    } catch (err: any) {
      console.error("Error rescuing lead:", err);
      toast.error("Erro ao resgatar lead.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-primary" />
            Resgatar Lead do Descarte
          </DialogTitle>
          <DialogDescription className="text-xs">
            Selecione para qual workspace, responsável e coluna este lead deve retornar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Lead info */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
            <p className="text-sm font-medium text-foreground">{lead?.company_name}</p>
            {lead?.contact_name && <p className="text-xs text-muted-foreground">{lead.contact_name}</p>}
            {lead?.lost_reason && (
              <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30 mt-1">
                {lead.lost_reason}
              </Badge>
            )}
          </div>

          {/* Workspace */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Layers className="h-3 w-3 text-muted-foreground" /> Workspace de destino *
            </Label>
            {loadingWorkspaces ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Carregando...</div>
            ) : (
              <Select value={selectedWorkspaceId} onValueChange={setSelectedWorkspaceId}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione um workspace" /></SelectTrigger>
                <SelectContent>
                  {workspaces.map(w => (
                    <SelectItem key={w.id} value={w.id} className="text-xs">{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Column */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Columns3 className="h-3 w-3 text-muted-foreground" /> Coluna de destino *
            </Label>
            {!selectedWorkspaceId ? (
              <p className="text-xs text-muted-foreground">Selecione um workspace primeiro</p>
            ) : loadingColumns ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Carregando colunas...</div>
            ) : noColumns ? (
              <div className="flex items-center gap-2 text-xs text-amber-500">
                <AlertTriangle className="h-3.5 w-3.5" /> Este workspace não possui colunas configuradas.
              </div>
            ) : (
              <Select value={selectedColumnId} onValueChange={setSelectedColumnId}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione a coluna" /></SelectTrigger>
                <SelectContent>
                  {columns.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* User */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <User className="h-3 w-3 text-muted-foreground" /> Usuário responsável *
            </Label>
            {loadingUsers ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Carregando...</div>
            ) : (
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione o responsável" /></SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.user_id} value={u.user_id} className="text-xs">{u.name} ({u.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label className="text-xs">Motivo do resgate</Label>
            <Input
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Ex: cliente retomou interesse"
              className="h-9 text-xs"
            />
          </div>

          {/* Observation */}
          <div className="space-y-1.5">
            <Label className="text-xs">Observação</Label>
            <Textarea
              value={observation}
              onChange={e => setObservation(e.target.value)}
              placeholder="Informações adicionais..."
              className="text-xs min-h-[60px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleRescue} disabled={saving || !canConfirm}>
            {saving && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
            Resgatar Lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
