import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TenantWhatsAppIntegration } from "@/hooks/useTenantWhatsAppIntegration";
import { format } from "date-fns";

interface Props {
  integrations: TenantWhatsAppIntegration[];
  loading: boolean;
  onOpenInstance: () => void;
  onAddNew: () => void;
}

export function InstanceListTab({ integrations, loading, onOpenInstance, onAddNew }: Props) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"active" | "removed">("active");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    const term = q.toLowerCase().trim();
    return integrations
      .filter((i) => (filter === "active" ? i.is_active !== false : i.is_active === false))
      .filter((i) => {
        if (!term) return true;
        return (
          i.instance_name?.toLowerCase().includes(term) ||
          i.connected_phone?.toLowerCase().includes(term) ||
          i.provider_type?.toLowerCase().includes(term)
        );
      });
  }, [integrations, q, filter]);

  const total = rows.length;
  const start = (page - 1) * pageSize;
  const paged = rows.slice(start, start + pageSize);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-lg font-semibold">Lista de números</h3>
        <Button onClick={onAddNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar novo
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar..."
            className="pl-9"
          />
        </div>
        <div className="inline-flex rounded-md border border-border overflow-hidden">
          <button
            onClick={() => setFilter("active")}
            className={`px-3 py-1.5 text-sm ${
              filter === "active" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
            }`}
          >
            Ativos
          </button>
          <button
            onClick={() => setFilter("removed")}
            className={`px-3 py-1.5 text-sm ${
              filter === "removed" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
            }`}
          >
            Removidos
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Mostrar</span>
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="w-20 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Nome do canal</TableHead>
              <TableHead>appName</TableHead>
              <TableHead>Identificador</TableHead>
              <TableHead>Número</TableHead>
              <TableHead>Fluxo padrão</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead>Envio massivo</TableHead>
              <TableHead>Criado</TableHead>
              <TableHead>Atualizado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-6 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Nenhuma instância encontrada.
                </TableCell>
              </TableRow>
            ) : (
              paged.map((i) => {
                const meta = (i.provider_metadata || {}) as any;
                const settings = meta.settings || {};
                return (
                  <TableRow
                    key={i.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={onOpenInstance}
                  >
                    <TableCell>
                      {i.is_active ? (
                        <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 border">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Removido</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {i.instance_name || i.provider_type.toUpperCase()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{meta.app_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {i.instance_id || "—"}
                    </TableCell>
                    <TableCell>{i.connected_phone || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {meta.default_flow || "—"}
                    </TableCell>
                    <TableCell>{settings.allow_active ? "Sim" : "Não"}</TableCell>
                    <TableCell>{settings.allow_broadcast ? "Sim" : "Não"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {i.created_at ? format(new Date(i.created_at), "dd/MM/yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {i.updated_at ? format(new Date(i.updated_at), "dd/MM/yyyy") : "—"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          Mostrando de {total === 0 ? 0 : start + 1} até {Math.min(start + pageSize, total)} de {total} registros
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, k) => k + 1).slice(0, 5).map((n) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className={`h-8 w-8 rounded-md text-sm ${
                page === n ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
