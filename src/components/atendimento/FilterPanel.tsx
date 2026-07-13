import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarIcon,
  CheckCircle2,
  XCircle,
  Trash2,
  Circle,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export type CardStatus = "aberto" | "ganho" | "perdido" | "lixeira";

export interface FilterState {
  responsavel: string | null;
  status: CardStatus[];
  dataCriacaoInicio: Date | null;
  dataCriacaoFim: Date | null;
  dataFinalizacaoInicio: Date | null;
  dataFinalizacaoFim: Date | null;
  // New
  tags: string[];
  estado: string | null;
  cidade: string | null;
  stages: string[];
  sources: string[];
  valueMin: number | null;
  valueMax: number | null;
  company: string | null;
}

export const emptyFilterState: FilterState = {
  responsavel: null,
  status: [],
  dataCriacaoInicio: null,
  dataCriacaoFim: null,
  dataFinalizacaoInicio: null,
  dataFinalizacaoFim: null,
  tags: [],
  estado: null,
  cidade: null,
  stages: [],
  sources: [],
  valueMin: null,
  valueMax: null,
  company: null,
};

export function countActiveFilters(f: FilterState): number {
  let c = 0;
  if (f.responsavel) c++;
  if (f.status.length > 0) c++;
  if (f.dataCriacaoInicio || f.dataCriacaoFim) c++;
  if (f.dataFinalizacaoInicio || f.dataFinalizacaoFim) c++;
  if (f.tags.length > 0) c++;
  if (f.estado || f.cidade) c++;
  if (f.stages.length > 0) c++;
  if (f.sources.length > 0) c++;
  if (f.valueMin != null || f.valueMax != null) c++;
  if (f.company) c++;
  return c;
}

type LeadLike = {
  tags?: string[] | null;
  estado?: string | null;
  cidade?: string | null;
  stage?: string | null;
  source?: string | null;
  company_name?: string | null;
  value_mrr?: number | null;
  value_ps?: number | null;
};

