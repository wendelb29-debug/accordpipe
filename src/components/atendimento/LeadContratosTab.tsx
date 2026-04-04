import { useState, useEffect, useRef, useCallback } from "react";
import {
  FileSignature, Plus, Eye, Download, Copy, Camera, MapPin, User, X,
  Clock, CheckCircle2, AlertCircle, Loader2, Search, UserPlus, Link2, Mail,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { downloadContractPdf } from "@/lib/generateContractPdf";
import { downloadSignedContractPdf } from "@/lib/generateSignedContractPdf";
import { useContracts } from "@/hooks/useContracts";
import { useCompanies } from "@/hooks/useCompanies";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CrmLead } from "@/hooks/useCrmLeads";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
  pending: { label: "Aguardando", icon: Clock, className: "bg-amber-100 text-amber-700 border-amber-300" },
  signed: { label: "Assinado", icon: CheckCircle2, className: "bg-green-100 text-green-700 border-green-300" },
  expired: { label: "Expirado", icon: AlertCircle, className: "bg-red-100 text-red-700 border-red-300" },
};

const roleLabels: Record<string, string> = {
  matriz: "Matriz",
  revendedor: "Revendedor",
  colaborador: "Colaborador",
  vendedor: "Vendedor",
  testemunha: "Testemunha",
  signatario: "Signatário",
};

interface ContractSigner {
  id: string;
  contract_id: string;
  signer_role: string;
  signing_token: string | null;
  signed_at: string | null;
  signer_name: string | null;
  signer_document: string | null;
  signature_photo_url: string | null;
  signature_address: string | null;
  signature_latitude: number | null;
  signature_longitude: number | null;
}

interface LeadContratosTabProps {
  lead: CrmLead;
  addActivity: (data: any) => Promise<any>;
}

