import { useState, useEffect, useRef, useCallback } from "react";
import {
  FileText, Download, Eye, Camera, CheckCircle2, XCircle,
  Loader2, Shield, Clock, MapPin, User, Mail, Phone,
  ArrowRight, ZoomIn, ZoomOut,
} from "lucide-react";
import { PdfAllPagesRenderer } from "@/components/contratos/PdfAllPagesRenderer";
import { supabase } from "@/integrations/supabase/client";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

const fmtDateTime = (d: string) => {
  const dt = new Date(d);
  return dt.toLocaleDateString("pt-BR") + " " + dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

const signerStatusLabels: Record<string, string> = {
  pending: "Aguardando assinatura",
  validation_started: "Validação iniciada",
  validated: "Pronto para assinar",
  signed: "Assinado",
  rejected: "Recusado",
};

const papelLabels: Record<string, string> = {
  proprietario_proposta: "Proprietário da Proposta",
  cliente: "Cliente",
  testemunha: "Testemunha",
  signatario: "Signatário",
};

type Step = "loading" | "error" | "preview" | "validate" | "sign" | "camera" | "done" | "rejected" | "already_signed";

interface SignerData {
  id: string;
  document_id: string;
  nome_completo: string;
  email: string | null;
  telefone: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  papel: string;
  obrigatorio: boolean;
  ordem: number;
  status: string;
  signed_at: string | null;
  rejected_at: string | null;
  selfie_url: string | null;
  location_text: string | null;
  auth_token: string;
}

interface DocumentData {
  id: string;
  nome: string;
  tipo: string;
  status: string;
  pdf_url: string | null;
  created_at: string;
}

interface AllSigner {
  id: string;
  nome_completo: string;
  papel: string;
  ordem: number;
  status: string;
  signed_at: string | null;
  rejected_at: string | null;
}

export default function AssinarDocumento() {
  const { token } = useParams<{ token: string }>();
  const [step, setStep] = useState<Step>("loading");
  const [signer, setSigner] = useState<SignerData | null>(null);
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [allSigners, setAllSigners] = useState<AllSigner[]>([]);

  // Validate step
  const [cpfInput, setCpfInput] = useState("");
  const [birthInput, setBirthInput] = useState("");
  const [validateError, setValidateError] = useState("");
  const [validating, setValidating] = useState(false);

  // Camera step
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");

  // Sign step
  const [signing, setSigning] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number; text: string } | null>(null);

  const loadData = useCallback(async () => {
    if (!token) return setStep("error");

    // Load signer
    const { data: signerData } = await supabase.rpc("get_document_signer_by_token", { p_token: token });
    if (!signerData || (signerData as any[]).length === 0) return setStep("error");
    const s = (signerData as any[])[0] as SignerData;
    setSigner(s);

    if (s.status === "signed") return setStep("already_signed");
    if (s.status === "rejected") return setStep("rejected");

    // Load document
    const { data: docData } = await supabase.rpc("get_document_by_signer_token", { p_token: token });
    if (docData && (docData as any[]).length > 0) setDocument((docData as any[])[0] as DocumentData);

    // Load all signers
    const { data: allData } = await supabase.rpc("get_document_signers_by_token", { p_token: token });
    setAllSigners((allData as AllSigner[]) || []);

    // Log view event
    await supabase.functions.invoke("sign-document", {
      body: { action: "view", token },
    });

    setStep("preview");
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Get location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, text: "" }),
        () => {}
      );
    }
  }, []);

  const handleValidate = async () => {
    if (!signer || !token) return;
    if (!cpfInput.trim()) return setValidateError("Informe o CPF");
    if (!birthInput) return setValidateError("Informe a data de nascimento");

    setValidating(true);
    setValidateError("");

    const { data, error } = await supabase.functions.invoke("sign-document", {
      body: { action: "validate", token, cpf: cpfInput.replace(/\D/g, ""), data_nascimento: birthInput },
    });

    setValidating(false);
    if (error || !data?.success) {
      setValidateError(data?.error || "Dados não conferem. Verifique e tente novamente.");
      return;
    }

    // Go directly to sign step (no code verification needed)
    setStep("sign");
  };

  const openCamera = async () => {
    setStep("camera");
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setCameraError("Não foi possível acessar a câmera");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = window.document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        setPhotoBlob(blob);
        setPhotoPreview(URL.createObjectURL(blob));
      }
    }, "image/jpeg", 0.8);
    // Stop camera
    streamRef.current?.getTracks().forEach((t) => t.stop());
  };

  const handleSign = async () => {
    if (!photoBlob || !token) return toast.error("Capture a foto primeiro");
    setSigning(true);

    // Upload selfie
    const fileName = `selfies/${token}_${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("signatures")
      .upload(fileName, photoBlob, { contentType: "image/jpeg" });

    let selfieUrl = "";
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from("signatures").getPublicUrl(fileName);
      selfieUrl = urlData.publicUrl;
    }

    const { data, error } = await supabase.functions.invoke("sign-document", {
      body: {
        action: "sign",
        token,
        selfie_url: selfieUrl,
        ip_address: "",
        user_agent: navigator.userAgent,
        location_lat: location?.lat,
        location_lng: location?.lng,
        location_text: location?.text || "",
      },
    });

    setSigning(false);
    if (error || !data?.success) {
      toast.error(data?.error || "Erro ao assinar");
      return;
    }
    setStep("done");
  };

  const handleReject = async () => {
    if (!token) return;
    setSigning(true);
    await supabase.functions.invoke("sign-document", {
      body: { action: "reject", token, reason: rejectReason },
    });
    setSigning(false);
    setStep("rejected");
  };

  // RENDER
  if (step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Carregando documento...</p>
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-lg font-semibold">Link inválido</h2>
            <p className="text-sm text-muted-foreground">Este link de assinatura não é válido ou já expirou.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "already_signed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <h2 className="text-lg font-semibold">Documento já assinado</h2>
            <p className="text-sm text-muted-foreground">
              Este documento já foi assinado por {signer?.nome_completo}.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <h2 className="text-lg font-semibold">Documento assinado com sucesso</h2>
            <p className="text-sm text-muted-foreground">
              A assinatura de {signer?.nome_completo} foi registrada com sucesso.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "rejected") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <XCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="text-lg font-semibold">Assinatura recusada</h2>
            <p className="text-sm text-muted-foreground">
              {signer?.nome_completo} recusou a assinatura deste documento.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Shield className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-sm font-semibold">Assinatura Eletrônica</h1>
            <p className="text-xs text-muted-foreground">Accord · Assinatura segura de documentos</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main area */}
        <div className="lg:col-span-2 space-y-4">
          {step === "preview" && (
            <>
              {document?.pdf_url && (
                <Card>
                  <CardContent className="p-0">
                    <div className="rounded-lg overflow-auto max-h-[70vh] sm:max-h-[600px] p-2">
                      <PdfAllPagesRenderer pdfUrl={document.pdf_url} scale={1.0} />
                    </div>
                  </CardContent>
                </Card>
              )}
              <div className="flex gap-2">
                {document?.pdf_url && (
                  <>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => window.open(document.pdf_url!, "_blank")}>
                      <Eye className="h-3.5 w-3.5" /> Ver completo
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" asChild>
                      <a href={document.pdf_url!} download><Download className="h-3.5 w-3.5" /> Baixar PDF</a>
                    </Button>
                  </>
                )}
              </div>
              <Button className="w-full gap-2" onClick={() => setStep("validate")}>
                <ArrowRight className="h-4 w-4" /> Iniciar processo de assinatura
              </Button>
            </>
          )}

          {step === "validate" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" /> Confirmar sua identidade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Para assinar este documento, confirme seus dados abaixo.
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs">CPF</Label>
                  <Input
                    value={cpfInput}
                    onChange={(e) => setCpfInput(e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Data de nascimento</Label>
                  <Input
                    type="date"
                    value={birthInput}
                    onChange={(e) => setBirthInput(e.target.value)}
                  />
                </div>
                {validateError && (
                  <p className="text-xs text-destructive">{validateError}</p>
                )}
                <Button className="w-full" onClick={handleValidate} disabled={validating}>
                  {validating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Continuar para assinatura
                </Button>
              </CardContent>
            </Card>
          )}

          {step === "sign" && !showReject && (
            <>
              {document?.pdf_url && (
                <Card>
                  <CardContent className="p-0">
                    <div className="rounded-lg overflow-auto max-h-[60vh] sm:max-h-[500px] p-2">
                      <PdfAllPagesRenderer pdfUrl={document.pdf_url} scale={1.0} />
                    </div>
                  </CardContent>
                </Card>
              )}
              <div className="flex gap-2">
                <Button variant="destructive" className="flex-1 gap-2" onClick={() => setShowReject(true)}>
                  <XCircle className="h-4 w-4" /> Rejeitar
                </Button>
                <Button className="flex-1 gap-2" onClick={openCamera}>
                  <Camera className="h-4 w-4" /> Assinar
                </Button>
              </div>
            </>
          )}

          {step === "sign" && showReject && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rejeitar assinatura</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Motivo (opcional)</Label>
                  <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Motivo da recusa..." />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowReject(false)}>Voltar</Button>
                  <Button variant="destructive" className="flex-1" onClick={handleReject} disabled={signing}>
                    {signing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Confirmar rejeição
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "camera" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Camera className="h-4 w-4 text-primary" /> Captura de foto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cameraError ? (
                  <p className="text-sm text-destructive">{cameraError}</p>
                ) : !photoPreview ? (
                  <>
                    <div className="rounded-lg overflow-hidden bg-black aspect-video">
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    </div>
                    <Button className="w-full gap-2" onClick={capturePhoto}>
                      <Camera className="h-4 w-4" /> Capturar foto
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="rounded-lg overflow-hidden aspect-video">
                      <img src={photoPreview} alt="Foto capturada" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => { setPhotoPreview(null); setPhotoBlob(null); openCamera(); }}>
                        Tirar outra
                      </Button>
                      <Button className="flex-1 gap-2" onClick={handleSign} disabled={signing}>
                        {signing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Confirmar assinatura
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Signer info */}
          {signer && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground font-medium">Dados do signatário</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{signer.nome_completo}</span>
                </div>
                {signer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs">{signer.email}</span>
                  </div>
                )}
                {signer.telefone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs">{signer.telefone}</span>
                  </div>
                )}
                {signer.cpf && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs">{signer.cpf}</span>
                  </div>
                )}
                <div>
                  <Badge variant="secondary" className="text-[10px]">{papelLabels[signer.papel] || signer.papel}</Badge>
                </div>
                <Separator />
                <div>
                  <span className="text-[10px] text-muted-foreground">Status</span>
                  <p className="text-xs font-medium">{signerStatusLabels[signer.status] || signer.status}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Document info */}
          {document && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground font-medium">Documento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs">
                <p className="font-medium text-sm">{document.nome}</p>
                <p className="text-muted-foreground">Tipo: {document.tipo}</p>
                <p className="text-muted-foreground">Gerado em: {fmtDateTime(document.created_at)}</p>
              </CardContent>
            </Card>
          )}

          {/* All signers */}
          {allSigners.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground font-medium">Signatários</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {allSigners.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-xs">
                    <div>
                      <p className="font-medium">{s.nome_completo}</p>
                      <p className="text-[10px] text-muted-foreground">{papelLabels[s.papel] || s.papel}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        s.status === "signed" && "text-green-600 border-green-200",
                        s.status === "rejected" && "text-red-600 border-red-200",
                        !["signed", "rejected"].includes(s.status) && "text-amber-600 border-amber-200"
                      )}
                    >
                      {signerStatusLabels[s.status] || s.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
