import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Camera, MapPin, CheckCircle, Loader2, FileSignature, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

export default function AssinarPdf() {
  const { token } = useParams<{ token: string }>();
  const [signer, setSigner] = useState<any>(null);
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) { setError("Token inválido"); setLoading(false); return; }
      
      // Find signer by token
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
        // Load contract for download
        const { data: contractData } = await supabase
          .from("pdf_contracts")
          .select("*")
          .eq("id", signerData.contract_id)
          .single();
        if (contractData) setContract(contractData);
        setLoading(false);
        return;
      }

      setSigner(signerData);

      // Load contract
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
      setLoading(false);
    };
    load();
  }, [token]);

  // Auto-capture geolocation on mount
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

  // Camera with auto-capture after countdown
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
        // Start 5s countdown
        let count = 5;
        setCountdown(count);
        countdownRef.current = setInterval(() => {
          count--;
          if (count <= 0) {
            clearInterval(countdownRef.current!);
            setCountdown(null);
            // Small delay to ensure video frame is ready
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

  // Sign
  const handleSign = async () => {
    if (!signer || !photo || !location) return;
    setSigning(true);
    try {
      // Upload photo
      const fileName = `pdf_${signer.id}_${Date.now()}.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from("signatures")
        .upload(fileName, photo, { contentType: "image/jpeg" });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("signatures").getPublicUrl(fileName);

      // Update signer
      const { error: updateErr } = await supabase
        .from("pdf_contract_signers")
        .update({
          status: "assinado",
          signed_at: new Date().toISOString(),
          signature_photo_url: urlData.publicUrl,
          signature_latitude: location.lat,
          signature_longitude: location.lng,
          signature_address: location.address,
        } as any)
        .eq("id", signer.id);
      if (updateErr) throw updateErr;

      // Add history
      await supabase.from("pdf_contract_history").insert({
        contract_id: signer.contract_id,
        action: "assinado",
        description: `${signer.name} assinou o contrato em ${new Date().toLocaleString("pt-BR")}. Local: ${location.address}`,
      } as any);

      // Check if all signers signed → update contract status
      const { data: allSigners } = await supabase
        .from("pdf_contract_signers")
        .select("status")
        .eq("contract_id", signer.contract_id);

      if (allSigners && allSigners.every((s: any) => s.status === "assinado")) {
        await supabase
          .from("pdf_contracts")
          .update({ status: "assinado" } as any)
          .eq("id", signer.contract_id);
      }

      setSigned(true);
    } catch (err: any) {
      setError("Erro ao assinar: " + (err.message || "tente novamente"));
    } finally {
      setSigning(false);
    }
  };

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
        <Card className="w-full max-w-md">
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

        {/* PDF */}
        {contract?.pdf_url && (
          <Card>
            <CardContent className="p-0">
              <iframe src={contract.pdf_url} className="w-full h-[60vh] rounded-lg" title="Contrato" />
            </CardContent>
          </Card>
        )}

        {/* Signing Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Assinar Documento</CardTitle>
            <CardDescription>Capture sua foto e permita o acesso à localização para validar a assinatura.</CardDescription>
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
                    <div className="space-y-3">
                      <video ref={videoRef} autoPlay playsInline className="w-full max-w-sm rounded-lg border mx-auto" />
                      <Button className="w-full" onClick={capturePhoto}>Capturar Foto</Button>
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
                {location && <CheckCircle className="h-4 w-4 text-green-500" />}
              </p>
              {!location ? (
                <Button variant="outline" className="w-full" onClick={captureLocation} disabled={locationLoading}>
                  {locationLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MapPin className="h-4 w-4 mr-2" />}
                  {locationLoading ? "Obtendo localização..." : "Capturar Localização"}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{location.address}</p>
              )}
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
