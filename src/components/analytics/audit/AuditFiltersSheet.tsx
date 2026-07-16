import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { useAuth } from "@/contexts/AuthContext";
import type { AuditFiltersState } from "@/hooks/useAuditLogs";
import { MODULE_LABELS } from "./audit-helpers";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  filters: AuditFiltersState;
  onApply: (patch: Partial<AuditFiltersState>) => void;
  onReset: () => void;
}

interface Option { value: string; label: string; count?: number }

export function AuditFiltersSheet({ open, onOpenChange, filters, onApply, onReset }: Props) {
  const activeCompanyId = useActiveCompanyId();
  const { isMaster } = useAuth();
  const [local, setLocal] = useState<AuditFiltersState>(filters);
  const [facets, setFacets] = useState<{
    eventTypes: Option[]; modules: Option[]; sources: Option[];
    actors: Option[]; statuses: Option[]; severities: Option[];
  }>({ eventTypes: [], modules: [], sources: [], actors: [], statuses: [], severities: [] });

  useEffect(() => { if (open) setLocal(filters); }, [open, filters]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      let base = supabase.from("audit_logs").select("event_type, module, source, user_id, user_name, status, severity");
      if (!isMaster && activeCompanyId) base = base.eq("servidor_id", activeCompanyId);
      const { data } = await base.limit(2000);
      if (!data) return;
      const bucket = (key: "event_type" | "module" | "source" | "status" | "severity") => {
        const m = new Map<string, number>();
        for (const r of data as any[]) {
          const v = r[key];
          if (!v) continue;
          m.set(v, (m.get(v) || 0) + 1);
        }
        return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).map(([value, count]) => ({
          value, count,
          label: key === "module" ? (MODULE_LABELS[value] || value) : value,
        }));
      };
      const actorMap = new Map<string, { name: string; count: number }>();
      for (const r of data as any[]) {
        if (!r.user_id) continue;
        const cur = actorMap.get(r.user_id) || { name: r.user_name || "—", count: 0 };
        cur.count++;
        actorMap.set(r.user_id, cur);
      }
      setFacets({
        eventTypes: bucket("event_type"),
        modules: bucket("module"),
        sources: bucket("source"),
        statuses: bucket("status"),
        severities: bucket("severity"),
        actors: Array.from(actorMap.entries())
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 30)
          .map(([value, v]) => ({ value, label: v.name, count: v.count })),
      });
    })();
  }, [open, activeCompanyId, isMaster]);

  const toggle = (key: keyof AuditFiltersState, value: string) => {
    const arr = (local[key] as string[]) || [];
    setLocal({ ...local, [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] });
  };

  const apply = () => {
    onApply(local);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filtros de auditoria</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <FacetGroup title="Módulo" options={facets.modules} selected={local.modules}
            onToggle={(v) => toggle("modules", v)} />
          <FacetGroup title="Tipo de evento" options={facets.eventTypes} selected={local.eventTypes}
            onToggle={(v) => toggle("eventTypes", v)} />
          <FacetGroup title="Origem" options={facets.sources} selected={local.sources}
            onToggle={(v) => toggle("sources", v)} />
          <FacetGroup title="Status" options={facets.statuses} selected={local.statuses}
            onToggle={(v) => toggle("statuses", v)} />
          <FacetGroup title="Severidade" options={facets.severities} selected={local.severities}
            onToggle={(v) => toggle("severities", v)} />
          <FacetGroup title="Responsável" options={facets.actors} selected={local.actorIds}
            onToggle={(v) => toggle("actorIds", v)} searchable />

          <div className="space-y-2">
            <div className="text-sm font-medium">Outros</div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={!!local.hasError} onCheckedChange={(v) => setLocal({ ...local, hasError: !!v })} />
              Apenas com erro
            </label>
          </div>
        </div>

        <div className="sticky bottom-0 -mx-6 mt-8 border-t bg-background/95 px-6 py-3 backdrop-blur flex items-center justify-between">
          <Button variant="ghost" onClick={() => { onReset(); onOpenChange(false); }}>Limpar tudo</Button>
          <Button onClick={apply}>Aplicar filtros</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FacetGroup({
  title, options, selected, onToggle, searchable,
}: {
  title: string; options: Option[]; selected: string[]; onToggle: (v: string) => void; searchable?: boolean;
}) {
  const [q, setQ] = useState("");
  const visible = useMemo(() => {
    if (!q) return options.slice(0, 20);
    const ql = q.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(ql)).slice(0, 20);
  }, [options, q]);

  if (options.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{title}</div>
        {selected.length > 0 && (
          <span className="text-xs text-muted-foreground">{selected.length} selecionado{selected.length > 1 ? "s" : ""}</span>
        )}
      </div>
      {searchable && (
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="h-8 text-sm" />
      )}
      <div className="space-y-1 max-h-[240px] overflow-y-auto pr-1">
        {visible.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-sm hover:bg-muted/50 rounded px-1.5 py-1 cursor-pointer">
            <Checkbox checked={selected.includes(o.value)} onCheckedChange={() => onToggle(o.value)} />
            <span className="flex-1 truncate">{o.label}</span>
            {typeof o.count === "number" && (
              <span className="text-xs text-muted-foreground tabular-nums">{o.count}</span>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}
