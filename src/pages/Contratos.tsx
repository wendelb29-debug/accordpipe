import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  Plus, Search, FileSignature, Eye, Clock, CheckCircle2, AlertCircle, Loader2, Copy, Camera, MapPin, User, X, Download, ShieldAlert, Building2, Users, Link2,
} from "lucide-react";
import { downloadContractPdf, generateContractPdf } from "@/lib/generateContractPdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useContracts, ContractRow } from "@/hooks/useContracts";
import { useCompanies } from "@/hooks/useCompanies";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

function ContractPdfViewer({ content, code, companyName }: { content: string; code: string; companyName: string }) {
  const pdfUrl = useMemo(() => {
    const blob = generateContractPdf({ content, code, companyName });
    return URL.createObjectURL(blob);
  }, [content, code, companyName]);

  useEffect(() => {
    return () => URL.revokeObjectURL(pdfUrl);
  }, [pdfUrl]);

  return (
    <iframe src={pdfUrl} className="w-full h-[65vh] rounded-md border" title="Visualização do contrato" />
  );
}

const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
  pending: {
    label: "Aguardando Assinatura",
    icon: Clock,
    className: "bg-status-open/10 text-status-open border-status-open/30",
  },
  signed: {
    label: "Contrato Assinado",
    icon: CheckCircle2,
    className: "bg-status-paid/10 text-status-paid border-status-paid/30",
  },
  expired: {
    label: "Expirado",
    icon: AlertCircle,
    className: "bg-status-overdue/10 text-status-overdue border-status-overdue/30",
  },
};

const roleLabels: Record<string, string> = {
  matriz: "Representante da Matriz",
  revendedor: "Revendedor / Contratante",
  colaborador: "Colaborador",
};

interface ContractSignature {
  id: string;
  contract_id: string;
  signer_role: string;
  signer_name: string | null;
  signer_document: string | null;
  signing_token: string | null;
  signed_at: string | null;
  signature_photo_url: string | null;
  signature_latitude: number | null;
  signature_longitude: number | null;
  signature_address: string | null;
}

