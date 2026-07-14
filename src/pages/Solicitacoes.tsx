import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { NewRequestDialog } from "@/components/solicitacoes/NewRequestDialog";
import { CrmLeadDetailView } from "@/components/atendimento/CrmLeadDetailView";
import type { CrmLead } from "@/hooks/useCrmLeads";
import { format, differenceInCalendarDays, parseISO } from "date-fns";

interface RequestRow extends CrmLead {
  is_request: boolean;
  request_title: string | null;
  request_notes: string | null;
}

interface WorkspaceLite {
  id: string;
  name: string;
}
interface ColumnLite {
  id: string;
  name: string;
  workspace_id: string;
  position: number;
  color?: string;
}

const PAGE_SIZE = 50;

export default function Solicitacoes() {
  const { profile } = useAuth();
  const companyId = useActiveCompanyId();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceLite[]>([]);
  const [columns, setColumns] = useState<ColumnLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [wsFilter, setWsFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [openNew, setOpenNew] = useState(false);
  const [detail, setDetail] = useState<RequestRow | null>(null);
  const [assignees, setAssignees] = useState<Record<string, string>>({});

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data: rq, error } = await supabase
      .from("crm_leads")
      .select("*")
      .eq("is_request", true)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar solicitações");
      setLoading(false);
      return;
    }
    setRows((rq || []) as RequestRow[]);

    if (companyId) {
      const { data: ws } = await supabase
        .from("workspaces")
        .select("id,name")
        .eq("servidor_id", companyId)
        .order("name");
      setWorkspaces((ws || []) as WorkspaceLite[]);

      const wsIds = (ws || []).map((w: any) => w.id);
      if (wsIds.length > 0) {
        const { data: cols } = await supabase
          .from("kanban_columns")
          .select("id,name,workspace_id,position,color")
          .in("workspace_id", wsIds)
          .order("position");
        setColumns((cols || []) as ColumnLite[]);
      }
    }

    // Resolve creators' names
    const creatorIds = Array.from(new Set((rq || []).map((r: any) => r.created_by_user_id).filter(Boolean)));
    if (creatorIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id,name")
        .in("user_id", creatorIds);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { map[p.user_id] = p.name; });
      setAssignees(map);
    }

    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const wsById = useMemo(() => {
    const m: Record<string, WorkspaceLite> = {};
    workspaces.forEach((w) => { m[w.id] = w; });
    return m;
  }, [workspaces]);

  const colsByWs = useMemo(() => {
    const m: Record<string, ColumnLite[]> = {};
    columns.forEach((c) => {
      (m[c.workspace_id] ||= []).push(c);
    });
    return m;
  }, [columns]);

  const colById = useMemo(() => {
    const m: Record<string, ColumnLite> = {};
    columns.forEach((c) => { m[c.id] = c; });
    return m;
  }, [columns]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !(r.request_title || "").toLowerCase().includes(q) && !(r.company_name || "").toLowerCase().includes(q)) return false;
      if (wsFilter !== "all" && r.workspace_id !== wsFilter) return false;
      if (statusFilter !== "all") {
        const col = colById[r.stage];
        const wsCols = r.workspace_id ? colsByWs[r.workspace_id] : undefined;
        const isFinal = wsCols && col && wsCols[wsCols.length - 1]?.id === col.id;
        if (statusFilter === "concluida" && !isFinal) return false;
        if (statusFilter === "aberta" && isFinal) return false;
      }
      return true;
    });
  }, [rows, search, wsFilter, statusFilter, colById, colsByWs]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const daysBadge = (d: string | null) => {
    if (!d) return null;
    const diff = differenceInCalendarDays(parseISO(d), new Date());
    if (diff < 0) return <Badge variant="destructive">{Math.abs(diff)}d atraso</Badge>;
    if (diff === 0) return <Badge className="bg-amber-500 hover:bg-amber-500 text-white">Hoje</Badge>;
    return <Badge variant="outline">{diff}d</Badge>;
  };

  const statusBadge = (r: RequestRow) => {
    const col = colById[r.stage];
    const wsCols = r.workspace_id ? colsByWs[r.workspace_id] : undefined;
    const isFinal = wsCols && col && wsCols[wsCols.length - 1]?.id === col.id;
    if (!col) return <Badge variant="secondary">{r.stage}</Badge>;
    if (isFinal) return <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white">{col.name}</Badge>;
    return (
      <Badge variant="outline" style={col.color ? { borderColor: col.color, color: col.color } : undefined}>
        {col.name}
      </Badge>
    );
  };

  // Handlers for detail view
  const updateLead = async (id: string, updates: Partial<CrmLead>) => {
    const { error } = await supabase.from("crm_leads").update(updates as any).eq("id", id);
    if (error) { toast.error("Erro ao atualizar"); return false; }
    setRows((prev) => prev.map((l) => (l.id === id ? { ...l, ...(updates as any) } : l)));
    if (detail?.id === id) setDetail((d) => (d ? { ...d, ...(updates as any) } : d));
    return true;
  };

  const moveToStage = async (id: string, stage: string) => {
    return updateLead(id, { stage, stage_entered_at: new Date().toISOString() } as any);
  };

  const deleteLead = async (id: string) => {
    const { error } = await supabase.from("crm_leads").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return false; }
    setRows((prev) => prev.filter((l) => l.id !== id));
    return true;
  };

  if (detail) {
    const wsCols = detail.workspace_id ? colsByWs[detail.workspace_id] : [];
    const dynamicStages = wsCols?.map((c) => ({
      id: c.id,
      title: c.name,
      daysLimit: "",
      color: `bg-[${c.color || "#64748b"}]`,
      rawColor: c.color,
    }));
    return (
      <div className="flex flex-col flex-1 min-h-0 w-full overflow-hidden h-[calc(100vh-56px)]">
        <CrmLeadDetailView
          lead={detail as any}
          onBack={() => { setDetail(null); fetchAll(); }}
          onUpdate={updateLead as any}
          onMoveStage={moveToStage as any}
          onDelete={async (id: string) => { await deleteLead(id); setDetail(null); return true; }}
          dynamicStages={dynamicStages as any}
          stagesLoading={false}
        />
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Minhas Solicitações"
        description="Abra e acompanhe chamados internos entre departamentos"
        icon={Send}
        actions={
          <Button onClick={() => setOpenNew(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Solicitação
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou empresa..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={wsFilter} onValueChange={(v) => { setWsFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Workspace" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os workspaces</SelectItem>
            {workspaces.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="aberta">Aberta</SelectItem>
            <SelectItem value="concluida">Concluída</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="text-sm text-muted-foreground mb-2">{filtered.length} solicitações</div>

      <div className="rounded-lg border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Workspace</th>
                <th className="text-left px-3 py-2">Título</th>
                <th className="text-left px-3 py-2">Responsável</th>
                <th className="text-left px-3 py-2">Etapa</th>
                <th className="text-left px-3 py-2">Entrega</th>
                <th className="text-left px-3 py-2">Dias</th>
                <th className="text-left px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma solicitação encontrada</td></tr>
              ) : paged.map((r) => {
                const ws = r.workspace_id ? wsById[r.workspace_id] : null;
                const col = colById[r.stage];
                return (
                  <tr key={r.id} className="border-t hover:bg-muted/40 cursor-pointer" onClick={() => setDetail(r)}>
                    <td className="px-3 py-2">
                      <div className="font-medium">{ws?.name || "—"}</div>
                      {col && <div className="text-xs text-muted-foreground">{col.name}</div>}
                    </td>
                    <td className="px-3 py-2 font-medium">{r.request_title || r.company_name}</td>
                    <td className="px-3 py-2">{r.created_by_user_id ? (assignees[r.created_by_user_id] || r.created_by_name || "—") : "—"}</td>
                    <td className="px-3 py-2">{col?.name || r.stage}</td>
                    <td className="px-3 py-2">{r.forecast_date ? format(parseISO(r.forecast_date), "dd/MM/yyyy") : "—"}</td>
                    <td className="px-3 py-2">{daysBadge(r.forecast_date)}</td>
                    <td className="px-3 py-2">{statusBadge(r)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/30">
            <div className="text-xs text-muted-foreground">Página {page} de {totalPages}</div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <NewRequestDialog
        open={openNew}
        onOpenChange={setOpenNew}
        workspaces={workspaces}
        columnsByWs={colsByWs}
        onCreated={fetchAll}
      />
    </PageContainer>
  );
}
