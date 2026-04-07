import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Camera, CheckCircle2, MapPin, User, FileSignature, AlertCircle, X, Users } from "lucide-react";
import { toast } from "sonner";
import { generateContractPdf } from "@/lib/generateContractPdf";

const roleLabels: Record<string, string> = {
  matriz: "Representante da Matriz",
  revendedor: "Revendedor / Contratante",
  colaborador: "Colaborador",
};

interface SignatureInfo {
  signer_role: string;
  signer_name: string | null;
  signed_at: string | null;
  signature_photo_url: string | null;
  signature_address: string | null;
}

interface ContractData {
  id: string;
  code: string;
  contract_content: string | null;
  signature_status: string;
  signed_at: string | null;
  signer_role?: string;
  signer_signed_at?: string | null;
  signer_name?: string | null;
  signer_document?: string | null;
  signatures?: SignatureInfo[];
  company: {
    razao_social: string;
    nome_fantasia: string | null;
    cnpj: string;
    responsavel: string | null;
    endereco: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cidade: string | null;
    estado: string | null;
    cep: string | null;
    email: string | null;
    telefone: string | null;
  } | null;
}

function ContractPdfEmbed({ content, code, companyName }: { content: string; code: string; companyName: string }) {
  const pdfUrl = useMemo(() => {
    if (!content) return null;
    const blob = generateContractPdf({ content, code, companyName });
    return URL.createObjectURL(blob);
  }, [content, code, companyName]);

  useEffect(() => {
    return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); };
  }, [pdfUrl]);

  if (!pdfUrl) return <p className="text-sm text-muted-foreground">Conteúdo não disponível</p>;

  return <iframe src={pdfUrl} className="w-full h-[400px] rounded-md border" title="Contrato PDF" />;
}

