import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { formatDistanceToNowStrict, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Search, Filter, RefreshCw, Download, Columns3, Eye, ExternalLink,
  MessageSquare, Bot, Users, TestTube2, Loader2, X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

type OriginPill = "atendimento" | "api" | "chat_interno" | "testes";

const ORIGIN_PILLS: { id: OriginPill; label: string; icon: any }[] = [
  { id: "atendimento", label: "Atendimento", icon: MessageSquare },
  { id: "api", label: "API/Agendamento", icon: Bot },
  { id: "chat_interno", label: "Chat Interno", icon: Users },
  { id: "testes", label: "Testes", icon: TestTube2 },
];

interface ChatRow {
  id: string;
  contact_name: string | null;
  contact_phone: string | null;
  status: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
  assigned_user_id: string | null;
  instance_id: string | null;
  metadata: any;
}

function statusBadgeStyle(status: string | null | undefined) {
  const s = (status || "").toLowerCase();
  if (s.includes("finaliz") || s === "closed" || s === "resolved")
    return "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
  if (s.includes("atend") || s === "assigned" || s === "in_progress")
    return "bg-primary/15 text-primary border-primary/30";
  if (s.includes("aguard") || s === "waiting" || s === "pending")
    return "bg-orange-500/15 text-orange-500 border-orange-500/30";
  if (s.includes("espera") || s === "on_hold")
    return "bg-amber-500/15 text-amber-500 border-amber-500/30";
  if (s.includes("fluxo") || s === "bot")
    return "bg-sky-500/15 text-sky-500 border-sky-500/30";
  return "bg-muted text-muted-foreground border-border";
}

function statusLabel(status: string | null | undefined) {
  const s = (status || "").toLowerCase();
  if (s.includes("finaliz") || s === "closed" || s === "resolved") return "Finalizado";
  if (s.includes("atend") || s === "assigned" || s === "in_progress") return "Em atendimento";
  if (s.includes("aguard") || s === "waiting" || s === "pending") return "Aguardando";
  if (s.includes("espera") || s === "on_hold") return "Em espera";
  if (s.includes("fluxo") || s === "bot") return "Em fluxo";
  return status || "—";
}

export function HistoricoAtendimentosTab() {
  const tenantId = useActiveCompanyId();
  const [origin, setOrigin] = useState<OriginPill>("atendimento");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ChatRow[]>([]);
  const [preview, setPreview] = useState<ChatRow | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!tenantId) return;
    let alive = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("whatsapp_chats" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(pageSize);
      if (!alive) return;
      if (error) console.warn(error);
      setRows(((data || []) as unknown) as ChatRow[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [tenantId, pageSize, refreshTick]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((r) =>
      (r.contact_name || "").toLowerCase().includes(q) ||
      (r.contact_phone || "").toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const kpis = useMemo(() => {
    const bucket = (label: string) => filtered.filter((r) => statusLabel(r.status) === label).length;
    return {
      emAtendimento: bucket("Em atendimento"),
      aguardando: bucket("Aguardando"),
      emEspera: bucket("Em espera"),
      emFluxo: bucket("Em fluxo"),
    };
  }, [filtered]);

  const maxWait = useMemo(() => {
    const waiting = filtered.filter((r) => statusLabel(r.status) === "Aguardando");
    if (!waiting.length) return null;
    const oldest = waiting.reduce((acc, r) => {
      const t = new Date(r.created_at).getTime();
      return t < acc ? t : acc;
    }, Infinity);
    if (!Number.isFinite(oldest)) return null;
    return formatDistanceToNowStrict(oldest, { locale: ptBR });
  }, [filtered]);

  async function requestExport() {
    if (!tenantId) return;
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    const { error } = await supabase.from("analytics_export_jobs" as any).insert({
      tenant_id: tenantId,
      requested_by: user.id,
      report_type: "historico_atendimentos",
      filters: { origin, search },
      status: "pending",
    });
    if (error) toast.error("Falha ao solicitar exportação");
    else toast.success("Exportação solicitada — veja em 'Download de Relatórios'");
  }

  return (
    <div className="space-y-4">
      {/* Origin pills + KPI badges */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {ORIGIN_PILLS.map((p) => {
            const Icon = p.icon;
            const active = origin === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setOrigin(p.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {p.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <KpiBadge label="Em atendimento" value={kpis.emAtendimento} color="text-primary" />
          <KpiBadge
            label="Aguardando"
            value={kpis.aguardando}
            color="text-orange-500"
            hint={maxWait ? `máx ${maxWait}` : undefined}
          />
          <KpiBadge label="Em espera" value={kpis.emEspera} color="text-amber-500" />
          <KpiBadge label="Em fluxo" value={kpis.emFluxo} color="text-sky-500" />
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar: protocolo, nome ou telefone"
            className="pl-9 h-9"
          />
        </div>
        <Select disabled>
          <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Atendentes" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos</SelectItem></SelectContent>
        </Select>
        <Select disabled>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Departamentos" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos</SelectItem></SelectContent>
        </Select>
        <Select disabled>
          <SelectTrigger className="h-9 w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos</SelectItem></SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-9" disabled>
          Selecionar período
        </Button>

        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="outline" size="icon" className="h-9 w-9" title="Filtros avançados" disabled>
            <Filter className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9" title="Exportar" onClick={requestExport}>
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            title="Atualizar"
            onClick={() => setRefreshTick((v) => v + 1)}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9" title="Colunas visíveis" disabled>
            <Columns3 className="h-4 w-4" />
          </Button>
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="h-9 w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>Mostrar {n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground uppercase">
              <tr>
                <th className="w-8 px-3 py-3"><input type="checkbox" /></th>
                <th className="text-left px-3 py-3">Criado / Finalizado</th>
                <th className="text-left px-3 py-3">Protocolo</th>
                <th className="text-left px-3 py-3">Conta</th>
                <th className="text-left px-3 py-3">Cliente</th>
                <th className="text-left px-3 py-3">Agente / Depto</th>
                <th className="text-left px-3 py-3">Última mensagem</th>
                <th className="text-left px-3 py-3">Status</th>
                <th className="text-left px-3 py-3">CSAT</th>
                <th className="text-left px-3 py-3">Tags</th>
                <th className="w-24 px-3 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="px-6 py-12 text-center text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Carregando...
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={11} className="px-6 py-12 text-center text-muted-foreground">
                  Nenhum atendimento encontrado
                </td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-3"><input type="checkbox" /></td>
                  <td className="px-3 py-3">
                    <div className="text-xs">{format(new Date(r.created_at), "dd/MM/yy HH:mm")}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {statusLabel(r.status) === "Finalizado" && r.updated_at
                        ? format(new Date(r.updated_at), "dd/MM/yy HH:mm")
                        : "—"}
                    </div>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">
                    <div>{r.id.slice(0, 8)}</div>
                    <Badge className={cn("mt-0.5 text-[9px] px-1.5 py-0 border", statusBadgeStyle(r.status))}>
                      {statusLabel(r.status) === "Finalizado" ? "Finalizado" : "Ativo"}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <MessageSquare className="h-3.5 w-3.5 inline mr-1 text-emerald-500" />
                    WhatsApp
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <div className="font-medium">{r.contact_name || r.contact_phone || "—"}</div>
                    <div className="text-[10px] text-muted-foreground">Contato</div>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">—</td>
                  <td className="px-3 py-3 text-xs max-w-[240px]">
                    <div className="truncate text-muted-foreground">{r.last_message_preview || "—"}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {r.last_message_at ? formatDistanceToNowStrict(new Date(r.last_message_at), { locale: ptBR, addSuffix: true }) : ""}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Badge className={cn("text-[10px] px-2 py-0.5 border", statusBadgeStyle(r.status))}>
                      {statusLabel(r.status)}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">—</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">—</td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreview(r)} title="Pré-visualizar">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Abrir atendimento completo"
                        onClick={() => window.open(`/accord-stack?chat=${r.id}`, "_blank")}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview modal */}
      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold">
                {(preview?.contact_name || preview?.contact_phone || "?").slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="font-semibold text-sm">{preview?.contact_name || preview?.contact_phone}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Badge className="text-[9px] px-1.5 py-0 bg-muted text-muted-foreground border-border">
                    Pré-visualização
                  </Badge>
                  <span className="font-mono">#{preview?.id.slice(0, 8)}</span>
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="text-xs text-muted-foreground">
            Canal: WhatsApp · Última atividade:{" "}
            {preview?.last_message_at ? formatDistanceToNowStrict(new Date(preview.last_message_at), { locale: ptBR, addSuffix: true }) : "—"}
          </div>
          <div className="rounded-xl bg-muted/40 p-3">
            <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-card border border-border p-3 text-sm">
              {preview?.last_message_preview || <span className="text-muted-foreground italic">Sem prévia disponível</span>}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Pré-visualização — não marca como lida e não abre a conversa.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiBadge({ label, value, color, hint }: { label: string; value: number; color: string; hint?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className={cn("text-sm font-semibold", color)}>{value}</span>
      {hint && <span className="text-[10px] text-muted-foreground">· {hint}</span>}
    </div>
  );
}