interface FilterPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: FilterState;
  onApply: (filters: FilterState) => void;
  responsaveis: { user_id: string; name: string }[];
  leads?: LeadLike[];
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
  leads = [],
}: FilterPanelProps) {
  const [draft, setDraft] = useState<FilterState>(value);
  const [companyOpen, setCompanyOpen] = useState(false);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  // Derive option lists from leads
  const { allTags, allEstados, citiesByEstado, allStages, allSources, allCompanies, maxLeadValue } = useMemo(() => {
    const tags = new Set<string>();
    const estados = new Set<string>();
    const cityMap = new Map<string, Set<string>>();
    const stages = new Set<string>();
    const sources = new Set<string>();
    const companies = new Set<string>();
    let max = 0;
    for (const l of leads) {
      (l.tags || []).forEach((t) => t && tags.add(t));
      if (l.estado) {
        estados.add(l.estado);
        if (l.cidade) {
          if (!cityMap.has(l.estado)) cityMap.set(l.estado, new Set());
          cityMap.get(l.estado)!.add(l.cidade);
        }
      }
      if (l.stage) stages.add(l.stage);
      if (l.source) sources.add(l.source);
      if (l.company_name) companies.add(l.company_name);
      const v = (l.value_mrr || 0) + (l.value_ps || 0);
      if (v > max) max = v;
    }
    return {
      allTags: [...tags].sort(),
      allEstados: [...estados].sort(),
      citiesByEstado: cityMap,
      allStages: [...stages].sort(),
      allSources: [...sources].sort(),
      allCompanies: [...companies].sort(),
      maxLeadValue: Math.max(max, 10000),
    };
  }, [leads]);

  const citiesForState = draft.estado
    ? [...(citiesByEstado.get(draft.estado) || [])].sort()
    : [];

  const toggleStatus = (s: CardStatus) => {
    setDraft((d) => ({
      ...d,
      status: d.status.includes(s) ? d.status.filter((x) => x !== s) : [...d.status, s],
    }));
  };
  const toggleIn = (key: "tags" | "stages" | "sources", v: string) => {
    setDraft((d) => ({
      ...d,
      [key]: d[key].includes(v) ? d[key].filter((x) => x !== v) : [...d[key], v],
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

  const sliderMin = 0;
  const sliderMax = Math.ceil(maxLeadValue / 1000) * 1000;
  const currentMin = draft.valueMin ?? sliderMin;
  const currentMax = draft.valueMax ?? sliderMax;

  const isMobile = useIsMobile();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={isMobile
          ? "w-full h-[90vh] max-h-[90vh] flex flex-col p-0 rounded-t-2xl"
          : "w-full sm:max-w-md flex flex-col p-0"}
      >
        <SheetHeader className="px-5 py-4 border-b">
          <SheetTitle>Filtrar Cards</SheetTitle>
          <SheetDescription>Refine por responsável, status, tags, localização e mais</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Responsável */}
          <div>
            <Label className="text-xs">Responsável</Label>
            <Select
              value={draft.responsavel ?? "all"}
              onValueChange={(v) => setDraft({ ...draft, responsavel: v === "all" ? null : v })}
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
                      checked ? "border-primary/40 bg-primary/5" : "border-border/50 hover:bg-muted/50"
                    )}
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggleStatus(opt.value)} />
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

          {/* Tags */}
          {allTags.length > 0 && (
            <div>
              <Label className="text-xs">Tags</Label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {allTags.map((t) => {
                  const checked = draft.tags.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleIn("tags", t)}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] border transition-colors",
                        checked
                          ? "bg-primary/15 border-primary/40 text-primary"
                          : "bg-muted/40 border-border/50 hover:bg-muted"
                      )}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Estágio */}
          {allStages.length > 0 && (
            <div>
              <Label className="text-xs">Estágio do Pipeline</Label>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {allStages.map((s) => {
                  const checked = draft.stages.includes(s);
                  return (
                    <label
                      key={s}
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-2.5 py-1.5 cursor-pointer text-[11px]",
                        checked ? "border-primary/40 bg-primary/5" : "border-border/50 hover:bg-muted/50"
                      )}
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggleIn("stages", s)} />
                      <span className="truncate">{s}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Origem */}
          {allSources.length > 0 && (
            <div>
              <Label className="text-xs">Origem do Lead</Label>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {allSources.map((s) => {
                  const checked = draft.sources.includes(s);
                  return (
                    <label
                      key={s}
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-2.5 py-1.5 cursor-pointer text-[11px]",
                        checked ? "border-primary/40 bg-primary/5" : "border-border/50 hover:bg-muted/50"
                      )}
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggleIn("sources", s)} />
                      <span className="truncate capitalize">{s}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Localização */}
          {allEstados.length > 0 && (
            <div>
              <Label className="text-xs">Localização</Label>
              <div className="flex gap-2 mt-1.5">
                <div className="flex-1">
                  <span className="text-[10px] text-muted-foreground">Estado</span>
                  <Select
                    value={draft.estado ?? "all"}
                    onValueChange={(v) =>
                      setDraft({ ...draft, estado: v === "all" ? null : v, cidade: null })
                    }
                  >
                    <SelectTrigger className="mt-1 h-9 text-xs">
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Todos</SelectItem>
                      {allEstados.map((e) => (
                        <SelectItem key={e} value={e} className="text-xs">{e}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <span className="text-[10px] text-muted-foreground">Cidade</span>
                  <Select
                    value={draft.cidade ?? "all"}
                    onValueChange={(v) => setDraft({ ...draft, cidade: v === "all" ? null : v })}
                    disabled={!draft.estado || citiesForState.length === 0}
                  >
                    <SelectTrigger className="mt-1 h-9 text-xs">
                      <SelectValue placeholder={draft.estado ? "Cidade" : "Escolha o estado"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Todas</SelectItem>
                      {citiesForState.map((c) => (
                        <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Empresa */}
          {allCompanies.length > 0 && (
            <div>
              <Label className="text-xs">Empresa</Label>
              <Popover open={companyOpen} onOpenChange={setCompanyOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    role="combobox"
                    className="w-full justify-between mt-1.5 h-9 text-xs font-normal"
                  >
                    <span className={cn("truncate", !draft.company && "text-muted-foreground")}>
                      {draft.company || "Selecionar empresa"}
                    </span>
                    <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar empresa..." className="h-9 text-xs" />
                    <CommandList>
                      <CommandEmpty>Nenhuma encontrada</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value=""
                          onSelect={() => {
                            setDraft({ ...draft, company: null });
                            setCompanyOpen(false);
                          }}
                          className="text-xs"
                        >
                          <Check className={cn("mr-2 h-3.5 w-3.5", !draft.company ? "opacity-100" : "opacity-0")} />
                          Todas
                        </CommandItem>
                        {allCompanies.map((c) => (
                          <CommandItem
                            key={c}
                            value={c}
                            onSelect={() => {
                              setDraft({ ...draft, company: c });
                              setCompanyOpen(false);
                            }}
                            className="text-xs"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-3.5 w-3.5",
                                draft.company === c ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="truncate">{c}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Valor */}
          <div>
            <Label className="text-xs">Valor do Negócio (MRR + PS)</Label>
            <div className="mt-2 px-1">
              <Slider
                min={sliderMin}
                max={sliderMax}
                step={Math.max(100, Math.round(sliderMax / 100))}
                value={[currentMin, currentMax]}
                onValueChange={([min, max]) =>
                  setDraft({
                    ...draft,
                    valueMin: min === sliderMin ? null : min,
                    valueMax: max === sliderMax ? null : max,
                  })
                }
              />
            </div>
            <div className="flex gap-2 mt-2">
              <div className="flex-1">
                <span className="text-[10px] text-muted-foreground">De (R$)</span>
                <Input
                  type="number"
                  value={draft.valueMin ?? ""}
                  placeholder="0"
                  className="h-9 text-xs mt-1"
                  onChange={(e) =>
                    setDraft({ ...draft, valueMin: e.target.value === "" ? null : Number(e.target.value) })
                  }
                />
              </div>
              <div className="flex-1">
                <span className="text-[10px] text-muted-foreground">Até (R$)</span>
                <Input
                  type="number"
                  value={draft.valueMax ?? ""}
                  placeholder="∞"
                  className="h-9 text-xs mt-1"
                  onChange={(e) =>
                    setDraft({ ...draft, valueMax: e.target.value === "" ? null : Number(e.target.value) })
                  }
                />
              </div>
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
                onChange={(d) => setDraft({ ...draft, dataFinalizacaoInicio: d })}
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
    estado?: string | null;
    cidade?: string | null;
    stage?: string | null;
    source?: string | null;
    company_name?: string | null;
    value_mrr?: number | null;
    value_ps?: number | null;
  }
>(items: T[], f: FilterState): T[] {
  return items.filter((item) => {
    if (f.responsavel && item.created_by_user_id !== f.responsavel) return false;

    if (f.status.length > 0) {
      const st = getCardStatus(item);
      if (!f.status.includes(st)) return false;
    }

    if (f.tags.length > 0) {
      const itemTags = item.tags || [];
      if (!f.tags.some((t) => itemTags.includes(t))) return false;
    }

    if (f.estado && item.estado !== f.estado) return false;
    if (f.cidade && item.cidade !== f.cidade) return false;
    if (f.stages.length > 0 && (!item.stage || !f.stages.includes(item.stage))) return false;
    if (f.sources.length > 0 && (!item.source || !f.sources.includes(item.source))) return false;
    if (f.company && item.company_name !== f.company) return false;

    if (f.valueMin != null || f.valueMax != null) {
      const v = (item.value_mrr || 0) + (item.value_ps || 0);
      if (f.valueMin != null && v < f.valueMin) return false;
      if (f.valueMax != null && v > f.valueMax) return false;
    }

    const createdAt = new Date(item.created_at);
    if (f.dataCriacaoInicio && createdAt < startOfDay(f.dataCriacaoInicio)) return false;
    if (f.dataCriacaoFim && createdAt > endOfDay(f.dataCriacaoFim)) return false;

    const st = getCardStatus(item);
    const isFinalized = st === "ganho" || st === "perdido" || st === "lixeira";
    if (f.dataFinalizacaoInicio || f.dataFinalizacaoFim) {
      if (!isFinalized) return false;
      const closedAt = new Date(item.updated_at || item.created_at);
      if (f.dataFinalizacaoInicio && closedAt < startOfDay(f.dataFinalizacaoInicio)) return false;
      if (f.dataFinalizacaoFim && closedAt > endOfDay(f.dataFinalizacaoFim)) return false;
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
