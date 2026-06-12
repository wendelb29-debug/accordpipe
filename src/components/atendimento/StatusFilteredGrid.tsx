import { CheckCircle2, XCircle, Trash2, RotateCcw, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { CrmLead } from "@/hooks/useCrmLeads";

type StatusKey = "won" | "lost" | "trash";

interface Props {
  leads: CrmLead[];
  statusFilter: StatusKey;
  onRestore: (leadId: string) => Promise<void> | void;
  onOpenCard: (lead: CrmLead) => void;
}

const STATUS_META: Record<
  StatusKey,
  {
    Icon: typeof CheckCircle2;
    label: string;
    description: string;
    accentBar: string;
    iconBg: string;
    iconColor: string;
    pillText: string;
    hoverBorder: string;
    btnBg: string;
    btnHover: string;
    btnText: string;
  }
> = {
  won: {
    Icon: CheckCircle2,
    label: "Ganhos",
    description: "Leads que viraram clientes",
    accentBar: "bg-emerald-500",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    pillText: "text-emerald-600 dark:text-emerald-400",
    hoverBorder: "hover:border-emerald-400/40",
    btnBg: "bg-emerald-500/10",
    btnHover: "hover:bg-emerald-500/20",
    btnText: "text-emerald-600 dark:text-emerald-400",
  },
  lost: {
    Icon: XCircle,
    label: "Perdidos",
    description: "Oportunidades que não fecharam",
    accentBar: "bg-orange-500",
    iconBg: "bg-orange-500/15",
    iconColor: "text-orange-600 dark:text-orange-400",
    pillText: "text-orange-600 dark:text-orange-400",
    hoverBorder: "hover:border-orange-400/40",
    btnBg: "bg-orange-500/10",
    btnHover: "hover:bg-orange-500/20",
    btnText: "text-orange-600 dark:text-orange-400",
  },
  trash: {
    Icon: Trash2,
    label: "Lixeira",
    description: "Cards descartados — podem ser restaurados",
    accentBar: "bg-red-500",
    iconBg: "bg-red-500/15",
    iconColor: "text-red-600 dark:text-red-400",
    pillText: "text-red-600 dark:text-red-400",
    hoverBorder: "hover:border-red-400/40",
    btnBg: "bg-red-500/10",
    btnHover: "hover:bg-red-500/20",
    btnText: "text-red-600 dark:text-red-400",
  },
};

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function StatusFilteredGrid({ leads, statusFilter, onRestore, onOpenCard }: Props) {
  const meta = STATUS_META[statusFilter];

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-3", meta.iconBg)}>
          <meta.Icon className={cn("w-7 h-7", meta.iconColor)} />
        </div>
        <h3 className="text-[15px] font-bold text-foreground">
          Nenhum card em {meta.label.toLowerCase()}
        </h3>
        <p className="text-[12.5px] text-muted-foreground mt-1 max-w-sm">{meta.description}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-3 overflow-y-auto">
      {leads.map((lead) => {
        const dateStr = (lead as any).status_changed_at || lead.updated_at;
        return (
          <div
            key={lead.id}
            onClick={() => onOpenCard(lead)}
            className={cn(
              "group relative rounded-xl border border-border bg-card p-3 hover:shadow-lg transition cursor-pointer overflow-hidden",
              meta.hoverBorder
            )}
          >
            <div className={cn("absolute top-0 left-0 right-0 h-[3px]", meta.accentBar)} />

            <div className="flex items-center gap-2 mb-2">
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", meta.iconBg)}>
                <meta.Icon className={cn("w-3.5 h-3.5", meta.iconColor)} />
              </div>
              <span className={cn("text-[9px] font-extrabold uppercase tracking-wider", meta.pillText)}>
                {meta.label.toUpperCase()}
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground inline-flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" />
                {dateStr ? format(parseISO(dateStr as string), "dd/MM/yy", { locale: ptBR }) : "—"}
              </span>
            </div>

            <h4 className="text-[13px] font-bold text-foreground truncate">
              {lead.contact_name || lead.company_name}
            </h4>
            <p className="text-[11.5px] text-muted-foreground truncate mt-0.5">{lead.company_name}</p>

            {(lead.value_ps > 0 || lead.value_mrr > 0) && (
              <div className="text-[11px] mt-2 space-y-0.5">
                {lead.value_ps > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">P&S</span>
                    <span className="font-semibold text-foreground tabular-nums">{formatBRL(lead.value_ps)}</span>
                  </div>
                )}
                {lead.value_mrr > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">MRR</span>
                    <span className="font-semibold text-foreground tabular-nums">{formatBRL(lead.value_mrr)}</span>
                  </div>
                )}
              </div>
            )}

            {statusFilter === "lost" && lead.lost_reason && (
              <div className="mt-2 p-2 rounded-md bg-orange-500/8 border border-orange-500/15">
                <div className="text-[9px] font-bold uppercase tracking-wider text-orange-600 mb-0.5">
                  Motivo
                </div>
                <div className="text-[11px] text-orange-800 dark:text-orange-300 line-clamp-2">
                  {lead.lost_reason}
                </div>
              </div>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onRestore(lead.id);
              }}
              className={cn(
                "mt-3 w-full h-8 rounded-lg text-[11px] font-semibold inline-flex items-center justify-center gap-1.5 transition opacity-0 group-hover:opacity-100",
                meta.btnBg,
                meta.btnHover,
                meta.btnText
              )}
            >
              <RotateCcw className="w-3 h-3" />
              Restaurar pro pipeline
            </button>
          </div>
        );
      })}
    </div>
  );
}
