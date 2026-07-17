import { useState } from "react";
import { cn } from "@/lib/utils";
import { Info, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SubSub = "visao" | "consumo" | "csat" | "ctwa" | "metricas";

const SUBSUB: { id: SubSub; label: string }[] = [
  { id: "visao", label: "Visão Geral" },
  { id: "consumo", label: "Consumo" },
  { id: "csat", label: "Pesquisa CSAT" },
  { id: "ctwa", label: "CTWA" },
  { id: "metricas", label: "Métricas de atendimento" },
];

export function IndicadoresTab() {
  const [tab, setTab] = useState<SubSub>("visao");

  return (
    <TooltipProvider>
      <div className="space-y-5">
        {/* Sub-sub pills */}
        <div className="rounded-full border border-border bg-card p-1 flex flex-wrap gap-1 w-fit">
          {SUBSUB.map((s) => (
            <button
              key={s.id}
              onClick={() => setTab(s.id)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-medium transition",
                tab === s.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Common filter bar */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
          <Button variant="outline" size="sm" disabled>Selecionar período</Button>
          <span className="text-[10px] text-muted-foreground">máx 60 dias</span>
          <FilterSelect placeholder="Departamentos" />
          <FilterSelect placeholder="Canais" />
          <FilterSelect placeholder="Atendentes" />
          <div className="ml-auto flex items-center gap-3 text-xs">
            <label className="flex items-center gap-1.5 text-muted-foreground cursor-pointer">
              <input type="checkbox" className="rounded" />
              Comparar com período anterior
            </label>
          </div>
        </div>

        {tab === "visao" && <VisaoGeral />}
        {tab === "consumo" && <Consumo />}
        {tab === "csat" && <CsatSection />}
        {tab === "ctwa" && <CtwaSection />}
        {tab === "metricas" && <MetricasAtendimento />}
      </div>
    </TooltipProvider>
  );
}

function FilterSelect({ placeholder }: { placeholder: string }) {
  return (
    <Select disabled>
      <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent><SelectItem value="all">Todos</SelectItem></SelectContent>
    </Select>
  );
}

function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

function StatCard({ label, value, delta, hint, tone = "default" }: {
  label: string; value: string | number; delta?: string; hint?: string;
  tone?: "default" | "primary" | "orange" | "amber" | "sky" | "emerald" | "rose";
}) {
  const toneCls = {
    default: "text-foreground",
    primary: "text-primary",
    orange: "text-orange-500",
    amber: "text-amber-500",
    sky: "text-sky-500",
    emerald: "text-emerald-500",
    rose: "text-rose-500",
  }[tone];
  return (
    <div className="rounded-xl border border-border bg-background p-4 flex flex-col gap-1 min-w-[140px]">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
        {hint && (
          <Tooltip>
            <TooltipTrigger asChild><Info className="h-3 w-3 opacity-70" /></TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px] text-xs">{hint}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className={cn("text-2xl font-semibold tabular-nums", toneCls)}>{value}</div>
      {delta && <div className="text-[11px] text-muted-foreground flex items-center gap-1">
        <TrendingUp className="h-3 w-3 text-emerald-500" /> {delta}
      </div>}
    </div>
  );
}

function VisaoGeral() {
  return (
    <>
      <Section title="Atendimentos (Em aberto x Finalizados)" right={<ToggleQtdPct />}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Total" value="—" />
          <StatCard label="Em atendimento" value="—" tone="primary" />
          <StatCard label="Em espera" value="—" tone="amber" />
          <StatCard label="Aguardando" value="—" tone="orange" hint="Contatos que ainda não foram atendidos." />
          <StatCard label="Em fluxo" value="—" tone="sky" />
          <StatCard label="Finalizado" value="—" tone="emerald" />
        </div>
      </Section>

      <Section title="Atendimentos por agente" right={
        <div className="rounded-full border border-border p-1 flex gap-1 text-xs">
          <button className="px-3 py-1 rounded-full bg-primary text-primary-foreground">Cards</button>
          <button className="px-3 py-1 rounded-full text-muted-foreground">Tabela</button>
        </div>
      }>
        <div className="text-sm text-muted-foreground italic">
          Sem dados agregados por agente disponíveis para este período.
        </div>
      </Section>

      <Section title="Tempo médio">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {["1ª Resposta", "Entre mensagens", "Atendimento", "Tempo de espera", "Tempo em fluxo"].map((l) => (
            <StatCard key={l} label={l} value="00:00:00" hint="Cálculo médio no período filtrado." />
          ))}
        </div>
      </Section>

      <Section title="Automação e Transbordo">
        <div className="grid md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-background p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center justify-between">
              Taxa de automação <ToggleQtdPct />
            </div>
            <div className="mt-2 text-3xl font-semibold text-emerald-500">—</div>
          </div>
          <div className="rounded-xl border border-border bg-background p-4 space-y-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Taxa de transbordo</div>
            <div className="text-2xl font-semibold text-amber-500">—</div>
            <div className="text-xs text-muted-foreground pt-2 border-t border-border">Tempo até transbordo</div>
            <div className="text-lg font-semibold">00:00:00</div>
          </div>
          <div className="rounded-xl border border-border bg-background p-4 md:col-span-1">
            <div className="text-xs text-muted-foreground mb-2">BOT x Humano (por dia)</div>
            <MockBarChart />
          </div>
        </div>
      </Section>

      <Section title="Fluxos que mais transbordam para humanos">
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground uppercase">
              <tr>
                <th className="text-left px-3 py-2">Fluxo</th>
                <th className="text-left px-3 py-2">Transbordos</th>
                <th className="text-left px-3 py-2">Total de atendimentos</th>
                <th className="text-left px-3 py-2">%</th>
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Sem registros no período</td></tr>
            </tbody>
          </table>
          <div className="px-3 py-2 text-[11px] text-muted-foreground border-t border-border">Mostrando 0 registros</div>
        </div>
      </Section>

      <Section title="Atendimentos criados e finalizados por hora do dia">
        <MockHourlyChart />
      </Section>

      <Section title="Distribuição por canal · Mapa de calor · Ativo x Receptivo">
        <div className="text-sm text-muted-foreground italic">
          Painéis complementares serão preenchidos assim que houver volume suficiente no período.
        </div>
      </Section>
    </>
  );
}

function Consumo() {
  return (
    <>
      <Section title="Volume de mensagens">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Enviadas" value="—" delta="—" />
          <StatCard label="Recebidas" value="—" delta="—" />
          <StatCard label="Requisições" value="—" delta="—" />
          <StatCard label="Contatos únicos" value="—" delta="—" />
        </div>
      </Section>
      <Section title="Protocolos ativos vs receptivos">
        <MockBarChart />
      </Section>
      <Section title="Consumo por departamento">
        <MockBarChart />
      </Section>
      <Section title="Mensagens ao longo do tempo">
        <MockLineChart />
      </Section>
    </>
  );
}

function CsatSection() {
  return (
    <>
      <Section title="Pesquisas CSAT">
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Pendentes" value="—" tone="amber" />
          <StatCard label="Respondidas" value="—" tone="emerald" />
          <StatCard label="Não respondidas" value="—" tone="rose" />
        </div>
      </Section>
      <Section title="Distribuição das notas (1 a 5)"><MockBarChart /></Section>
      <Section title="Tendência ao longo do tempo"><MockLineChart /></Section>
      <Section title="Respostas por atendimento">
        <div className="text-sm text-muted-foreground italic">Sem respostas no período.</div>
      </Section>
    </>
  );
}

function CtwaSection() {
  return (
    <>
      <Section title="Click to WhatsApp Ads">
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Cliques recebidos" value="—" />
          <StatCard label="Conversas" value="—" tone="primary" />
          <StatCard label="Clientes únicos" value="—" tone="emerald" />
        </div>
      </Section>
      <Section title="Funil de conversão">
        <div className="flex items-center justify-around py-4 text-xs text-muted-foreground">
          <FunnelStep label="Clique" value="—" />
          <ArrowRight className="h-4 w-4" />
          <FunnelStep label="Conversa" value="—" />
          <ArrowRight className="h-4 w-4" />
          <FunnelStep label="Classificação" value="—" />
        </div>
      </Section>
      <Section title="Tempo até primeira resposta">
        <StatCard label="Média" value="00:00:00" />
      </Section>
      <Section title="Cliques ao longo do tempo · por canal · por hora"><MockLineChart /></Section>
    </>
  );
}

function MetricasAtendimento() {
  const cols = ["TMIA", "TMIC", "TMA", "TMPI", "TME", "Em aberto", "Em espera", "Sem 1ª msg", "Perdidos", "Pendentes", "Finalizados"];
  return (
    <Section title="Métricas por atendente">
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-muted-foreground uppercase">
            <tr>
              <th className="text-left px-3 py-2">Atendente</th>
              {cols.map((c) => <th key={c} className="text-left px-3 py-2">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr><td colSpan={cols.length + 1} className="px-3 py-6 text-center text-muted-foreground">
              Sem dados no período
            </td></tr>
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground mt-3">
        Esses números contam trabalho por atendente e por isso não batem com os totais do Histórico
        de atendimentos, que conta por conversa.
      </p>
    </Section>
  );
}

function FunnelStep({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</div>
      <div className="text-xl font-semibold text-primary">{value}</div>
    </div>
  );
}

function ToggleQtdPct() {
  return (
    <div className="rounded-full border border-border p-0.5 flex gap-0.5 text-[10px]">
      <button className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground">%</button>
      <button className="px-2 py-0.5 rounded-full text-muted-foreground">Qtd</button>
    </div>
  );
}

function MockBarChart() {
  const bars = [40, 65, 55, 80, 45, 90, 70];
  return (
    <div className="h-32 flex items-end gap-2 pt-2">
      {bars.map((h, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full rounded-t bg-primary/70" style={{ height: `${h}%` }} />
          <div className="text-[9px] text-muted-foreground">D{i + 1}</div>
        </div>
      ))}
    </div>
  );
}

function MockLineChart() {
  return (
    <div className="h-32 relative">
      <svg viewBox="0 0 200 60" className="w-full h-full">
        <polyline
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          points="0,45 25,30 50,40 75,20 100,25 125,15 150,30 175,10 200,20"
        />
      </svg>
    </div>
  );
}

function MockHourlyChart() {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  return (
    <div className="h-40 flex items-end gap-1">
      {hours.map((h) => {
        const created = Math.floor(Math.random() * 60) + 10;
        const closed = Math.floor(Math.random() * 40) + 5;
        return (
          <div key={h} className="flex-1 flex flex-col-reverse gap-0.5">
            <div className="w-full bg-primary/70" style={{ height: `${created}%` }} />
            <div className="w-full bg-emerald-500/60" style={{ height: `${closed}%` }} />
          </div>
        );
      })}
    </div>
  );
}