export default function AssinarContrato() {
  const { token } = useParams<{ token: string }>();
  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [signerNameInput, setSignerNameInput] = useState("");
  const [signerDocInput, setSignerDocInput] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchContract();
    return () => { stopCamera(); if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [token]);

  const fetchContract = async () => {
    if (!token) { setError("Token inválido"); setLoading(false); return; }
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke("get-contract-by-token", {
        body: { token },
      });

      if (fnError || !data || data.error) {
        setError("Contrato não encontrado ou link inválido.");
        setLoading(false);
        return;
      }

      const contractData: ContractData = { ...data, company: data.companies };
      
      // Check if this specific signer already signed
      if (contractData.signer_signed_at) {
        setSigned(true);
      } else if (contractData.signature_status === "signed" && !contractData.signer_role) {
        setSigned(true);
      } else if (data.is_client_contract && contractData.signature_status === "assinado") {
        setSigned(true);
      }
      
      // Pre-fill signer info
      if (contractData.signer_name) setSignerNameInput(contractData.signer_name);
      if (contractData.signer_document) setSignerDocInput(contractData.signer_document);
      
      setContract(contractData);
    } catch {
      setError("Erro ao carregar contrato.");
    }
    setLoading(false);
  };

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocalização não suportada neste dispositivo");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const geo = await res.json();
          if (geo.display_name) address = geo.display_name;
        } catch { /* keep coordinates */ }
        setLocation({ lat: latitude, lng: longitude, address });
      },
      () => toast.error("Permita o acesso à localização para assinar"),
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
      // Auto-capture after 6 seconds
      let count = 6;
      setCountdown(count);
      countdownRef.current = setInterval(() => {
        count--;
        if (count <= 0) {
          clearInterval(countdownRef.current!);
          setCountdown(null);
          setTimeout(() => capturePhoto(), 100);
        } else {
          setCountdown(count);
        }
      }, 1000);
    } catch {
      toast.error("Permita o acesso à câmera para assinar");
    }
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
      if (blob) {
        setPhotoBlob(blob);
        setPhotoPreview(URL.createObjectURL(blob));
        stopCamera();
      }
    }, "image/jpeg", 0.85);
  };

  const handleSign = async () => {
    if (!contract || !photoBlob || !location || !token) {
      toast.error("Tire a foto e permita a localização antes de assinar");
      return;
    }
    setSigning(true);
    try {
      const formData = new FormData();
      formData.append("token", token);
      formData.append("photo", photoBlob, "signature.jpg");
      formData.append("latitude", location.lat.toString());
      formData.append("longitude", location.lng.toString());
      formData.append("address", location.address);
      formData.append("signer_name", signerNameInput);
      formData.append("signer_document", signerDocInput);

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/sign-contract`,
        { method: "POST", body: formData }
      );

      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || "Erro ao assinar");
      }

      setSigned(true);
      toast.success("Assinatura registrada com sucesso!");
    } catch (e: any) {
      toast.error("Erro ao assinar: " + (e.message || "tente novamente"));
    }
    setSigning(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-xl font-bold text-foreground">{error || "Contrato não encontrado"}</h1>
          <p className="text-muted-foreground">Verifique o link e tente novamente.</p>
        </Card>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Assinatura Registrada!</h1>
          <p className="text-muted-foreground">
            {contract.signer_role && (
              <span className="block mb-1">
                <Badge variant="secondary">{roleLabels[contract.signer_role] || contract.signer_role}</Badge>
              </span>
            )}
            O contrato <span className="font-mono font-semibold">{contract.code}</span> foi assinado com sucesso.
          </p>
          {/* Signatures status */}
          {contract.signatures && contract.signatures.length > 0 && (
            <div className="text-left space-y-2 pt-4 border-t">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2"><Users className="h-4 w-4" /> Status das Assinaturas</p>
              {contract.signatures.map((sig, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{roleLabels[sig.signer_role] || sig.signer_role}</span>
                  {sig.signed_at ? (
                    <Badge className="bg-status-paid/10 text-status-paid border-status-paid/30"><CheckCircle2 className="h-3 w-3 mr-1" /> Assinado</Badge>
                  ) : (
                    <Badge variant="outline">Pendente</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  const company = contract.company;
  const signerRole = contract.signer_role || "revendedor";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="text-center space-y-2">
          <FileSignature className="h-10 w-10 text-primary mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Assinatura de Contrato</h1>
          <p className="font-mono text-muted-foreground">{contract.code}</p>
          <Badge variant="secondary" className="text-sm">{roleLabels[signerRole] || signerRole}</Badge>
        </div>

        {/* Signatures progress */}
        {contract.signatures && contract.signatures.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
              <Users className="h-4 w-4 text-primary" /> Assinaturas do Contrato
            </div>
            <div className="space-y-2">
              {contract.signatures.map((sig, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-foreground">{roleLabels[sig.signer_role] || sig.signer_role}</span>
                    {sig.signer_name && <span className="text-muted-foreground ml-2">({sig.signer_name})</span>}
                  </div>
                  {sig.signed_at ? (
                    <Badge className="bg-status-paid/10 text-status-paid border-status-paid/30"><CheckCircle2 className="h-3 w-3 mr-1" /> Assinado</Badge>
                  ) : (
                    <Badge variant="outline">Pendente</Badge>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <User className="h-5 w-5 text-primary" />
            Dados Pessoais
          </div>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Razão Social:</span><span className="font-medium text-foreground">{company?.razao_social || "-"}</span></div>
            {company?.nome_fantasia && <div className="flex justify-between"><span className="text-muted-foreground">Nome Fantasia:</span><span className="font-medium text-foreground">{company.nome_fantasia}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">CNPJ:</span><span className="font-mono font-medium text-foreground">{company?.cnpj || "-"}</span></div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold text-foreground mb-3">Conteúdo do Contrato</h2>
          <ContractPdfEmbed content={contract.contract_content || ""} code={contract.code} companyName={company?.razao_social || ""} />
        </Card>


        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <MapPin className="h-5 w-5 text-primary" />
            Localização
          </div>
          {location ? (
            <div className="text-sm space-y-1">
              <p className="text-muted-foreground">{location.address}</p>
              <p className="font-mono text-xs text-muted-foreground">({location.lat.toFixed(6)}, {location.lng.toFixed(6)})</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">A localização será capturada ao abrir a câmera.</p>
          )}
        </Card>

        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Camera className="h-5 w-5 text-primary" />
            Foto do Signatário
          </div>

          {cameraOpen && (
            <div className="space-y-3">
              <div className="relative rounded-lg overflow-hidden bg-black">
                <video ref={videoRef} autoPlay playsInline muted className="w-full" />
                {countdown !== null && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <span className="text-5xl font-bold text-white bg-black/60 rounded-full w-20 h-20 flex items-center justify-center">
                      {countdown}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {countdown !== null ? `Foto será capturada em ${countdown}s...` : "Preparando..."}
              </p>
            </div>
          )}

          {photoPreview && !cameraOpen && (
            <div className="space-y-3">
              <img src={photoPreview} alt="Foto de assinatura" className="w-full max-w-sm mx-auto rounded-lg border" />
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

        <Button
          size="lg"
          className="w-full gap-2 text-lg py-6"
          disabled={!photoBlob || !location || signing}
          onClick={handleSign}
        >
          {signing ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileSignature className="h-5 w-5" />}
          Assinar
        </Button>

        {(!photoBlob || !location) && (
          <p className="text-center text-sm text-muted-foreground">
            {!photoBlob && !location
              ? "Tire uma foto e permita a localização para assinar"
              : !photoBlob
              ? "Tire uma foto para assinar"
              : "Permita a localização para assinar"}
          </p>
        )}
      </div>
    </div>
  );
}
