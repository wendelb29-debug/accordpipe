import { useState } from "react";
import { Plus, Search, Filter, Download, Receipt, ExternalLink, CreditCard, QrCode, FileText, ShoppingCart } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge, InvoiceStatus } from "@/components/ui/status-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Invoice {
  id: string;
  company: string;
  cnpj: string;
  value: number;
  dueDate: string;
  paymentDate?: string;
  status: InvoiceStatus;
}

const mockInvoices: Invoice[] = [];

const paymentOptions = [
  {
    id: "setup_parcelado",
    label: "Setup Parcelado",
    description: "Pagamento do setup em parcelas",
    url: "https://pay.kiwify.com.br/KS4HM79",
    icon: CreditCard,
  },
  {
    id: "setup_avista",
    label: "Setup à Vista",
    description: "Pagamento do setup em parcela única",
    url: "https://pay.kiwify.com.br/b3FuMuU",
    icon: QrCode,
  },
  {
    id: "mensalidade",
    label: "Mensalidade",
    description: "Pagamento da mensalidade recorrente",
    url: "https://pay.kiwify.com.br/khukauf",
    icon: FileText,
  },
  {
    id: "sales_page",
    label: "Sales Page",
    description: "Página de vendas do produto",
    url: "https://kiwify.app/LImBgN3",
    icon: ShoppingCart,
  },
  {
    id: "licenciamento_revenda",
    label: "Taxa de Licenciamento Revenda Zelo",
    description: "Pagamento da taxa de licenciamento",
    url: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=9c4a35be678540e0b7af92740166614c",
    icon: CreditCard,
  },
  {
    id: "mensalidade_mp",
    label: "Mensalidade",
    description: "Pagamento da mensalidade via Mercado Pago",
    url: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=913d217c2b5f4d77ae9026c95e66ff15",
    icon: FileText,
  },
];

export default function Boletos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredInvoices = mockInvoices.filter((invoice) => {
    const matchesSearch =
      invoice.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.cnpj.includes(searchTerm);

    const matchesStatus =
      statusFilter === "all" || invoice.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalValue = filteredInvoices.reduce((acc, inv) => acc + inv.value, 0);

  const handleSelectPayment = (url: string) => {
    window.open(url, "_blank");
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pagamentos</h1>
          <p className="text-muted-foreground">
            Controle e emissão de pagamentos
          </p>
        </div>
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Emitir Pagamento
        </Button>
      </div>

      {/* Payment Type Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Selecionar tipo de pagamento</DialogTitle>
            <DialogDescription>
              Escolha o tipo de pagamento para gerar o link
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {paymentOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleSelectPayment(option.url)}
                className="flex items-center gap-4 rounded-lg border border-border p-4 text-left transition-colors hover:bg-accent hover:border-primary/30 group"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <option.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{option.label}</p>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-status-paid/30 bg-status-paid/10 p-4">
          <p className="text-sm font-medium text-status-paid">Pagos</p>
          <p className="text-2xl font-bold text-foreground">
            {mockInvoices.filter((i) => i.status === "paid").length}
          </p>
        </div>
        <div className="rounded-lg border border-status-open/30 bg-status-open/10 p-4">
          <p className="text-sm font-medium text-status-open">Em Aberto</p>
          <p className="text-2xl font-bold text-foreground">
            {mockInvoices.filter((i) => i.status === "open").length}
          </p>
        </div>
        <div className="rounded-lg border border-status-overdue/30 bg-status-overdue/10 p-4">
          <p className="text-sm font-medium text-status-overdue">Atrasados</p>
          <p className="text-2xl font-bold text-foreground">
            {mockInvoices.filter((i) => i.status === "overdue").length}
          </p>
        </div>
        <div className="rounded-lg border border-status-cancelled/30 bg-status-cancelled/10 p-4">
          <p className="text-sm font-medium text-status-cancelled">Cancelados</p>
          <p className="text-2xl font-bold text-foreground">
            {mockInvoices.filter((i) => i.status === "cancelled").length}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por empresa ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="paid">Pagos</SelectItem>
            <SelectItem value="open">Em Aberto</SelectItem>
            <SelectItem value="overdue">Atrasados</SelectItem>
            <SelectItem value="cancelled">Cancelados</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-card animate-fade-in">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.map((invoice) => (
              <TableRow key={invoice.id} className="group cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Receipt className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-mono text-sm font-medium">
                      {invoice.id}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{invoice.company}</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {invoice.cnpj}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="font-semibold">
                  {invoice.value.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </TableCell>
                <TableCell>
                  {new Date(invoice.dueDate).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell>
                  {invoice.paymentDate
                    ? new Date(invoice.paymentDate).toLocaleDateString("pt-BR")
                    : "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={invoice.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <p className="text-sm text-muted-foreground">
            Exibindo {filteredInvoices.length} de {mockInvoices.length} pagamentos
          </p>
          <p className="text-sm font-medium">
            Total:{" "}
            <span className="text-foreground">
              {totalValue.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}