export default function Contratos() {
  const { isMaster, isCeo, isAdmin } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCompanyId, setFilterCompanyId] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewContract, setViewContract] = useState<ContractRow | null>(null);
  const [signContract, setSignContract] = useState<ContractRow | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [foro, setForo] = useState("");
  const [signatureType, setSignatureType] = useState("govbr");
  const [linkValidity, setLinkValidity] = useState("7");
  const [generating, setGenerating] = useState(false);

  // Signatures state
  const [contractSignatures, setContractSignatures] = useState<Record<string, ContractSignature[]>>({});
  const [linksDialogContract, setLinksDialogContract] = useState<ContractRow | null>(null);

  // Camera / signing state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [signing, setSigning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { contracts, loading, createContract, signContract: signContractFn } = useContracts();
  const { companies } = useCompanies();

  // Fetch signatures for all contracts
  useEffect(() => {
    if (contracts.length === 0) return;
    const fetchSigs = async () => {
      const { data } = await (await import("@/integrations/supabase/client")).supabase
        .from("contract_signatures")
        .select("*")
        .in("contract_id", contracts.map(c => c.id));
      if (data) {
        const grouped: Record<string, ContractSignature[]> = {};
        (data as any[]).forEach(s => {
          if (!grouped[s.contract_id]) grouped[s.contract_id] = [];
          grouped[s.contract_id].push(s);
        });
        setContractSignatures(grouped);
      }
    };
    fetchSigs();
  }, [contracts]);

  // Camera functions
  const getLocation = useCallback(() => {
    if (!navigator.geolocation) { toast.error("Geolocalização não suportada"); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const geo = await res.json();
          if (geo.display_name) address = geo.display_name;
        } catch { /* keep coords */ }
        setLocation({ lat: latitude, lng: longitude, address });
      },
      () => toast.error("Permita o acesso à localização"),
      { enableHighAccuracy: true }
    );
  }, []);

  // Access control - only master, CEO, admin
  if (!isMaster && !isCeo && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
        <ShieldAlert className="h-16 w-16 mb-4 opacity-40" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Acesso Restrito</h2>
        <p className="text-sm">Apenas usuários Master, CEO ou Administrador podem acessar esta página.</p>
      </div>
    );
  }

  const filteredContracts = contracts.filter((c) => {
    const matchesSearch =
      (c.company?.razao_social || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.company?.cnpj || "").includes(searchTerm);
    const matchesCompany = filterCompanyId === "all" || c.company_id === filterCompanyId;
    return matchesSearch && matchesCompany;
  });

  const handleGenerate = async () => {
    if (!selectedCompanyId) { toast.error("Selecione uma empresa cadastrada"); return; }
    setGenerating(true);
    const result = await createContract(selectedCompanyId, foro, "Save Car Brasil Tecnologia e Serviços Ltda", signatureType, parseInt(linkValidity) || 7);
    setGenerating(false);
    if (result) {
      downloadContractPdf(result);
      setDialogOpen(false); setSelectedCompanyId(""); setForo("");
    }
  };

  const handleCopyLink = (sigToken: string, role: string) => {
    const link = `${window.location.origin}/assinar/${sigToken}`;
    navigator.clipboard.writeText(link);
    toast.success(`Link de ${roleLabels[role] || role} copiado!`);
  };


  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOpen(true);
      getLocation();
    } catch { toast.error("Permita o acesso à câmera"); }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) { setPhotoBlob(blob); setPhotoPreview(URL.createObjectURL(blob)); stopCamera(); }
    }, "image/jpeg", 0.85);
  };

  const resetSigningState = () => {
    stopCamera();
    setPhotoBlob(null);
    setPhotoPreview(null);
    setLocation(null);
    setSignContract(null);
  };

  const handleSign = async () => {
    if (!signContract || !photoBlob || !location) {
      toast.error("Tire a foto e permita a localização antes de assinar");
      return;
    }
    setSigning(true);
    const success = await signContractFn(
      signContract.id,
      photoBlob,
      location,
      signContract.company?.responsavel || "",
      signContract.company?.cnpj || ""
    );
    setSigning(false);
    if (success) resetSigningState();
  };

  const pendingCount = contracts.filter((c) => c.signature_status === "pending").length;
  const signedCount = contracts.filter((c) => c.signature_status === "signed").length;
  const expiredCount = contracts.filter((c) => c.signature_status === "expired").length;

  // Unique companies from contracts for filter
  const contractCompanies = Array.from(
    new Map(contracts.filter(c => c.company).map(c => [c.company_id, c.company!])).entries()
  ).map(([id, company]) => ({ id, name: company.nome_fantasia || company.razao_social }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contratos</h1>
          <p className="text-muted-foreground">Geração e assinatura digital de contratos</p>
        </div>
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Novo Contrato
        </Button>
      </div>

      {/* New Contract Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gerar Novo Contrato</DialogTitle>
            <DialogDescription>O contrato será gerado com os dados da empresa cadastrada</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Empresa (cadastrada)</Label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                <SelectContent>
                  {companies.length === 0 ? (
                    <SelectItem value="_none" disabled>Nenhuma empresa cadastrada</SelectItem>
                  ) : companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social} - {c.cnpj}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Foro (Comarca)</Label>
              <Input placeholder="Cidade/UF" value={foro} onChange={(e) => setForo(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Validade do Link (dias)</Label>
              <Input type="number" value={linkValidity} onChange={(e) => setLinkValidity(e.target.value)} min={1} max={30} />
            </div>
            <div className="grid gap-2">
              <Label>Tipo de Assinatura</Label>
              <Select value={signatureType} onValueChange={setSignatureType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="govbr">Gov.br (Digital)</SelectItem>
                  <SelectItem value="manual">Manual Autenticada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleGenerate} disabled={generating} className="gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSignature className="h-4 w-4" />}
              Gerar Contrato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Contract Dialog */}
      <Dialog open={!!viewContract} onOpenChange={(open) => !open && setViewContract(null)}>
        <DialogContent className="max-w-4xl max-h-[95vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Contrato {viewContract?.code}
              {viewContract?.contract_content && (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto gap-1"
                  onClick={() => {
                    if (!viewContract.contract_content) return;
                    downloadContractPdf({ content: viewContract.contract_content, code: viewContract.code, companyName: viewContract.company?.razao_social || "" });
                  }}
                >
                  <Download className="h-4 w-4" /> Baixar PDF
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewContract?.contract_content ? (
            <ContractPdfViewer content={viewContract.contract_content} code={viewContract.code} companyName={viewContract.company?.razao_social || ""} />
          ) : (
            <p className="text-muted-foreground p-4">Conteúdo não disponível</p>
          )}

          {viewContract?.signature_status === "signed" && (
            <div className="border-t pt-4 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Dados da Assinatura
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Card className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <User className="h-4 w-4 text-primary" /> Signatário
                  </div>
                  <p className="text-sm text-muted-foreground">{viewContract.signer_name || viewContract.company?.responsavel || "-"}</p>
                  <p className="text-sm font-mono text-muted-foreground">{viewContract.signer_document || viewContract.company?.cnpj || "-"}</p>
                  {viewContract.signed_at && (
                    <p className="text-xs text-muted-foreground">Assinado em: {new Date(viewContract.signed_at).toLocaleString("pt-BR")}</p>
                  )}
                </Card>
                <Card className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <MapPin className="h-4 w-4 text-primary" /> Localização
                  </div>
                  <p className="text-sm text-muted-foreground">{viewContract.signature_address || "-"}</p>
                  {viewContract.signature_latitude && viewContract.signature_longitude && (
                    <p className="text-xs font-mono text-muted-foreground">
                      ({viewContract.signature_latitude.toFixed(6)}, {viewContract.signature_longitude.toFixed(6)})
                    </p>
                  )}
                </Card>
              </div>
              {viewContract.signature_photo_url && (
                <Card className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Camera className="h-4 w-4 text-primary" /> Foto de Assinatura
                  </div>
                  <img src={viewContract.signature_photo_url} alt="Foto de assinatura" className="max-w-xs rounded-lg border" />
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sign Contract Dialog */}
      <Dialog open={!!signContract} onOpenChange={(open) => { if (!open) resetSigningState(); }}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Assinar Contrato {signContract?.code}</DialogTitle>
            <DialogDescription>Tire uma foto e permita a localização para assinar</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh]">
            <div className="space-y-4 p-1">
              <Card className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <User className="h-4 w-4 text-primary" /> Responsável
                </div>
                <p className="text-sm text-muted-foreground">{signContract?.company?.responsavel || "-"}</p>
                <p className="text-sm font-mono text-muted-foreground">{signContract?.company?.cnpj || "-"}</p>
                <p className="text-sm text-muted-foreground">{signContract?.company?.razao_social}</p>
              </Card>

              <Card className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <MapPin className="h-4 w-4 text-primary" /> Localização
                </div>
                {location ? (
                  <div>
                    <p className="text-sm text-muted-foreground">{location.address}</p>
                    <p className="text-xs font-mono text-muted-foreground">({location.lat.toFixed(6)}, {location.lng.toFixed(6)})</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Será capturada ao abrir a câmera</p>
                )}
              </Card>

              <Card className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Camera className="h-4 w-4 text-primary" /> Foto de Assinatura
                </div>
                {cameraOpen && (
                  <div className="space-y-3">
                    <div className="rounded-lg overflow-hidden bg-muted">
                      <video ref={videoRef} autoPlay playsInline muted className="w-full" />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={capturePhoto} className="flex-1 gap-2">
                        <Camera className="h-4 w-4" /> Tirar Foto
                      </Button>
                      <Button variant="outline" size="icon" onClick={stopCamera}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {photoPreview && !cameraOpen && (
                  <div className="space-y-3">
                    <img src={photoPreview} alt="Foto" className="w-full max-w-xs mx-auto rounded-lg border" />
                    <Button variant="outline" onClick={() => { setPhotoBlob(null); setPhotoPreview(null); startCamera(); }} className="w-full gap-2">
                      <Camera className="h-4 w-4" /> Tirar Nova Foto
                    </Button>
                  </div>
                )}
                {!cameraOpen && !photoPreview && (
                  <Button variant="outline" onClick={startCamera} className="w-full gap-2">
                    <Camera className="h-4 w-4" /> Abrir Câmera
                  </Button>
                )}
              </Card>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={resetSigningState}>Cancelar</Button>
            <Button onClick={handleSign} disabled={!photoBlob || !location || signing} className="gap-2">
              {signing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSignature className="h-4 w-4" />}
              Assinar Contrato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-status-open/30 bg-status-open/10 p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-status-open" />
            <div>
              <p className="text-sm font-medium text-status-open">Aguardando Assinatura</p>
              <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-status-paid/30 bg-status-paid/10 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-status-paid" />
            <div>
              <p className="text-sm font-medium text-status-paid">Assinados</p>
              <p className="text-2xl font-bold text-foreground">{signedCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-status-overdue/30 bg-status-overdue/10 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-status-overdue" />
            <div>
              <p className="text-sm font-medium text-status-overdue">Expirados</p>
              <p className="text-2xl font-bold text-foreground">{expiredCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por empresa ou código..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterCompanyId} onValueChange={setFilterCompanyId}>
          <SelectTrigger className="w-[280px] gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Filtrar por empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as empresas</SelectItem>
            {contractCompanies.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-card animate-fade-in">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileSignature className="h-12 w-12 mb-4 opacity-50" />
            <p>Nenhum contrato encontrado</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContracts.map((contract) => {
                const config = statusConfig[contract.signature_status] || statusConfig.pending;
                const StatusIcon = config.icon;
                return (
                  <TableRow key={contract.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <FileSignature className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-mono text-sm font-medium">{contract.code}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{contract.company?.nome_fantasia || contract.company?.razao_social || "-"}</p>
                        <p className="text-sm text-muted-foreground font-mono">{contract.company?.cnpj || "-"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{contract.contract_type === "new" ? "Novo" : "Renovação"}</Badge>
                    </TableCell>
                    <TableCell>{new Date(contract.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium", config.className)}>
                        <StatusIcon className="h-4 w-4" />
                        {config.label}
                      </div>
                      {contract.signature_status === "signed" && contract.signed_at && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(contract.signed_at).toLocaleString("pt-BR")}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" title="Visualizar contrato" onClick={() => setViewContract(contract)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Baixar PDF"
                          onClick={() => {
                            if (!contract.contract_content) { toast.error("Conteúdo não disponível"); return; }
                            downloadContractPdf({ content: contract.contract_content, code: contract.code, companyName: contract.company?.razao_social || "" });
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {contract.signature_status === "pending" && (
                          <>
                            <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => setSignContract(contract)}>
                              <FileSignature className="h-4 w-4" />
                              Assinar
                            </Button>
                            {contract.signing_token && (
                              <Button variant="ghost" size="icon" title="Copiar link de assinatura" onClick={() => handleCopyLink(contract)}>
                                <Copy className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
