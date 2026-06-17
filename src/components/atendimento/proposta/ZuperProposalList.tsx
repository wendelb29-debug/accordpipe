import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Eye, Edit, CopyPlus, Trash2, Loader2, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ProposalRecord } from "./types";
import { fmtCur, fmtDate, STATUS_LABEL } from "./utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

interface Props {
  leadId: string;
  servidorId: string;
  onNew: () => void;
  onOpen: (p: ProposalRecord) => void;
  refreshKey?: number;
}

export function ZuperProposalList({ leadId, servidorId, onNew, onOpen, refreshKey }: Props) {
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState<ProposalRecord[]>([]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("proposals")
      .select("*").eq("lead_id", leadId).eq("servidor_id", servidorId)
      .order("created_at", { ascending: false });
    setProposals((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [leadId, servidorId, refreshKey]);

  const activeProps = proposals.filter(p => p.status === "aberta" || p.status === "aprovada");
  const psItemsCount = activeProps.reduce((s, p) => s + ((p.totals as any)?.ps_total > 0 ? 1 : 0), 0);
  const mrrItemsCount = activeProps.reduce((s, p) => s + ((p.totals as any)?.mrr_monthly > 0 ? 1 : 0), 0);
  const psSum = activeProps.reduce((s, p) => s + ((p.totals as any)?.ps_total || 0), 0);
  const mrrSum = activeProps.reduce((s, p) => s + ((p.totals as any)?.mrr_monthly || 0), 0);

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir proposta?")) return;
    const { error } = await supabase.from("proposals").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Proposta excluída");
    load();
  };

  const handleDuplicate = async (p: ProposalRecord) => {
    const { data: items } = await supabase.from("proposal_line_items").select("*").eq("proposal_id", p.id);
    const { id, created_at, control_code, public_token, public_accepted_at, ...rest } = p as any;
    const { data: created, error } = await supabase.from("proposals").insert({
      ...rest,
      version: (p.version || 1) + 1,
      control_code: null,
      public_token: null,
      public_accepted_at: null,
      status: "aberta",
    }).select().single();
    if (error || !created) { toast.error("Erro ao duplicar"); return; }
    if (items && items.length > 0) {
      await supabase.from("proposal_line_items").insert(
        items.map((it: any) => ({ ...it, id: undefined, proposal_id: (created as any).id }))
      );
    }
    toast.success("Proposta duplicada");
    load();
  };

  const copyPublicLink = (token: string | null) => {
    if (!token) { toast.error("Proposta sem link público"); return; }
    navigator.clipboard.writeText(`${window.location.origin}/p/proposta/${token}`);
    toast.success("Link copiado!");
  };

  return (
    <div className="space-y-4">
      {/* Totalizadores */}
      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">P&amp;S</p>
          <p className="text-sm font-semibold">{psItemsCount} {psItemsCount === 1 ? "proposta" : "propostas"} • {fmtCur(psSum)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">MRR</p>
          <p className="text-sm font-semibold">{mrrItemsCount} {mrrItemsCount === 1 ? "proposta" : "propostas"} • {fmtCur(mrrSum)}/mês</p>
        </CardContent></Card>
      </div>
      <p className="text-[11px] text-muted-foreground italic">Valores consideram apenas propostas abertas e aprovadas.</p>

      {/* Header + ações */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Propostas</p>
        <Button size="sm" className="gap-1" onClick={onNew}>
          <Plus className="h-4 w-4" /> Nova Proposta
        </Button>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : proposals.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          Nenhuma proposta ainda. Clique em "Nova Proposta".
        </CardContent></Card>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Sigla</th>
                <th className="text-left p-2">Título</th>
                <th className="text-left p-2">Data</th>
                <th className="text-left p-2">Validade</th>
                <th className="text-left p-2">Dono</th>
                <th className="text-right p-2">P&amp;S</th>
                <th className="text-right p-2">MRR/mês</th>
                <th className="p-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {proposals.map(p => {
                const s = STATUS_LABEL[p.status] || STATUS_LABEL.aberta;
                const t = (p.totals as any) || {};
                return (
                  <tr key={p.id} className="border-t border-border hover:bg-muted/20">
                    <td className="p-2"><Badge className={s.color + " font-normal"}>{s.label}</Badge></td>
                    <td className="p-2 font-mono">{p.control_code || "—"}</td>
                    <td className="p-2">{p.titulo} {p.version > 1 && <span className="text-muted-foreground">v{p.version}</span>}</td>
                    <td className="p-2">{fmtDate(p.created_date)}</td>
                    <td className="p-2">{p.validity_days}d</td>
                    <td className="p-2">{p.created_by_name || "—"}</td>
                    <td className="p-2 text-right">{fmtCur(t.ps_total || 0)}</td>
                    <td className="p-2 text-right">{fmtCur(t.mrr_monthly || 0)}</td>
                    <td className="p-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-3.5 w-3.5" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onOpen(p)}><Edit className="h-3.5 w-3.5 mr-2" /> Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => window.open(`/p/proposta/${p.public_token}`, "_blank")} disabled={!p.public_token}>
                            <Eye className="h-3.5 w-3.5 mr-2" /> Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copyPublicLink(p.public_token)}><Link2 className="h-3.5 w-3.5 mr-2" /> Copiar link</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(p)}><CopyPlus className="h-3.5 w-3.5 mr-2" /> Duplicar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(p.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
