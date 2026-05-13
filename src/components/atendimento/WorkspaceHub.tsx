import { useState, useEffect, useCallback, useMemo, useRef } from "react";

import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { supabase } from "@/integrations/supabase/client";
import {
  TrendingUp, ClipboardList, Plus, Settings, Trash2,
  Search, ChevronLeft, BarChart3, HeadphonesIcon,
  DollarSign, Users, Cog, LayoutGrid, Sparkles, FolderOpen,
  Megaphone, UserCheck, Calculator, CreditCard, Receipt, Monitor, Rocket, Phone, Briefcase,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const TYPE_ICONS: Record<string, any> = {
  vendas: TrendingUp,
  crm: Users,
  onboarding: Rocket,
  pre_venda_sdr: Phone,
  comercial: Briefcase,
  pos_venda: UserCheck,
  marketing: Megaphone,
  administrativo: Settings,
  financeiro: DollarSign,
  departamento_pessoal: Users,
  rh: Users,
  contas_pagar: CreditCard,
  contas_receber: Receipt,
  cobranca: Calculator,
  analista: Search,
  ti: Monitor,
  suporte: HeadphonesIcon,
  operacional: Cog,
  task: LayoutGrid,
  tarefas: ClipboardList,
  custom: Sparkles,
};

const TYPE_LABELS: Record<string, string> = {
  vendas: "Vendas",
  crm: "CRM",
  onboarding: "Onboarding",
  pre_venda_sdr: "Pré-venda (SDR)",
  comercial: "Comercial",
  pos_venda: "Pós-venda",
  marketing: "Marketing",
  administrativo: "Administrativo",
  financeiro: "Financeiro",
  departamento_pessoal: "Departamento Pessoal",
  rh: "RH",
  contas_pagar: "Contas a Pagar",
  contas_receber: "Contas a Receber",
  cobranca: "Cobrança",
  analista: "Analista",
  ti: "TI",
  suporte: "Suporte",
  operacional: "Operacional",
  task: "Task",
  tarefas: "Tarefas",
  custom: "Personalizado",
};

const CARD_LABEL_BY_TYPE: Record<string, string> = {
  vendas: "oportunidades",
  comercial: "oportunidades",
  crm: "oportunidades",
  pre_venda_sdr: "oportunidades",
  tarefas: "tarefas",
  task: "tarefas",
  cobranca: "casos",
  onboarding: "clientes",
  pos_venda: "clientes",
  suporte: "chamados",
};

interface WorkspaceGroup {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string;
  position: number;
}

interface WorkspaceCardCount {
  total: number;
}

interface WorkspaceHubProps {
  onSelectWorkspace: (id: string) => void;
}

export function WorkspaceHub({ onSelectWorkspace }: WorkspaceHubProps) {
  const { workspaces, isAdminOrCeo } = useWorkspaceContext();
  const navigate = useNavigate();
  const companyId = useActiveCompanyId();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animId: number;

    const lerp = (a: number[], b: number[], t: number) =>
      a.map((v, i) => Math.round(v + (b[i] - v) * t));

    const getColors = () => {
      const isDark = document.documentElement.classList.contains('dark');
      return {
        blue:       isDark ? [37, 99, 235]  : [59, 130, 246],
        purple:     [122, 63, 242] as number[],
        dotAlpha:   isDark ? 0.07 : 0.14,
        lineAlpha:  isDark ? 0.13 : 0.20,
        ptAlphaMin: isDark ? 0.15 : 0.22,
        ptAlphaMax: isDark ? 0.45 : 0.55,
      };
    };

    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      const { width, height } = p.getBoundingClientRect();
      canvas.width  = width  * devicePixelRatio;
      canvas.height = height * devicePixelRatio;
      canvas.style.width  = width  + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };

    const c = getColors();
    const pts = Array.from({ length: 70 }, () => {
      const p = canvas.parentElement;
      const W = p?.offsetWidth  || 1000;
      const H = p?.offsetHeight || 700;
      const t = Math.random();
      return {
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - .5) * .25,
        vy: (Math.random() - .5) * .25,
        r: Math.random() * 1.8 + .8,
        t,
        a: c.ptAlphaMin + Math.random() * (c.ptAlphaMax - c.ptAlphaMin),
      };
    });

    const draw = () => {
      const p = canvas.parentElement;
      if (!p) return;
      const W = p.offsetWidth, H = p.offsetHeight;
      const { blue, purple, dotAlpha, lineAlpha } = getColors();
      ctx.clearRect(0, 0, W, H);

      ctx.fillStyle = `rgba(122,63,242,${dotAlpha})`;
      for (let x = 18; x < W; x += 36)
        for (let y = 18; y < H; y += 36) {
          ctx.beginPath(); ctx.arc(x, y, .85, 0, Math.PI * 2); ctx.fill();
        }

      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 130) {
            const col = lerp(lerp(blue, purple, a.t), lerp(blue, purple, b.t), .5);
            ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${(1 - d / 130) * lineAlpha})`;
            ctx.lineWidth = .6;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }

      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        const col = lerp(blue, purple, p.t);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${p.a})`; ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    resize(); draw();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    return () => { cancelAnimationFrame(animId); ro.disconnect(); };
  }, []);

  const [groups, setGroups] = useState<WorkspaceGroup[]>([]);
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [cardCounts, setCardCounts] = useState<Record<string, WorkspaceCardCount>>({});

  // Fetch groups
  const fetchGroups = useCallback(async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from("workspace_groups")
      .select("*")
      .eq("servidor_id", companyId)
      .eq("active", true)
      .order("position");
    setGroups((data || []) as WorkspaceGroup[]);
  }, [companyId]);

  // Fetch card counts per workspace (single aggregated query)
  const fetchCardCounts = useCallback(async () => {
    if (!companyId || workspaces.length === 0) return;
    const wsIds = workspaces.map((w) => w.id);
    const { data, error } = await supabase
      .from("crm_leads")
      .select("workspace_id")
      .eq("servidor_id", companyId)
      .in("workspace_id", wsIds)
      .neq("lead_status", "lost");

    if (error) {
      console.error("Error fetching card counts:", error);
      return;
    }

    const counts: Record<string, WorkspaceCardCount> = {};
    (data || []).forEach((row: any) => {
      if (!row.workspace_id) return;
      if (!counts[row.workspace_id]) counts[row.workspace_id] = { total: 0 };
      counts[row.workspace_id].total++;
    });
    setCardCounts(counts);
  }, [companyId, workspaces]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);
  useEffect(() => { fetchCardCounts(); }, [fetchCardCounts]);

  const filtered = workspaces.filter((ws) => {
    if (search && !ws.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterGroup !== "all" && (ws as any).group_id !== filterGroup) return false;
    return true;
  });

  // Group workspaces by group_id
  const groupedByGroup: Record<string, typeof workspaces> = {};
  const ungrouped: typeof workspaces = [];

  filtered.forEach((ws) => {
    const gid = (ws as any).group_id;
    if (gid) {
      if (!groupedByGroup[gid]) groupedByGroup[gid] = [];
      groupedByGroup[gid].push(ws);
    } else {
      ungrouped.push(ws);
    }
  });

  // Order groups by position, filter by selected group
  const orderedGroups = groups.filter((g) => {
    if (filterGroup !== "all" && g.id !== filterGroup) return false;
    return (groupedByGroup[g.id]?.length ?? 0) > 0;
  });

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      {/* Animated particle canvas background */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
        }}
      />
      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-border/50">
        <div>
          <h1 className="text-lg font-bold text-foreground">Workspaces</h1>
          <p className="text-xs text-muted-foreground">Selecione um kanban para gerenciar</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="relative z-10 flex items-center gap-3 px-4 sm:px-6 py-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            placeholder="Buscar kanban..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted/40 border-border/40 rounded-xl h-10"
          />
        </div>
        <Select value={filterGroup} onValueChange={setFilterGroup}>
          <SelectTrigger className="w-36 h-10 rounded-xl border-border/40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Workspace Cards grouped by workspace_groups */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-6 pb-6">
        <TooltipProvider delayDuration={300}>
          {orderedGroups.map((group) => {
            const wsList = groupedByGroup[group.id] || [];
            if (wsList.length === 0) return null;
            const Icon = TYPE_ICONS[group.type] || TrendingUp;
            return (
              <div key={group.id} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="h-4 w-4" style={{ color: group.color }} />
                  <h2 className="text-sm font-bold text-foreground">{group.name}</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {wsList.map((ws) => (
                    <WorkspaceCard
                      key={ws.id}
                      workspace={ws}
                      cardCount={cardCounts[ws.id]?.total ?? 0}
                      onClick={() => onSelectWorkspace(ws.id)}
                      onEdit={isAdminOrCeo ? () => {} : undefined}
                      onDelete={isAdminOrCeo && !ws.is_default ? () => {} : undefined}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Ungrouped */}
          {filterGroup === "all" && ungrouped.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-bold text-foreground">Sem Camada</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {ungrouped.map((ws) => (
                  <WorkspaceCard
                    key={ws.id}
                    workspace={ws}
                    cardCount={cardCounts[ws.id]?.total ?? 0}
                    onClick={() => onSelectWorkspace(ws.id)}
                    onEdit={isAdminOrCeo ? () => {} : undefined}
                    onDelete={isAdminOrCeo && !ws.is_default ? () => {} : undefined}
                  />
                ))}
              </div>
            </div>
          )}
        </TooltipProvider>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum workspace encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}

function WorkspaceCard({
  workspace,
  cardCount,
  onClick,
  onEdit,
  onDelete,
}: {
  workspace: any;
  cardCount: number;
  onClick: () => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}) {
  const wsType = workspace.type || "vendas";
  const Icon = TYPE_ICONS[wsType] || TrendingUp;
  const cardLabel = CARD_LABEL_BY_TYPE[wsType] || "cards";

  return (
    <button
      onClick={onClick}
      className="group relative w-full rounded-xl border border-border/50 bg-card hover:bg-card/80 hover:border-primary/30 transition-all duration-200 text-left overflow-hidden"
    >
      <div
        className="h-20 w-full flex items-center justify-center"
        style={{ backgroundColor: workspace.color + "30" }}
      >
        <div className="flex gap-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-1 h-8 rounded-full" style={{ backgroundColor: workspace.color + "60" }} />
          ))}
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-sm font-bold text-foreground truncate">{workspace.name}</h3>
        <div className="flex items-center justify-between gap-2 mt-1.5">
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: workspace.color + "20", color: workspace.color }}
          >
            <Icon className="h-3 w-3" />
            {TYPE_LABELS[wsType] || wsType}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-default">
                {cardCount} {cardLabel}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <p className="font-semibold">{cardCount} {cardLabel} ativos</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {(onEdit || onDelete) && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button onClick={onEdit} className="h-6 w-6 flex items-center justify-center rounded-md bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground transition-colors">
              <Settings className="h-3 w-3" />
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="h-6 w-6 flex items-center justify-center rounded-md bg-background/80 hover:bg-background text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </button>
  );
}
