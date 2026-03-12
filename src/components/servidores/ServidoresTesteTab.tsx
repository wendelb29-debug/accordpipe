import { useState, useEffect } from "react";
import {
  Search, Building2, Phone, Calendar, Clock, CheckCircle, XCircle, AlertTriangle,
  ArrowUpCircle, Lock, Unlock, Download, Eye, MoreHorizontal, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

interface TrialCompany {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  responsavel: string | null;
  telefone: string | null;
  email: string | null;
  status: string;
  is_trial: boolean;
  trial_start: string | null;
  trial_expires_at: string | null;
  trial_extensions: number;
  created_at: string;
}

function getTrialStatus(company: TrialCompany) {
  if (company.status === "active" && !company.is_trial) return { label: "Convertido", color: "blue", icon: CheckCircle };
  if (company.status === "expirado") return { label: "Expirado", color: "red", icon: XCircle };
  if (!company.trial_expires_at) return { label: "Ativo", color: "green", icon: CheckCircle };
  
  const now = new Date();
  const expires = new Date(company.trial_expires_at);
  const daysLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0) return { label: "Expirado", color: "red", icon: XCircle };
  if (daysLeft <= 3) return { label: `${daysLeft}d restante${daysLeft > 1 ? "s" : ""}`, color: "amber", icon: AlertTriangle };
  return { label: `${daysLeft}d restantes`, color: "green", icon: Clock };
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

export default function ServidoresTesteTab() {
  const [companies, setCompanies] = useState<TrialCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<TrialCompany | null>(null);
  const { toast } = useToast();

  const fetchTrialCompanies = async () => {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("is_trial", true)
      .is("servidor_id", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setCompanies((data as TrialCompany[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTrialCompanies(); }, []);

  const handleExtend = async (company: TrialCompany) => {
    if (company.trial_extensions >= 1) {
      toast({ title: "Limite atingido", description: "Já foi concedida uma prorrogação. Apenas plano pago.", variant: "destructive" });
      return;
    }
    const newExpires = new Date(new Date(company.trial_expires_at || Date.now()).getTime() + 7 * 24 * 60 * 60 * 1000);
    const { error } = await supabase
      .from("companies")
      .update({
        trial_expires_at: newExpires.toISOString(),
        trial_extensions: company.trial_extensions + 1,
        status: "teste",
      })
      .eq("id", company.id);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível prorrogar.", variant: "destructive" });
    } else {
      // Reactivate users
      await supabase.from("profiles").update({ is_active: true, status: "ativo" }).eq("company_id", company.id);
      toast({ title: "Prorrogado!", description: "+7 dias adicionados." });
      fetchTrialCompanies();
    }
  };

  const handleBlock = async (company: TrialCompany) => {
    const { error } = await supabase
      .from("companies")
      .update({ status: "expirado" })
      .eq("id", company.id);
    if (!error) {
      await supabase.from("profiles").update({ is_active: false, status: "bloqueado" }).eq("company_id", company.id);
      toast({ title: "Bloqueado", description: `${company.nome_fantasia || company.razao_social} foi bloqueado.` });
      fetchTrialCompanies();
    }
  };

  const handleUnblock = async (company: TrialCompany) => {
    const newExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const { error } = await supabase
      .from("companies")
      .update({ status: "teste", trial_expires_at: newExpires.toISOString() })
      .eq("id", company.id);
    if (!error) {
      await supabase.from("profiles").update({ is_active: true, status: "ativo" }).eq("company_id", company.id);
      toast({ title: "Desbloqueado", description: "Empresa reativada com +7 dias." });
      fetchTrialCompanies();
    }
  };

  const handleConvert = async (company: TrialCompany) => {
    const { error } = await supabase
      .from("companies")
      .update({ status: "active", is_trial: false, trial_expires_at: null })
      .eq("id", company.id);
    if (!error) {
      await supabase.from("profiles").update({ is_active: true, status: "ativo" }).eq("company_id", company.id);
      toast({ title: "Convertido!", description: `${company.nome_fantasia || company.razao_social} agora é um plano pago.` });
      fetchTrialCompanies();
    }
  };

  const handleExport = () => {
    const rows = companies.map((c) => {
      const status = getTrialStatus(c);
      const now = new Date();
      const expires = c.trial_expires_at ? new Date(c.trial_expires_at) : null;
      const daysLeft = expires ? Math.max(0, Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
      return {
        CNPJ: c.cnpj,
        "Razão Social": c.razao_social,
        "Nome Fantasia": c.nome_fantasia || "",
        Responsável: c.responsavel || "",
        Telefone: c.telefone || "",
        "Data Início": formatDate(c.trial_start),
        "Data Expiração": formatDate(c.trial_expires_at),
        Status: status.label,
        "Dias Restantes": daysLeft,
        Prorrogações: c.trial_extensions,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Servidores Teste");
    XLSX.writeFile(wb, "servidores-teste.xlsx");
  };

  const filtered = companies.filter(
    (c) =>
      c.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.nome_fantasia || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cnpj.includes(searchTerm) ||
      (c.responsavel || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusBadge = (company: TrialCompany) => {
    const s = getTrialStatus(company);
    const colorMap: Record<string, string> = {
      green: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400",
      amber: "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
      red: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400",
      blue: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
    };
    const Icon = s.icon;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${colorMap[s.color]}`}>
        <Icon className="h-3 w-3" />
        {s.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Servidores em Teste</h2>
          <p className="text-sm text-muted-foreground">Gerencie empresas em período de avaliação gratuita</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Exportar Excel
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nome, CNPJ ou responsável..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", count: companies.length, color: "primary" },
          { label: "Ativos", count: companies.filter(c => c.status === "teste").length, color: "green-500" },
          { label: "Próx. Vencer", count: companies.filter(c => { const s = getTrialStatus(c); return s.color === "amber"; }).length, color: "amber-500" },
          { label: "Expirados", count: companies.filter(c => c.status === "expirado").length, color: "red-500" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-2xl font-bold text-foreground">{s.count}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Expiração</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhum servidor em teste encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((company) => (
                <TableRow key={company.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                        <Building2 className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{company.nome_fantasia || company.razao_social}</p>
                        <p className="text-xs text-muted-foreground font-mono">{company.cnpj}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{company.responsavel || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      {company.telefone || "—"}
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(company.trial_start)}</TableCell>
                  <TableCell>{formatDate(company.trial_expires_at)}</TableCell>
                  <TableCell>{statusBadge(company)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2" onClick={() => { setSelectedCompany(company); setDetailOpen(true); }}>
                          <Eye className="h-4 w-4" />
                          Ver Cadastro
                        </DropdownMenuItem>
                        {company.status !== "expirado" && company.is_trial && (
                          <DropdownMenuItem className="gap-2 text-green-600" onClick={() => handleExtend(company)}>
                            <ArrowUpCircle className="h-4 w-4" />
                            Liberar +7 dias {company.trial_extensions >= 1 && "(limite)"}
                          </DropdownMenuItem>
                        )}
                        {company.status === "expirado" ? (
                          <DropdownMenuItem className="gap-2 text-blue-600" onClick={() => handleUnblock(company)}>
                            <Unlock className="h-4 w-4" />
                            Desbloquear
                          </DropdownMenuItem>
                        ) : company.is_trial && (
                          <DropdownMenuItem className="gap-2 text-red-600" onClick={() => handleBlock(company)}>
                            <Lock className="h-4 w-4" />
                            Bloquear
                          </DropdownMenuItem>
                        )}
                        {company.is_trial && (
                          <DropdownMenuItem className="gap-2 text-blue-600" onClick={() => handleConvert(company)}>
                            <CheckCircle className="h-4 w-4" />
                            Converter em Plano Pago
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastro Completo</DialogTitle>
            <DialogDescription>{selectedCompany?.nome_fantasia || selectedCompany?.razao_social}</DialogDescription>
          </DialogHeader>
          {selectedCompany && (
            <div className="space-y-3 text-sm">
              {[
                ["CNPJ", selectedCompany.cnpj],
                ["Razão Social", selectedCompany.razao_social],
                ["Nome Fantasia", selectedCompany.nome_fantasia || "—"],
                ["Responsável", selectedCompany.responsavel || "—"],
                ["Telefone", selectedCompany.telefone || "—"],
                ["E-mail", selectedCompany.email || "—"],
                ["Data Cadastro", formatDate(selectedCompany.created_at)],
                ["Início Teste", formatDate(selectedCompany.trial_start)],
                ["Expiração", formatDate(selectedCompany.trial_expires_at)],
                ["Prorrogações", `${selectedCompany.trial_extensions}/1`],
                ["Status", getTrialStatus(selectedCompany).label],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground">{value}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
