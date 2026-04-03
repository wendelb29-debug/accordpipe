import { useState } from "react";
import {
  Plus, Search, FileSignature, Eye, Clock, CheckCircle2, XCircle, Loader2, Filter, PenTool,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { usePdfContracts } from "@/hooks/usePdfContracts";
import { PdfContractCreateDialog } from "./PdfContractCreateDialog";
import { PdfContractViewDialog } from "./PdfContractViewDialog";
import { SignatureBuilderDialog } from "./SignatureBuilderDialog";
import type { PdfContract, PdfContractSigner, PdfContractHistory } from "@/hooks/usePdfContracts";

const statusConfig: Record<string, { label: string; icon: any; className: string; emoji: string }> = {
  pendente: { label: "Pendente", icon: Clock, className: "bg-yellow-100 text-yellow-800 border-yellow-300", emoji: "🟡" },
  assinado: { label: "Assinado", icon: CheckCircle2, className: "bg-green-100 text-green-800 border-green-300", emoji: "🟢" },
  cancelado: { label: "Cancelado", icon: XCircle, className: "bg-red-100 text-red-800 border-red-300", emoji: "🔴" },
};

export function PdfContractsList() {
  const { contracts, loading, canManage, fetchContracts, fetchSigners, fetchHistory, createContract, cancelContract } = usePdfContracts();
  const [createOpen, setCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // View
  const [viewContract, setViewContract] = useState<PdfContract | null>(null);
  const [viewSigners, setViewSigners] = useState<PdfContractSigner[]>([]);
  const [viewHistory, setViewHistory] = useState<PdfContractHistory[]>([]);

  // Builder
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderContract, setBuilderContract] = useState<PdfContract | null>(null);
  const [builderSigners, setBuilderSigners] = useState<PdfContractSigner[]>([]);

  const openView = async (contract: PdfContract) => {
    setViewContract(contract);
    const [signers, history] = await Promise.all([
      fetchSigners(contract.id),
      fetchHistory(contract.id),
    ]);
    setViewSigners(signers);
    setViewHistory(history);
  };

  const openBuilder = async (contract: PdfContract) => {
    const signers = await fetchSigners(contract.id);
    setBuilderContract(contract);
    setBuilderSigners(signers);
    setBuilderOpen(true);
  };

  const filtered = contracts.filter((c) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = c.name.toLowerCase().includes(term) || (c.created_by_name || "").toLowerCase().includes(term);
    const matchesStatus = filterStatus === "all" || c.status === filterStatus;
    const matchesDateFrom = !filterDateFrom || c.created_at >= filterDateFrom;
    const matchesDateTo = !filterDateTo || c.created_at <= filterDateTo + "T23:59:59";
    return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
  });

  const counts = {
    total: contracts.length,
    pendente: contracts.filter(c => c.status === "pendente").length,
    assinado: contracts.filter(c => c.status === "assinado").length,
    cancelado: contracts.filter(c => c.status === "cancelado").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Contratos PDF</h2>
          <p className="text-sm text-muted-foreground">Upload de documentos para assinatura digital</p>
        </div>
        {canManage && (
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Contrato
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-lg bg-primary/10"><FileSignature className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold text-foreground">{counts.total}</p><p className="text-xs text-muted-foreground">Total</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-lg bg-yellow-500/10"><Clock className="h-5 w-5 text-yellow-600" /></div>
            <div><p className="text-2xl font-bold text-foreground">{counts.pendente}</p><p className="text-xs text-muted-foreground">Pendentes</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
            <div><p className="text-2xl font-bold text-foreground">{counts.assinado}</p><p className="text-xs text-muted-foreground">Assinados</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-lg bg-red-500/10"><XCircle className="h-5 w-5 text-red-600" /></div>
            <div><p className="text-2xl font-bold text-foreground">{counts.cancelado}</p><p className="text-xs text-muted-foreground">Cancelados</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-foreground">
            <Filter className="h-4 w-4" /> Filtros
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pendente">🟡 Pendente</SelectItem>
                <SelectItem value="assinado">🟢 Assinado</SelectItem>
                <SelectItem value="cancelado">🔴 Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
            <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileSignature className="h-12 w-12 mb-4 opacity-50" />
            <p>Nenhum contrato encontrado</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Criado por</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((contract) => {
                const config = statusConfig[contract.status] || statusConfig.pendente;
                return (
                  <TableRow key={contract.id}>
                    <TableCell className="font-medium">{contract.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(contract.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-sm">{contract.created_by_name || "—"}</TableCell>
                    <TableCell>
                      <div className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium", config.className)}>
                        {config.emoji} {config.label}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {canManage && contract.status === "pendente" && (
                          <Button variant="ghost" size="icon" title="Editor de Campos" onClick={() => openBuilder(contract)}>
                            <PenTool className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" title="Visualizar" onClick={() => openView(contract)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Dialogs */}
      <PdfContractCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={async (name, desc, file, signers) => {
          const contractId = await createContract(name, desc, file, signers);
          if (contractId) {
            // Auto-open builder after creation
            const newContract = contracts.find(c => c.id === contractId);
            if (newContract) {
              setTimeout(() => openBuilder(newContract), 500);
            }
          }
        }}
      />

      <PdfContractViewDialog
        contract={viewContract}
        signers={viewSigners}
        history={viewHistory}
        onClose={() => setViewContract(null)}
        canManage={canManage}
        onCancel={async (id) => {
          await cancelContract(id);
          setViewContract(null);
        }}
      />

      {builderContract && (
        <SignatureBuilderDialog
          open={builderOpen}
          onOpenChange={setBuilderOpen}
          contractId={builderContract.id}
          pdfUrl={builderContract.pdf_url}
          signers={builderSigners}
          onComplete={() => {
            fetchContracts();
            setBuilderContract(null);
          }}
        />
      )}
    </div>
  );
}
