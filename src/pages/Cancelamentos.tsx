import { useState } from "react";
import {
  Search,
  XCircle,
  FileX,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Send,
  Eye,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Cancellation {
  id: string;
  company: string;
  cnpj: string;
  type: "desistencia" | "quebra_contrato" | "fim_fidelizacao";
  reason: string;
  projectStartDate: string;
  cancellationDate: string;
  signatureStatus: "pending" | "signed";
}

const mockCancellations: Cancellation[] = [];

const typeLabels = {
  desistencia: "Desistência",
  quebra_contrato: "Quebra de Contrato",
  fim_fidelizacao: "Fim de Fidelização",
};

const typeColors = {
  desistencia: "bg-amber-100 text-amber-800 border-amber-200",
  quebra_contrato: "bg-red-100 text-red-800 border-red-200",
  fim_fidelizacao: "bg-blue-100 text-blue-800 border-blue-200",
};

export default function Cancelamentos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredCancellations = mockCancellations.filter(
    (cancellation) =>
      cancellation.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cancellation.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cancellation.cnpj.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cancelamentos</h1>
          <p className="text-muted-foreground">
            Gestão de distratos e cancelamentos de contratos
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" className="gap-2">
              <XCircle className="h-4 w-4" />
              Novo Cancelamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Efetuar Cancelamento
              </DialogTitle>
              <DialogDescription>
                Preencha os dados para gerar o termo de distrato
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="empresa">Empresa</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma empresa cadastrada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tipo">Tipo de Cancelamento</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desistencia">Desistência</SelectItem>
                    <SelectItem value="quebra_contrato">
                      Quebra de Contrato
                    </SelectItem>
                    <SelectItem value="fim_fidelizacao">
                      Fim de Fidelização
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="motivo">Motivo</Label>
                <Textarea
                  id="motivo"
                  placeholder="Descreva o motivo do cancelamento..."
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Data Início do Projeto</Label>
                  <Input type="date" disabled value="2023-06-15" />
                  <p className="text-xs text-muted-foreground">
                    Preenchido automaticamente
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label>Data do Distrato</Label>
                  <Input
                    type="date"
                    disabled
                    value={new Date().toISOString().split("T")[0]}
                  />
                  <p className="text-xs text-muted-foreground">Data atual</p>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tipoAssinatura">Tipo de Assinatura</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="govbr">Gov.br</SelectItem>
                    <SelectItem value="manual">Manual Autenticada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => setDialogOpen(false)}
                className="gap-2"
              >
                <FileX className="h-4 w-4" />
                Gerar Distrato
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-status-open/30 bg-status-open/10 p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-status-open" />
            <div>
              <p className="text-sm font-medium text-status-open">
                Aguardando Assinatura
              </p>
              <p className="text-2xl font-bold text-foreground">
                {
                  mockCancellations.filter((c) => c.signatureStatus === "pending")
                    .length
                }
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-status-paid/30 bg-status-paid/10 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-status-paid" />
            <div>
              <p className="text-sm font-medium text-status-paid">Finalizados</p>
              <p className="text-2xl font-bold text-foreground">
                {
                  mockCancellations.filter((c) => c.signatureStatus === "signed")
                    .length
                }
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-muted-foreground/30 bg-muted/50 p-4">
          <div className="flex items-center gap-3">
            <XCircle className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total de Cancelamentos
              </p>
              <p className="text-2xl font-bold text-foreground">
                {mockCancellations.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por empresa ou código..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-card animate-fade-in">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCancellations.map((cancellation) => (
              <TableRow key={cancellation.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10">
                      <FileX className="h-4 w-4 text-destructive" />
                    </div>
                    <span className="font-mono text-sm font-medium">
                      {cancellation.id}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{cancellation.company}</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {cancellation.cnpj}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn("border", typeColors[cancellation.type])}
                  >
                    {typeLabels[cancellation.type]}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <p className="truncate text-sm text-muted-foreground">
                    {cancellation.reason}
                  </p>
                </TableCell>
                <TableCell>
                  {new Date(cancellation.cancellationDate).toLocaleDateString(
                    "pt-BR"
                  )}
                </TableCell>
                <TableCell>
                  {cancellation.signatureStatus === "pending" ? (
                    <div className="inline-flex items-center gap-2 rounded-full border border-status-open/30 bg-status-open/10 px-3 py-1 text-sm font-medium text-status-open">
                      <Clock className="h-4 w-4" />
                      Aguardando
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-full border border-status-paid/30 bg-status-paid/10 px-3 py-1 text-sm font-medium text-status-paid">
                      <CheckCircle2 className="h-4 w-4" />
                      Assinado
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                    {cancellation.signatureStatus === "pending" && (
                      <Button variant="ghost" size="icon">
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
