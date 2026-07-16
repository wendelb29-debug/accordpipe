import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  BarChart3, ClipboardList, ListChecks, MessageSquare, Shield, Sparkles, TrendingUp,
  ChevronDown, ChevronRight, Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

import { AuditToolbar } from "@/components/analytics/audit/AuditToolbar";
import { AuditTable } from "@/components/analytics/audit/AuditTable";
import { AuditFiltersSheet } from "@/components/analytics/audit/AuditFiltersSheet";
import { AuditDetailSheet } from "@/components/analytics/audit/AuditDetailSheet";
import { useAuditLogs, DEFAULT_FILTERS, type AuditFiltersState, type AuditLogRow } from "@/hooks/useAuditLogs";

type SectionKey = "audit" | "content" | "history" | "kpis" | "sentiment" | "quality" | "trends";

const SECTIONS: { key: SectionKey; label: string; icon: any; description: string; enabled: boolean }[] = [
  { key: "audit",     label: "Auditoria",              icon: Shield,        description: "Trilha imutável de eventos, alterações e reversões.", enabled: true  },
  { key: "content",   label: "Análise de conteúdo",    icon: Sparkles,      description: "Análise IA de conversas e materiais.",                enabled: false },
  { key: "history",   label: "Histórico de atendimento", icon: ClipboardList, description: "Linha do tempo de atendimentos por operador.",       enabled: false },
  { key: "kpis",      label: "Indicadores",            icon: BarChart3,     description: "KPIs operacionais e financeiros do agente.",         enabled: false },
  { key: "sentiment", label: "Sentimento",             icon: MessageSquare, description: "Distribuição de sentimento por contato.",            enabled: false },
  { key: "quality",   label: "Qualidade",              icon: ListChecks,    description: "Notas, checklists e conformidade.",                  enabled: false },
  { key: "trends",    label: "Tendências",             icon: TrendingUp,    description: "Séries temporais e padrões emergentes.",             enabled: false },
];

export default function Analytics() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { isMaster, isAdmin, isCeo } = useAuth();

  const canView = isMaster || isAdmin || isCeo;

  const initialSection = (params.get("section") as SectionKey) || "audit";
  const [activeSection, setActiveSection] = useState<SectionKey>(initialSection);
  const [openAudit, setOpenAudit] = useState(true);

  useEffect(() => {
    const p = new URLSearchParams(params);
    if (activeSection === "audit") p.delete("section"); else p.set("section", activeSection);
    setParams(p, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  const [filters, setFilters] = useState<AuditFiltersState>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<AuditLogRow | null>(null);

  const audit = useAuditLogs(filters);

  // poll for new events every 30s while section is open
  useEffect(() => {
    if (activeSection !== "audit") return;
    const t = setInterval(() => audit.pollNew(), 30_000);
    return () => clearInterval(t);
  }, [activeSection, audit]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.eventTypes.length) n++;
    if (filters.modules.length) n++;
    if (filters.sources.length) n++;
    if (filters.actorIds.length) n++;
    if (filters.agentIds.length) n++;
    if (filters.channelIds.length) n++;
    if (filters.statuses.length) n++;
    if (filters.severities.length) n++;
    if (filters.hasError) n++;
    if (filters.period !== "30d") n++;
    return n;
  }, [filters]);

  if (!canView) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <Shield className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <div className="font-medium">Acesso restrito</div>
          <p className="text-sm text-muted-foreground mt-1">
            O módulo de Analytics é disponível apenas para administradores, CEO e Master.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-[1600px] mx-auto w-full">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <BarChart3 className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold">Analytics do agente</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Auditoria, indicadores e análises do seu agente de inteligência artificial.
        </p>
      </header>

      {/* Pill navigation */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const active = s.key === activeSection;
          return (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card border-border/60 text-muted-foreground hover:text-foreground hover:border-border",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {s.label}
              {!s.enabled && <span className="text-[10px] opacity-60 ml-0.5">soon</span>}
            </button>
          );
        })}
      </div>

      {/* Sections */}
      {activeSection === "audit" ? (
        <AccordionCard
          icon={Shield}
          title="Auditoria"
          description="Trilha imutável de eventos, alterações e reversões."
          open={openAudit}
          onToggle={() => setOpenAudit((v) => !v)}
        >
          <div className="flex flex-col gap-4">
            <AuditToolbar
              filters={filters}
              onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
              onReset={() => setFilters(DEFAULT_FILTERS)}
              onOpenFilters={() => setFiltersOpen(true)}
              onRefresh={audit.refresh}
              refreshing={audit.refreshing}
              newEventsCount={audit.newEventsCount}
              onLoadNew={audit.loadNewEvents}
              activeFilterCount={activeFilterCount}
              lastFetchAt={audit.lastFetchAt}
            />

            {audit.error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-500">
                {audit.error}
              </div>
            )}

            <AuditTable
              rows={audit.rows}
              loading={audit.loading}
              total={audit.total}
              page={audit.page}
              pageSize={audit.pageSize}
              onPageChange={audit.setPage}
              onPageSizeChange={audit.setPageSize}
              sort={audit.sort}
              onSortChange={audit.setSort}
              onSelect={setSelectedRow}
            />
          </div>
        </AccordionCard>
      ) : (
        <Card className="p-10 text-center bg-card border-border/60">
          <div className="mx-auto mb-3 h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
            <Loader2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="font-medium">Em construção</div>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            {SECTIONS.find((s) => s.key === activeSection)?.description}
            {" "}Este painel será entregue nas próximas ondas.
          </p>
        </Card>
      )}

      <AuditFiltersSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={filters}
        onApply={(patch) => setFilters((f) => ({ ...f, ...patch }))}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />

      <AuditDetailSheet row={selectedRow} onOpenChange={(v) => !v && setSelectedRow(null)} />
    </div>
  );
}

function AccordionCard({
  icon: Icon, title, description, open, onToggle, children,
}: {
  icon: any; title: string; description: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <Card className="border-border/60 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition text-left"
      >
        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground truncate">{description}</div>
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="border-t border-border/60 p-4">
          {children}
        </div>
      )}
    </Card>
  );
}
