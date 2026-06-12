import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, X, CheckCircle2, XCircle, Trash2, Circle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type CardStatus = "aberto" | "ganho" | "perdido" | "lixeira";

export interface FilterState {
  responsavel: string | null;
  status: CardStatus[];
  dataCriacaoInicio: Date | null;
  dataCriacaoFim: Date | null;
  dataFinalizacaoInicio: Date | null;
  dataFinalizacaoFim: Date | null;
}

export const emptyFilterState: FilterState = {
  responsavel: null,
  status: [],
  dataCriacaoInicio: null,
  dataCriacaoFim: null,
  dataFinalizacaoInicio: null,
  dataFinalizacaoFim: null,
};

export function countActiveFilters(f: FilterState): number {
  let c = 0;
  if (f.responsavel) c++;
  if (f.status.length > 0) c++;
  if (f.dataCriacaoInicio || f.dataCriacaoFim) c++;
  if (f.dataFinalizacaoInicio || f.dataFinalizacaoFim) c++;
  return c;
}

interface FilterPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: FilterState;
  onApply: (filters: FilterState) => void;
  responsaveis: { user_id: string; name: string }[];
}

const STATUS_OPTIONS: {
  value: CardStatus;
  label: string;
  Icon: React.ElementType;
  badgeClass: string;
}[] = [
  { value: "aberto", label: "Aberto", Icon: Circle, badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" },
  { value: "ganho", label: "Ganho", Icon: CheckCircle2, badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
  { value: "perdido", label: "Perdido", Icon: XCircle, badgeClass: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" },
  { value: "lixeira", label: "Lixeira", Icon: Trash2, badgeClass: "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
];

export function FilterPanel({
  open,
  onOpenChange,
  value,
  onApply,
  responsaveis,
}: FilterPanelProps) {
  const [draft, setDraft] = useState<FilterState>(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const toggleStatus = (s: CardStatus) => {
    setDraft((d) => ({
      ...d,
      status: d.status.includes(s)
        ? d.status.filter((x) => x !== s)
        : [...d.status, s],
    }));
  };

  const reset = () => setDraft(emptyFilterState);

  const apply = () => {
    onApply(draft);
    onOpenChange(false);
  };

  const DateField = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: Date | null;
    onChange: (d: Date | null) => void;
  }) => (
    <div className="flex-1">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "w-full justify-start text-left font-normal h-9 mt-1",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {value ? format(value, "dd/MM/yyyy", { locale: ptBR }) : "—"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value || undefined}
            onSelect={(d) => onChange(d || null)}
            initialFocus
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-5 py-4 border-b">
          <SheetTitle>Filtrar Cards</SheetTitle>
          <SheetDescription>Filtre os cards por status e datas</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Responsável */}
          <div>
            <Label className="text-xs">Responsável</Label>
            <Select
              value={draft.responsavel ?? "all"}
              onValueChange={(v) =>
                setDraft({ ...draft, responsavel: v === "all" ? null : v })
              }
            >
              <SelectTrigger className="mt-1.5 h-9 text-xs">
                <SelectValue placeholder="Selecione o responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos</SelectItem>
                {responsaveis.map((r) => (
                  <SelectItem key={r.user_id} value={r.user_id} className="text-xs">
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div>
            <Label className="text-xs">Status</Label>
            <div className="mt-1.5 space-y-2">
              {STATUS_OPTIONS.map((opt) => {
                const checked = draft.status.includes(opt.value);
                const Icon = opt.Icon;
                return (
                  <label
                    key={opt.value}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md border px-3 py-2 cursor-pointer transition-colors",
                      checked
                        ? "border-primary/40 bg-primary/5"
                        : "border-border/50 hover:bg-muted/50"
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleStatus(opt.value)}
                    />
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                        opt.badgeClass
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {opt.label}
                    </span>
                  </label>
                );
              })}
              {draft.status.length === 0 && (
                <p className="text-[10px] text-muted-foreground italic">
                  Nenhum status selecionado = mostra todos
                </p>
              )}
            </div>
          </div>

          {/* Data de Criação */}
          <div>
            <Label className="text-xs">Data de Criação</Label>
            <div className="flex gap-2 mt-1">
              <DateField
                label="De"
                value={draft.dataCriacaoInicio}
                onChange={(d) => setDraft({ ...draft, dataCriacaoInicio: d })}
              />
              <DateField
                label="Até"
                value={draft.dataCriacaoFim}
                onChange={(d) => setDraft({ ...draft, dataCriacaoFim: d })}
              />
            </div>
          </div>

          {/* Data de Finalização */}
          <div>
            <Label className="text-xs">Data de Finalização</Label>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Aplica-se a cards concluídos, cancelados ou na lixeira
            </p>
            <div className="flex gap-2 mt-1">
              <DateField
                label="De"
                value={draft.dataFinalizacaoInicio}
                onChange={(d) =>
                  setDraft({ ...draft, dataFinalizacaoInicio: d })
                }
              />
              <DateField
                label="Até"
                value={draft.dataFinalizacaoFim}
                onChange={(d) => setDraft({ ...draft, dataFinalizacaoFim: d })}
              />
            </div>
          </div>
        </div>

        <div className="border-t px-5 py-3 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={reset}>
            Limpar Filtros
          </Button>
          <Button size="sm" onClick={apply} className="px-6">
            Aplicar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function getCardStatus(lead: {
  lead_status?: string | null;
  tags?: string[] | null;
}): CardStatus {
  const s = (lead.lead_status || "").toLowerCase();
  if (s === "won" || s === "ganho") return "ganho";
  if (s === "lost" || s === "perdido") return "perdido";
  if (s === "trash" || s === "lixeira" || (lead.tags || []).includes("Lixeira"))
    return "lixeira";
  return "aberto";
}

export function applyFilters<
  T extends {
    created_by_user_id?: string | null;
    lead_status?: string | null;
    tags?: string[] | null;
    created_at: string;
    updated_at?: string;
  }
>(items: T[], f: FilterState): T[] {
  return items.filter((item) => {
    if (f.responsavel && item.created_by_user_id !== f.responsavel) return false;

    if (f.status.length > 0) {
      const st = getCardStatus(item);
      if (!f.status.includes(st)) return false;
    }

    const createdAt = new Date(item.created_at);
    if (f.dataCriacaoInicio && createdAt < startOfDay(f.dataCriacaoInicio))
      return false;
    if (f.dataCriacaoFim && createdAt > endOfDay(f.dataCriacaoFim)) return false;

    // Use updated_at as proxy for closedAt when status indicates finalization
    const st = getCardStatus(item);
    const isFinalized = st === "ganho" || st === "perdido" || st === "lixeira";
    if (f.dataFinalizacaoInicio || f.dataFinalizacaoFim) {
      if (!isFinalized) return false;
      const closedAt = new Date(item.updated_at || item.created_at);
      if (
        f.dataFinalizacaoInicio &&
        closedAt < startOfDay(f.dataFinalizacaoInicio)
      )
        return false;
      if (f.dataFinalizacaoFim && closedAt > endOfDay(f.dataFinalizacaoFim))
        return false;
    }

    return true;
  });
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