export function LeadContratosTab({ lead, addActivity }: LeadContratosTabProps) {
  const { profile } = useAuth();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Create contract dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [foro, setForo] = useState("");
  const [signatureType, setSignatureType] = useState("govbr");
  const [linkValidity, setLinkValidity] = useState("7");
  const [generating, setGenerating] = useState(false);

  // View contract dialog
  const [viewContract, setViewContract] = useState<any | null>(null);
  const [contractSigners, setContractSigners] = useState<ContractSigner[]>([]);
  const [loadingSigners, setLoadingSigners] = useState(false);

  // Add signer dialog
  const [addSignerOpen, setAddSignerOpen] = useState(false);
  const [newSignerName, setNewSignerName] = useState("");
  const [newSignerEmail, setNewSignerEmail] = useState("");
  const [newSignerDocument, setNewSignerDocument] = useState("");
  const [newSignerRole, setNewSignerRole] = useState("signatario");
  const [addingNewSigner, setAddingNewSigner] = useState(false);

  // Sign contract dialog
  const [signContract, setSignContract] = useState<any | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [signing, setSigning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { createContract: createContractFn, signContract: signContractFn } = useContracts();

  const fetchContractSigners = async (contractId: string) => {
    setLoadingSigners(true);
    const { data, error } = await supabase
      .from("contract_signatures")
      .select("*")
      .eq("contract_id", contractId)
      .order("created_at", { ascending: true });
    if (!error) setContractSigners((data as ContractSigner[]) || []);
    setLoadingSigners(false);
  };

  const handleViewContract = (contract: any) => {
    setViewContract(contract);
    fetchContractSigners(contract.id);
  };

  const handleAddSigner = async () => {
    if (!viewContract || !newSignerName.trim()) {
      toast.error("Preencha ao menos o nome do signatário");
      return;
    }
    setAddingNewSigner(true);
    try {
      const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      const { error } = await supabase.from("contract_signatures").insert({
        contract_id: viewContract.id,
        signer_role: newSignerRole,
        signing_token: token,
        signer_name: newSignerName.trim(),
        signer_document: newSignerDocument.trim() || null,
      } as any);
      if (error) throw error;
      toast.success("Signatário adicionado com sucesso!");
      setNewSignerName("");
      setNewSignerEmail("");
      setNewSignerDocument("");
      setNewSignerRole("signatario");
      setAddSignerOpen(false);
      await fetchContractSigners(viewContract.id);
    } catch (err: any) {
      toast.error("Erro ao adicionar signatário: " + (err.message || ""));
    }
    setAddingNewSigner(false);
  };

  const getSigningLink = (token: string | null) => {
    if (!token) return "";
    return `${window.location.origin}/assinar/${token}`;
  };

  const handleCopySignerLink = (token: string | null, name: string | null) => {
    if (!token) return;
    const link = getSigningLink(token);
    navigator.clipboard.writeText(link);
    toast.success(`Link de assinatura copiado para ${name || "signatário"}!`);
  };

  const fetchContracts = async () => {
    if (!lead.company_id) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("contracts")
      .select("*, companies(razao_social, nome_fantasia, cnpj, responsavel, endereco, numero, bairro, cidade, estado, cep)")
      .eq("company_id", lead.company_id)
      .order("created_at", { ascending: false });
    if (!error) setContracts((data || []).map((c: any) => ({ ...c, company: c.companies })));
    setLoading(false);
  };

  useEffect(() => { fetchContracts(); }, [lead.company_id]);

  const filteredContracts = contracts.filter(
    (c) => c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.company?.razao_social || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const handleGenerate = async () => {
    if (!lead.company_id) { toast.error("Lead sem empresa vinculada"); return; }
    setGenerating(true);
    const result = await createContractFn(lead.company_id, foro, "Save Car Brasil Tecnologia e Serviços Ltda", signatureType, parseInt(linkValidity) || 7);
    if (result) {
      downloadContractPdf(result);
      await addActivity({ type: "signature", title: "Contrato gerado", description: `Novo contrato gerado para ${lead.company_name}` });
      await fetchContracts();
      setCreateOpen(false);
      setForo("");
    }
    setGenerating(false);
  };

  const handleSign = async () => {
    if (!signContract || !photoBlob || !location) {
      toast.error("Tire a foto e permita a localização antes de assinar");
      return;
    }
    setSigning(true);
    const success = await signContractFn(
      signContract.id, photoBlob, location,
      signContract.company?.responsavel || "", signContract.company?.cnpj || ""
    );
    if (success) {
      await addActivity({ type: "signature", title: `Contrato ${signContract.code} assinado`, description: "Contrato assinado internamente." });
      await fetchContracts();
      resetSigningState();
    }
    setSigning(false);
  };

  const handleCopyLink = (link: string, code: string) => {
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
    addActivity({ type: "signature_link", title: `Link copiado: ${code}`, description: `Link do contrato ${code} copiado.` });
  };

  const handleDownloadPdf = async (contract: any) => {
    if (!contract.contract_content) { toast.error("Conteúdo não disponível"); return; }

    if (contract.signature_status === "signed" && contract.document_hash) {
      // Fetch signers and generate signed PDF with proof
      const { data: sigs } = await supabase
        .from("contract_signatures")
        .select("*")
        .eq("contract_id", contract.id)
        .order("created_at", { ascending: true });

      const signers = (sigs || []).map((s: any) => ({
        name: s.signer_name || "—",
        role: s.signer_role || "signatário",
        email: null,
        document: s.signer_document,
        signed_at: s.signed_at,
        ip: s.signer_ip,
        signature_hash: s.signer_ip ? undefined : undefined, // hash generated at sign time
      }));

      const validationUrl = `${window.location.origin}/validar-documento/${contract.validation_code || ""}`;

      downloadSignedContractPdf({
        content: contract.contract_content,
        code: contract.code,
        companyName: contract.company?.razao_social || lead.company_name,
        documentHash: contract.document_hash || "",
        validationCode: contract.validation_code || "",
        signedAt: contract.signed_at || new Date().toISOString(),
        signers,
        history: [
          { timestamp: contract.created_at, user: "Sistema", action: "gerou o documento." },
          ...(contract.signed_at ? [{ timestamp: contract.signed_at, user: signers[0]?.name || "Signatário", action: "assinou o documento." }] : []),
        ],
        validationUrl,
        companyEmitter: "Save Car Brasil Tecnologia e Serviços Ltda",
      });
    } else {
      downloadContractPdf({ content: contract.contract_content, code: contract.code, companyName: contract.company?.razao_social || lead.company_name });
    }

    addActivity({ type: "pdf_download", title: `PDF ${contract.code} baixado`, description: `Download do PDF do contrato ${contract.code}.` });
  };

  const pendingCount = contracts.filter((c) => c.signature_status === "pending").length;
  const signedCount = contracts.filter((c) => c.signature_status === "signed").length;

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!lead.company_id) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileSignature className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Lead sem empresa vinculada</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <FileSignature className="h-4 w-4" /> Contratos
        </h3>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> Novo Contrato
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-amber-300/30 bg-amber-50/50 dark:bg-amber-950/20 p-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-600" />
          <div>
            <p className="text-[10px] text-muted-foreground">Pendentes</p>
            <p className="text-lg font-bold text-foreground">{pendingCount}</p>
          </div>
        </div>
        <div className="rounded-lg border border-green-300/30 bg-green-50/50 dark:bg-green-950/20 p-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <div>
            <p className="text-[10px] text-muted-foreground">Assinados</p>
            <p className="text-lg font-bold text-foreground">{signedCount}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      {contracts.length > 3 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="h-8 text-xs pl-8" placeholder="Buscar contratos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      )}

      {/* Contracts table */}
      {contracts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileSignature className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum contrato encontrado</p>
          <p className="text-xs mt-1">Clique em "Novo Contrato" para gerar</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-2.5 font-medium text-muted-foreground">Status</th>
                <th className="text-left p-2.5 font-medium text-muted-foreground">Código</th>
                <th className="text-left p-2.5 font-medium text-muted-foreground">Data</th>
                <th className="text-right p-2.5 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredContracts.map((c) => {
                const status = statusConfig[c.signature_status] || statusConfig.pending;
                const StatusIcon = status.icon;
                return (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-2.5">
                      <Badge variant="outline" className={cn("text-[10px]", status.className)}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {status.label}
                      </Badge>
                    </td>
                    <td className="p-2.5 font-medium text-foreground">{c.code}</td>
                    <td className="p-2.5 text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="p-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleViewContract(c)} title="Visualizar">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDownloadPdf(c)} title="Baixar PDF">
                          <Download className="h-3 w-3" />
                        </Button>
                        {c.signature_link && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyLink(c.signature_link, c.code)} title="Copiar link">
                            <Copy className="h-3 w-3" />
                          </Button>
                        )}
                        {c.signature_status === "pending" && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSignContract(c)} title="Assinar">
                            <FileSignature className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Contract Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gerar Contrato</DialogTitle>
            <DialogDescription>Contrato para {lead.company_name}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="text-xs">Foro (Comarca)</Label>
              <Input placeholder="Cidade/UF" value={foro} onChange={(e) => setForo(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Validade do Link (dias)</Label>
              <Input type="number" value={linkValidity} onChange={(e) => setLinkValidity(e.target.value)} min={1} max={30} />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Tipo de Assinatura</Label>
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
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleGenerate} disabled={generating} className="gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSignature className="h-4 w-4" />}
              Gerar Contrato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Contract Dialog */}
      <Dialog open={!!viewContract} onOpenChange={(open) => { if (!open) { setViewContract(null); setContractSigners([]); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Contrato {viewContract?.code}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans p-4">{viewContract?.contract_content || "Conteúdo não disponível"}</pre>

            {/* Signers / Envolvidos Section */}
            <Separator className="my-4" />
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" /> Envolvidos
                </h3>
                {viewContract?.signature_status === "pending" && (
                  <Button size="sm" variant="outline" onClick={() => setAddSignerOpen(true)} className="gap-1.5 text-xs">
                    <UserPlus className="h-3.5 w-3.5" /> Adicionar pessoa
                  </Button>
                )}
              </div>

              {loadingSigners ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : contractSigners.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum signatário encontrado</p>
              ) : (
                <div className="space-y-3">
                  {contractSigners.map((signer) => (
                    <Card key={signer.id} className={cn("p-4 border-l-4", signer.signed_at ? "border-l-green-500 bg-green-50/50 dark:bg-green-950/20" : "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20")}>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {signer.signed_at ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <Clock className="h-4 w-4 text-amber-600" />
                            )}
                            <span className="text-sm font-medium text-foreground">{signer.signer_name || "—"}</span>
                          </div>
                          <p className="text-xs text-muted-foreground ml-6">
                            {roleLabels[signer.signer_role] || signer.signer_role}
                          </p>
                          {signer.signer_document && (
                            <p className="text-xs font-mono text-muted-foreground ml-6">{signer.signer_document}</p>
                          )}
                          {signer.signed_at && (
                            <p className="text-xs text-muted-foreground ml-6">
                              Assinado em: {new Date(signer.signed_at).toLocaleString("pt-BR")}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {signer.signing_token && !signer.signed_at && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1.5 text-xs"
                              onClick={() => handleCopySignerLink(signer.signing_token, signer.signer_name)}
                            >
                              <Link2 className="h-3.5 w-3.5" /> Link para assinatura
                            </Button>
                          )}
                          {signer.signature_photo_url && (
                            <img src={signer.signature_photo_url} alt="Foto" className="h-8 w-8 rounded object-cover border" />
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Add Signer Dialog */}
      <Dialog open={addSignerOpen} onOpenChange={setAddSignerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Signatário</DialogTitle>
            <DialogDescription>Preencha os dados da pessoa que irá assinar o contrato</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="text-xs">Nome completo *</Label>
              <Input placeholder="Nome do signatário" value={newSignerName} onChange={(e) => setNewSignerName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">E-mail</Label>
              <Input type="email" placeholder="email@exemplo.com" value={newSignerEmail} onChange={(e) => setNewSignerEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">CPF/CNPJ</Label>
              <Input placeholder="000.000.000-00" value={newSignerDocument} onChange={(e) => setNewSignerDocument(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Papel</Label>
              <Select value={newSignerRole} onValueChange={setNewSignerRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="signatario">Signatário</SelectItem>
                  <SelectItem value="testemunha">Testemunha</SelectItem>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                  <SelectItem value="colaborador">Colaborador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSignerOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddSigner} disabled={addingNewSigner || !newSignerName.trim()} className="gap-2">
              {addingNewSigner ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign Contract Dialog */}
      <Dialog open={!!signContract} onOpenChange={(open) => { if (!open) resetSigningState(); }}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Assinar {signContract?.code}</DialogTitle>
            <DialogDescription>Tire uma foto e permita a localização</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh]">
            <div className="space-y-4 p-1">
              <Card className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold"><User className="h-4 w-4 text-primary" /> Responsável</div>
                <p className="text-sm text-muted-foreground">{signContract?.company?.responsavel || "-"}</p>
                <p className="text-sm font-mono text-muted-foreground">{signContract?.company?.cnpj || "-"}</p>
              </Card>
              <Card className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4 text-primary" /> Localização</div>
                {location ? (
                  <div>
                    <p className="text-sm text-muted-foreground">{location.address}</p>
                    <p className="text-xs font-mono text-muted-foreground">({location.lat.toFixed(6)}, {location.lng.toFixed(6)})</p>
                  </div>
                ) : <p className="text-sm text-muted-foreground">Será capturada ao abrir a câmera</p>}
              </Card>
              <Card className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold"><Camera className="h-4 w-4 text-primary" /> Foto</div>
                {cameraOpen && (
                  <div className="space-y-3">
                    <div className="rounded-lg overflow-hidden bg-muted"><video ref={videoRef} autoPlay playsInline muted className="w-full" /></div>
                    <div className="flex gap-2">
                      <Button onClick={capturePhoto} className="flex-1 gap-2"><Camera className="h-4 w-4" /> Tirar Foto</Button>
                      <Button variant="outline" size="icon" onClick={stopCamera}><X className="h-4 w-4" /></Button>
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
    </div>
  );
}
