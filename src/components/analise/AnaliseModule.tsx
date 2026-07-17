import { useState } from "react";
import {
  ClipboardList, BarChart3, Activity, Users, Download, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HistoricoAtendimentosTab } from "./HistoricoAtendimentosTab";
import { IndicadoresTab } from "./IndicadoresTab";
import { MonitoramentoTab } from "./MonitoramentoTab";
import { StatusAtendentesTab } from "./StatusAtendentesTab";
import { DownloadRelatoriosTab } from "./DownloadRelatoriosTab";
import { AuditoriasTab } from "./AuditoriasTab";

type SubTab =
  | "historico"
  | "indicadores"
  | "monitoramento"
  | "status"
  | "downloads"
  | "auditorias";

const SUBTABS: { id: SubTab; label: string; icon: any }[] = [
  { id: "historico", label: "Histórico de atendimentos", icon: ClipboardList },
  { id: "indicadores", label: "Indicadores", icon: BarChart3 },
  { id: "monitoramento", label: "Monitoramento", icon: Activity },
  { id: "status", label: "Status dos atendentes", icon: Users },
  { id: "downloads", label: "Download de Relatórios", icon: Download },
  { id: "auditorias", label: "Auditorias", icon: Shield },
];

export function AnaliseModule() {
  const [sub, setSub] = useState<SubTab>("historico");

  return (
    <div className="space-y-5">
      {/* Sub-pills */}
      <div className="rounded-2xl border border-border bg-card p-1.5 flex flex-wrap gap-1 overflow-x-auto">
        {SUBTABS.map((t) => {
          const Icon = t.icon;
          const active = sub === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSub(t.id)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      <div>
        {sub === "historico" && <HistoricoAtendimentosTab />}
        {sub === "indicadores" && <IndicadoresTab />}
        {sub === "monitoramento" && <MonitoramentoTab />}
        {sub === "status" && <StatusAtendentesTab />}
        {sub === "downloads" && <DownloadRelatoriosTab />}
        {sub === "auditorias" && <AuditoriasTab />}
      </div>
    </div>
  );
}
