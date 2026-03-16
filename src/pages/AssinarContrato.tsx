import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Camera, CheckCircle2, MapPin, User, FileSignature, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";
import { generateContractPdf } from "@/lib/generateContractPdf";

interface ContractData {
  id: string;
  code: string;
  contract_content: string | null;
  signature_status: string;
  signed_at: string | null;
  signature_photo_url: string | null;
  company: {
    razao_social: string;
    nome_fantasia: string | null;
    cnpj: string;
    responsavel: string | null;
    endereco: string | null;
    numero: string | null;
    bairro: string | null;
    cidade: string | null;
    estado: string | null;
    cep: string | null;
  } | null;
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    fetchContract();
    return () => stopCamera();
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
      if (contractData.signature_status === "signed") setSigned(true);
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
      formData.append("signer_name", contract.company?.responsavel || "");
      formData.append("signer_document", contract.company?.cnpj || "");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/sign-contract`,
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || "Erro ao assinar");
      }

      setSigned(true);
      toast.success("Contrato assinado com sucesso!");
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
          <h1 className="text-2xl font-bold text-foreground">Contrato Assinado!</h1>
          <p className="text-muted-foreground">
            O contrato <span className="font-mono font-semibold">{contract.code}</span> foi assinado com sucesso.
          </p>
          {contract.signed_at && (
            <p className="text-sm text-muted-foreground">
              Assinado em: {new Date(contract.signed_at).toLocaleString("pt-BR")}
            </p>
          )}
        </Card>
      </div>
    );
  }

  const company = contract.company;
  const addressParts = [company?.endereco, company?.numero && `nº ${company.numero}`, company?.bairro, company?.cidade && company?.estado && `${company.cidade}/${company.estado}`, company?.cep && `CEP: ${company.cep}`].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="text-center space-y-2">
          <FileSignature className="h-10 w-10 text-primary mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Assinatura de Contrato</h1>
          <p className="font-mono text-muted-foreground">{contract.code}</p>
        </div>

        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <User className="h-5 w-5 text-primary" />
            Dados do Responsável
          </div>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Nome / Razão Social:</span><span className="font-medium text-foreground">{company?.razao_social || "-"}</span></div>
            {company?.nome_fantasia && <div className="flex justify-between"><span className="text-muted-foreground">Nome Fantasia:</span><span className="font-medium text-foreground">{company.nome_fantasia}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Responsável:</span><span className="font-medium text-foreground">{company?.responsavel || "-"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">CNPJ:</span><span className="font-mono font-medium text-foreground">{company?.cnpj || "-"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Endereço:</span><span className="font-medium text-foreground text-right max-w-[60%]">{addressParts || "-"}</span></div>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <MapPin className="h-5 w-5 text-primary" />
            Localização do Signatário
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

        <Card className="p-5">
          <h2 className="font-semibold text-foreground mb-3">Conteúdo do Contrato</h2>
          <ScrollArea className="max-h-[400px] border rounded-md p-4 bg-muted/30">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans text-foreground">{contract.contract_content || "Conteúdo não disponível"}</pre>
          </ScrollArea>
        </Card>

        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Camera className="h-5 w-5 text-primary" />
            Foto de Assinatura
          </div>

          {cameraOpen && (
            <div className="space-y-3">
              <div className="relative rounded-lg overflow-hidden bg-black">
                <video ref={videoRef} autoPlay playsInline muted className="w-full" />
              </div>
              <div className="flex gap-2">
                <Button onClick={capturePhoto} className="flex-1 gap-2">
                  <Camera className="h-4 w-4" /> Tirar Foto
                </Button>
                <Button variant="outline" onClick={stopCamera}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
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
          Assinar Contrato
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
