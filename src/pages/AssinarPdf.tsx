import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Camera, MapPin, CheckCircle, Loader2, FileSignature, AlertCircle, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { PdfSigningOverlay } from "@/components/contratos/PdfSigningOverlay";

interface SignerInfo {
  id: string;
  name: string;
  sign_order: number;
  status: string;
  signed_at: string | null;
}

export default function AssinarPdf() {
  const { token } = useParams<{ token: string }>();
  const [signer, setSigner] = useState<any>(null);
  const [contract, setContract] = useState<any>(null);
  const [allSigners, setAllSigners] = useState<SignerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const [signedFieldIds, setSignedFieldIds] = useState<string[]>([]);
  const [selectedField, setSelectedField] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) { setError("Token inválido"); setLoading(false); return; }
      
      const { data: signerData, error: signerErr } = await supabase
        .from("pdf_contract_signers")
        .select("*")
        .eq("signing_token", token)
        .single();

      if (signerErr || !signerData) {
        setError("Link de assinatura inválido ou expirado.");
        setLoading(false);
        return;
      }

      if (signerData.status === "assinado") {
        setSigner(signerData);
        setSigned(true);
        const { data: contractData } = await supabase
          .from("pdf_contracts")
          .select("*")
          .eq("id", signerData.contract_id)
          .single();
        if (contractData) setContract(contractData);
        const { data: signersList } = await supabase
          .from("pdf_contract_signers")
          .select("id, name, sign_order, status, signed_at")
          .eq("contract_id", signerData.contract_id)
          .order("sign_order", { ascending: true });
        setAllSigners((signersList as SignerInfo[]) || []);
        setLoading(false);
        return;
      }

      setSigner(signerData);

      const { data: contractData, error: contractErr } = await supabase
        .from("pdf_contracts")
        .select("*")
        .eq("id", signerData.contract_id)
        .single();

      if (contractErr || !contractData) {
        setError("Contrato não encontrado.");
        setLoading(false);
        return;
      }

      if (contractData.status === "cancelado") {
        setError("Este contrato foi cancelado.");
        setLoading(false);
        return;
      }

      setContract(contractData);

      const { data: signersList } = await supabase
        .from("pdf_contract_signers")
        .select("id, name, sign_order, status, signed_at")
        .eq("contract_id", signerData.contract_id)
        .order("sign_order", { ascending: true });
      
      const sigList = (signersList as SignerInfo[]) || [];
      setAllSigners(sigList);

      // Check signing order (only for sequential mode)
      if (contractData.sign_mode === "sequential") {
        const myOrder = signerData.sign_order || 0;
        const previousSigners = sigList.filter(s => s.sign_order < myOrder);
        const allPreviousSigned = previousSigners.every(s => s.status === "assinado");
        if (!allPreviousSigned && previousSigners.length > 0) {
          setBlocked(true);
        }
      }

      setLoading(false);
    };
    load();
  }, [token]);

  // Auto-capture geolocation
  useEffect(() => {
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        try {
          const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await resp.json();
          if (data?.display_name) address = data.display_name;
        } catch {}
        setLocation({ lat: latitude, lng: longitude, address });
        setLocationLoading(false);
      },
      () => {
        setLocation({ lat: 0, lng: 0, address: "Localização não disponível" });
        setLocationLoading(false);
      },
      { enableHighAccuracy: true }
    );
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        setPhoto(blob);
        setPhotoPreview(URL.createObjectURL(blob));
      }
    }, "image/jpeg", 0.8);
    const stream = videoRef.current.srcObject as MediaStream;
    stream?.getTracks().forEach(t => t.stop());
    setCameraActive(false);
    setCountdown(null);
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        let count = 5;
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
      }
    } catch {
      setError("Não foi possível acessar a câmera.");
    }
  };

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const getClientIp = async (): Promise<string> => {
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      return data.ip || "0.0.0.0";
    } catch { return "0.0.0.0"; }
  };

  const handleFieldClick = (field: any) => {
    setSelectedField(field);
    // Scroll to signing section
    document.getElementById("signing-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSign = async () => {
    if (!signer || !photo || !location) return;
    setSigning(true);
    try {
      const clientIp = await getClientIp();

      const fileName = `pdf_${signer.id}_${Date.now()}.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from("signatures")
        .upload(fileName, photo, { contentType: "image/jpeg" });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("signatures").getPublicUrl(fileName);

      const { error: updateErr } = await supabase
        .from("pdf_contract_signers")
        .update({
          status: "assinado",
          signed_at: new Date().toISOString(),
          signature_photo_url: urlData.publicUrl,
          signature_latitude: location.lat,
          signature_longitude: location.lng,
          signature_address: location.address,
          signer_ip: clientIp,
        } as any)
        .eq("id", signer.id);
      if (updateErr) throw updateErr;

      // Mark field as signed if selected
      if (selectedField) {
        setSignedFieldIds(prev => [...prev, selectedField.id]);
        await supabase.from("pdf_contract_fields")
          .update({ value: "signed" } as any)
          .eq("id", selectedField.id);
      }

      await supabase.from("pdf_contract_history").insert({
        contract_id: signer.contract_id,
        action: "assinado",
        description: `${signer.name} assinou o contrato em ${new Date().toLocaleString("pt-BR")}. Local: ${location.address}. IP: ${clientIp}`,
      } as any);

      // Check if all signers signed
      const { data: updatedSigners } = await supabase
        .from("pdf_contract_signers")
        .select("status")
        .eq("contract_id", signer.contract_id);

      if (updatedSigners && updatedSigners.every((s: any) => s.status === "assinado")) {
        const now = new Date().toISOString();
        const hashInput = `${signer.contract_id}|${now}|pdf_contract`;
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(hashInput));
        const documentHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
        const validationCode = crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();

        await supabase
          .from("pdf_contracts")
          .update({
            status: "assinado",
            document_hash: documentHash,
            validation_code: validationCode,
          } as any)
          .eq("id", signer.contract_id);

        await supabase.from("pdf_contract_history").insert({
          contract_id: signer.contract_id,
          action: "concluido",
          description: `Todas as assinaturas foram coletadas. Hash: ${documentHash.slice(0, 16)}... Código: ${validationCode}`,
        } as any);
      }

      setSigned(true);
    } catch (err: any) {
      setError("Erro ao assinar: " + (err.message || "tente novamente"));
    } finally {
      setSigning(false);
    }
  };

  const signedCount = allSigners.filter(s => s.status === "assinado").length;
  const progressPercent = allSigners.length > 0 ? (signedCount / allSigners.length) * 100 : 0;

  const SigningProgress = () => (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" /> Progresso das Assinaturas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{signedCount} de {allSigners.length} assinatura(s)</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
        <div className="space-y-2">
          {allSigners.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-2.5 text-sm">
              <div className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
                {idx + 1}
              </div>
              {s.status === "assinado" ? (
                <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              ) : s.id === signer?.id ? (
                <div className="h-4 w-4 rounded-full border-2 border-primary animate-pulse shrink-0" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className={s.status === "assinado" ? "text-muted-foreground line-through" : s.id === signer?.id ? "font-semibold text-foreground" : "text-muted-foreground"}>
                {s.name}
              </span>
              {s.id === signer?.id && s.status !== "assinado" && (
                <Badge variant="outline" className="text-[10px] ml-auto">Sua vez</Badge>
              )}
              {s.status === "assinado" && s.signed_at && (
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {new Date(s.signed_at).toLocaleDateString("pt-BR")}
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !signer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Link Inválido</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-4">
          <Card>
            <CardHeader className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <CardTitle>Contrato Assinado!</CardTitle>
              <CardDescription>Sua assinatura foi registrada com sucesso.</CardDescription>
            </CardHeader>
            {contract?.pdf_url && (
              <CardContent>
                <Button className="w-full" onClick={() => window.open(contract.pdf_url, "_blank")}>
                  Baixar Documento PDF
                </Button>
              </CardContent>
            )}
          </Card>
          {allSigners.length > 1 && <SigningProgress />}
        </div>
      </div>
    );
  }

  if (blocked) {
    const myOrder = signer?.sign_order || 0;
    const pendingBefore = allSigners.filter(s => s.sign_order < myOrder && s.status !== "assinado");
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-4">
          <Card>
            <CardHeader className="text-center">
              <Clock className="h-12 w-12 text-amber-500 mx-auto mb-2" />
              <CardTitle>Aguardando sua vez</CardTitle>
              <CardDescription>
                Este contrato possui ordem de assinatura obrigatória. Aguarde {pendingBefore.length === 1 ? "o signatário anterior" : `os ${pendingBefore.length} signatários anteriores`} assinar(em) primeiro.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertDescription className="text-sm">
                  Você receberá uma notificação quando for sua vez de assinar.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
          <SigningProgress />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <FileSignature className="h-10 w-10 text-primary mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">{contract?.name || "Contrato"}</h1>
          <p className="text-muted-foreground">
            Olá <strong>{signer?.name}</strong>, revise o documento e assine digitalmente.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Progress */}
        {allSigners.length > 1 && <SigningProgress />}

        {/* PDF with Signature Overlay */}
        {contract && signer && (
          <Card>
            <CardContent className="p-2 sm:p-4">
              <PdfSigningOverlay
                contractId={contract.id}
                pdfUrl={contract.pdf_url}
                currentSignerId={signer.id}
                onFieldClick={handleFieldClick}
                signedFieldIds={signedFieldIds}
              />
            </CardContent>
          </Card>
        )}

        {/* Signing Actions */}
        <Card id="signing-section">
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedField ? "✍️ Assinar Campo Selecionado" : "Assinar Documento"}
            </CardTitle>
            <CardDescription>
              {selectedField
                ? `Você está assinando o campo "${selectedField.label || "Assinatura"}". Capture sua foto e permita a localização.`
                : "Capture sua foto e permita o acesso à localização para validar a assinatura."
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Photo */}
            <div className="space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" /> Foto do Assinante
                {photo && <CheckCircle className="h-4 w-4 text-green-500" />}
              </p>
              {!photo ? (
                <div className="space-y-3">
                  {cameraActive ? (
                    <div className="space-y-3 relative">
                      <video ref={videoRef} autoPlay playsInline className="w-full max-w-sm rounded-lg border mx-auto" />
                      {countdown !== null && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-6xl font-bold text-white drop-shadow-lg bg-black/40 rounded-full w-20 h-20 flex items-center justify-center">
                            {countdown}
                          </span>
                        </div>
                      )}
                      <p className="text-center text-sm text-muted-foreground">
                        {countdown !== null ? `Capturando em ${countdown}s...` : "Capturando..."}
                      </p>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full" onClick={startCamera}>
                      <Camera className="h-4 w-4 mr-2" /> Abrir Câmera
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <img src={photoPreview!} alt="Foto" className="w-20 h-20 rounded-lg border object-cover" />
                  <Button variant="outline" size="sm" onClick={() => { setPhoto(null); setPhotoPreview(null); }}>Tirar outra</Button>
                </div>
              )}
            </div>

            {/* Location */}
            <div className="space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Geolocalização
                {location && !locationLoading && <CheckCircle className="h-4 w-4 text-green-500" />}
              </p>
              {locationLoading ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Obtendo localização automaticamente...
                </p>
              ) : location ? (
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{location.address}</p>
              ) : null}
            </div>

            {/* Sign Button */}
            <Button className="w-full h-12 text-base font-semibold" onClick={handleSign} disabled={!photo || !location || signing}>
              {signing ? (
                <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Assinando...</>
              ) : (
                <><FileSignature className="h-5 w-5 mr-2" /> Assinar Contrato</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
