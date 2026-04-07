import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  Camera, MapPin, CheckCircle, Loader2, FileSignature, AlertCircle, Clock,
  Users, Shield, Download, Eye, ZoomIn, ZoomOut, ChevronDown, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const countdownStartedRef = useRef(false);
  const photoPreviewUrlRef = useRef<string | null>(null);
  const [signedFieldIds, setSignedFieldIds] = useState<string[]>([]);
  const [selectedField, setSelectedField] = useState<any>(null);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [showMobileSigning, setShowMobileSigning] = useState(false);
  const [companyBrand, setCompanyBrand] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) { setError("Token inválido"); setLoading(false); return; }

      const { data: signerRows, error: signerErr } = await supabase
        .rpc("get_pdf_signer_by_token", { p_token: token });

      const signerData = signerRows?.[0] || null;

      if (signerErr || !signerData) {
        setError("Link de assinatura inválido ou expirado.");
        setLoading(false);
        return;
      }

      const { data: contractData } = await supabase
        .from("pdf_contracts")
        .select("*")
        .eq("id", signerData.contract_id)
        .single();

      if (!contractData) {
        setError("Contrato não encontrado.");
        setLoading(false);
        return;
      }

      if (contractData.status === "cancelado") {
        setError("Este contrato foi cancelado.");
        setLoading(false);
        return;
      }

      // Load company branding
      if (contractData.servidor_id) {
        const { data: company } = await supabase
          .from("companies")
          .select("nome_fantasia, razao_social, brand_logo_url, brand_primary_color")
          .eq("id", contractData.servidor_id)
          .single();
        if (company) setCompanyBrand(company);
      }

      setContract(contractData);
      setSigner(signerData);

      if (signerData.status === "assinado") {
        setSigned(true);
      }

      const { data: signersList } = await supabase
        .rpc("get_pdf_contract_signers_by_token", { p_token: token });

      const sigList = (signersList as SignerInfo[]) || [];
      setAllSigners(sigList);

      if (contractData.sign_mode === "sequential" && signerData.status !== "assinado") {
        const myOrder = signerData.sign_order || 0;
        const previousSigners = sigList.filter(s => s.sign_order < myOrder);
        if (previousSigners.length > 0 && !previousSigners.every(s => s.status === "assinado")) {
          setBlocked(true);
        }
      }

      setLoading(false);
    };
    load();
  }, [token]);

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

  const revokePhotoPreview = useCallback(() => {
    if (photoPreviewUrlRef.current) {
      URL.revokeObjectURL(photoPreviewUrlRef.current);
      photoPreviewUrlRef.current = null;
    }
  }, []);

  const resetCapturedPhoto = useCallback(() => {
    revokePhotoPreview();
    setPhoto(null);
    setPhotoPreview(null);
  }, [revokePhotoPreview]);

  const stopCamera = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    countdownStartedRef.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
    setCountdown(null);
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;

    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      setError("A câmera ainda está carregando. Tente novamente.");
      stopCamera();
      return;
    }

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    if (!width || !height) {
      setError("Não foi possível capturar a foto. Tente novamente.");
      stopCamera();
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(video, 0, 0, width, height);

    canvas.toBlob((blob) => {
      if (!blob) {
        setError("Falha ao gerar a foto. Tente novamente.");
        stopCamera();
        return;
      }

      revokePhotoPreview();
      const previewUrl = URL.createObjectURL(blob);
      photoPreviewUrlRef.current = previewUrl;
      setPhoto(blob);
      setPhotoPreview(previewUrl);
      stopCamera();
    }, "image/jpeg", 0.85);
  }, [revokePhotoPreview, stopCamera]);

  const beginCountdown = useCallback(() => {
    if (countdownStartedRef.current) return;

    countdownStartedRef.current = true;
    let count = 6;
    setCountdown(count);

    countdownRef.current = setInterval(() => {
      count -= 1;

      if (count <= 0) {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }

        setCountdown(null);
        window.setTimeout(capturePhoto, 150);
        return;
      }

      setCountdown(count);
    }, 1000);
  }, [capturePhoto]);

  const startCamera = async () => {
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      setError(null);
      setCameraActive(true);
    } catch {
      setError("Não foi possível acessar a câmera.");
    }
  };

  useEffect(() => {
    if (!cameraActive || !streamRef.current || !videoRef.current) return;

    const video = videoRef.current;
    let cancelled = false;

    const handleVideoReady = () => {
      void video.play().catch(() => undefined).finally(() => {
        if (!cancelled) beginCountdown();
      });
    };

    video.srcObject = streamRef.current;

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      handleVideoReady();
    } else {
      video.addEventListener("loadedmetadata", handleVideoReady, { once: true });
    }

    return () => {
      cancelled = true;
      video.removeEventListener("loadedmetadata", handleVideoReady);
    };
  }, [cameraActive, beginCountdown]);

  useEffect(() => {
    return () => {
      stopCamera();
      revokePhotoPreview();
    };
  }, [revokePhotoPreview, stopCamera]);

  const getClientIp = async (): Promise<string> => {
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      return data.ip || "0.0.0.0";
    } catch { return "0.0.0.0"; }
  };

  const handleFieldClick = (field: any) => {
    setSelectedField(field);
    if (window.innerWidth < 1024) {
      setShowMobileSigning(true);
    } else {
      document.getElementById("signing-sidebar")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSign = async () => {
    if (!signer || !photo || !location) return;
    setSigning(true);
    try {
      const formData = new FormData();
      formData.append("token", token || "");
      formData.append("photo", photo, "signature.jpg");
      formData.append("latitude", location.lat.toString());
      formData.append("longitude", location.lng.toString());
      formData.append("address", location.address);
      formData.append("signer_name", signer.name || "");
      formData.append("signer_document", signer.cpf_cnpj || "");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/sign-contract`,
        { method: "POST", body: formData }
      );

      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || "Erro ao registrar assinatura");
      }

      if (selectedField) {
        setSignedFieldIds(prev => [...prev, selectedField.id]);
        await supabase.from("pdf_contract_fields")
          .update({ value: "signed" } as any)
          .eq("id", selectedField.id);
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
  const companyName = companyBrand?.nome_fantasia || companyBrand?.razao_social || "Accord";
  const currentDate = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  // ─── LOADING ───
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(224,62%,8%)]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <p className="text-[hsl(220,20%,70%)] text-sm">Carregando contrato...</p>
        </div>
      </div>
    );
  }

  // ─── ERROR (no signer) ───
  if (error && !signer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(224,62%,8%)] p-4">
        <Card className="w-full max-w-md bg-[hsl(224,50%,12%)] border-[hsl(224,40%,20%)]">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-[hsl(0,0%,95%)]">Link Inválido</CardTitle>
            <CardDescription className="text-[hsl(220,20%,60%)]">{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // ─── SIGNED SUCCESS ───
  if (signed) {
    const handleDownloadPdf = async () => {
      if (!contract?.pdf_url) return;
      try {
        const resp = await fetch(contract.pdf_url);
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${contract.name || "contrato"}_assinado.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch {
        window.open(contract.pdf_url, "_blank");
      }
    };

    return (
      <div className="min-h-screen bg-[hsl(224,62%,8%)]">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-[hsl(224,50%,12%)]/95 backdrop-blur-md border-b border-[hsl(224,40%,18%)]">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {companyBrand?.brand_logo_url ? (
                <img src={companyBrand.brand_logo_url} alt="" className="h-8 w-auto object-contain" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <FileSignature className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-[hsl(0,0%,92%)] leading-tight">{companyName}</p>
                <p className="text-xs text-[hsl(220,20%,50%)]">Assinatura Digital</p>
              </div>
            </div>
            <Badge className="bg-[hsl(152,55%,40%)]/10 text-[hsl(152,55%,40%)] border-[hsl(152,55%,40%)]/20 text-xs">
              <CheckCircle className="h-3 w-3 mr-1" /> Assinado
            </Badge>
          </div>
        </header>

        {/* Success banner */}
        <div className="bg-[hsl(152,55%,40%)]/5 border-b border-[hsl(152,55%,40%)]/10">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-[hsl(152,55%,40%)]" />
            <span className="text-[hsl(152,55%,40%)]">Sua assinatura foi registrada com sucesso e possui validade jurídica.</span>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: PDF Viewer */}
            <div className="flex-1 min-w-0 space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-bold text-[hsl(0,0%,92%)] truncate">{contract?.name || "Contrato"}</h1>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 text-[hsl(220,20%,60%)] hover:text-[hsl(0,0%,90%)] hover:bg-[hsl(224,50%,15%)]"
                    onClick={() => setPdfZoom(z => Math.max(50, z - 25))}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-[hsl(220,20%,55%)] min-w-[40px] text-center">{pdfZoom}%</span>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 text-[hsl(220,20%,60%)] hover:text-[hsl(0,0%,90%)] hover:bg-[hsl(224,50%,15%)]"
                    onClick={() => setPdfZoom(z => Math.min(200, z + 25))}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-[hsl(224,50%,15%)] rounded-2xl border border-[hsl(224,40%,20%)] overflow-hidden shadow-2xl shadow-[hsl(224,62%,4%)]/50">
                <div
                  className="overflow-auto max-h-[calc(100vh-260px)] p-4"
                  style={{ transform: `scale(${pdfZoom / 100})`, transformOrigin: "top center" }}
                >
                  {contract && signer && (
                    <PdfSigningOverlay
                      contractId={contract.id}
                      pdfUrl={contract.pdf_url}
                      currentSignerId={signer.id}
                      onFieldClick={() => {}}
                      signedFieldIds={signedFieldIds}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Right: Details sidebar */}
            <aside className="w-full lg:w-[380px] shrink-0">
              <div className="lg:sticky lg:top-24 space-y-5">
                {/* Signing details card */}
                <Card className="bg-[hsl(224,50%,12%)] border-[hsl(224,40%,20%)] overflow-hidden">
                  <div className="h-1.5 bg-gradient-to-r from-[hsl(152,55%,40%)] to-[hsl(152,55%,55%)]" />
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-[hsl(0,0%,95%)] flex items-center gap-2">
                      <Shield className="h-4 w-4 text-[hsl(152,55%,40%)]" /> Detalhes da Assinatura
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pb-6">
                    <div className="bg-[hsl(224,50%,15%)] rounded-xl p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-[hsl(220,20%,50%)] text-xs">Assinante</p>
                          <p className="text-[hsl(0,0%,90%)] font-medium">{signer?.name}</p>
                        </div>
                        <div>
                          <p className="text-[hsl(220,20%,50%)] text-xs">Data</p>
                          <p className="text-[hsl(0,0%,90%)] font-medium">{currentDate}</p>
                        </div>
                        {signer?.cpf_cnpj && (
                          <div>
                            <p className="text-[hsl(220,20%,50%)] text-xs">CPF/CNPJ</p>
                            <p className="text-[hsl(0,0%,90%)] text-sm">{signer.cpf_cnpj}</p>
                          </div>
                        )}
                        {signer?.email && (
                          <div>
                            <p className="text-[hsl(220,20%,50%)] text-xs">E-mail</p>
                            <p className="text-[hsl(0,0%,90%)] text-sm">{signer.email}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress */}
                    {allSigners.length > 1 && (
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-[hsl(220,20%,60%)]">{signedCount} de {allSigners.length} assinaturas</span>
                          <span className="text-[hsl(0,0%,90%)] font-medium">{Math.round(progressPercent)}%</span>
                        </div>
                        <Progress value={progressPercent} className="h-2 bg-[hsl(224,50%,18%)]" />
                        <div className="space-y-2">
                          {allSigners.map((s) => (
                            <div key={s.id} className="flex items-center gap-3 text-sm">
                              {s.status === "assinado" ? (
                                <CheckCircle className="h-4 w-4 text-[hsl(152,55%,40%)] shrink-0" />
                              ) : (
                                <Clock className="h-4 w-4 text-[hsl(45,93%,47%)] shrink-0" />
                              )}
                              <span className="text-[hsl(220,20%,70%)]">{s.name}</span>
                              {s.status === "assinado" && s.signed_at && (
                                <span className="text-[hsl(220,20%,45%)] text-xs ml-auto">
                                  {new Date(s.signed_at).toLocaleDateString("pt-BR")}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="space-y-2 pt-2">
                      <Button
                        className="w-full h-12 bg-[hsl(152,55%,40%)] hover:bg-[hsl(152,55%,35%)] text-[hsl(0,0%,100%)] font-semibold rounded-xl"
                        onClick={handleDownloadPdf}
                      >
                        <Download className="h-5 w-5 mr-2" /> Baixar Contrato Assinado
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full h-10 border-[hsl(224,40%,25%)] text-[hsl(220,20%,70%)] hover:bg-[hsl(224,50%,15%)] rounded-xl"
                        onClick={() => window.open(contract?.pdf_url, "_blank")}
                      >
                        <Eye className="h-4 w-4 mr-2" /> Abrir em Nova Aba
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <p className="text-center text-xs text-[hsl(220,20%,40%)]">
                  <Shield className="h-3 w-3 inline mr-1" />
                  Documento protegido com criptografia SHA-256 · Accord
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  // ─── BLOCKED (sequential) ───
  if (blocked) {
    const myOrder = signer?.sign_order || 0;
    const pendingBefore = allSigners.filter(s => s.sign_order < myOrder && s.status !== "assinado");
    return (
      <div className="min-h-screen bg-[hsl(224,62%,8%)] flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-6">
          <Card className="bg-[hsl(224,50%,12%)] border-[hsl(224,40%,20%)] overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[hsl(45,93%,47%)] to-[hsl(35,93%,55%)]" />
            <CardHeader className="text-center pt-10">
              <div className="w-20 h-20 rounded-full bg-[hsl(45,93%,47%)]/10 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-10 w-10 text-[hsl(45,93%,47%)]" />
              </div>
              <CardTitle className="text-2xl text-[hsl(0,0%,95%)]">Aguardando sua vez</CardTitle>
              <CardDescription className="text-[hsl(220,20%,60%)] text-base">
                Aguarde {pendingBefore.length === 1 ? "o signatário anterior" : `os ${pendingBefore.length} signatários anteriores`} assinar primeiro.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-8">
              <div className="space-y-3 mt-2">
                {allSigners.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 text-sm p-3 rounded-lg bg-[hsl(224,50%,15%)]">
                    {s.status === "assinado" ? (
                      <CheckCircle className="h-4 w-4 text-[hsl(152,55%,40%)] shrink-0" />
                    ) : s.id === signer?.id ? (
                      <div className="h-4 w-4 rounded-full border-2 border-primary animate-pulse shrink-0" />
                    ) : (
                      <Clock className="h-4 w-4 text-[hsl(45,93%,47%)] shrink-0" />
                    )}
                    <span className={s.id === signer?.id ? "text-[hsl(0,0%,95%)] font-semibold" : "text-[hsl(220,20%,65%)]"}>
                      {s.name}
                    </span>
                    {s.id === signer?.id && <Badge className="ml-auto text-xs bg-primary/20 text-primary border-0">Você</Badge>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── SIGNING ACTION PANEL (shared between sidebar and mobile) ───
  const SigningPanel = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="space-y-5">
      {/* Signer Info */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[hsl(0,0%,90%)] uppercase tracking-wider">Dados do Assinante</h3>
        <div className="bg-[hsl(224,50%,15%)] rounded-xl p-4 space-y-2.5">
          <div>
            <p className="text-[hsl(220,20%,50%)] text-xs">Nome</p>
            <p className="text-[hsl(0,0%,90%)] font-medium text-sm">{signer?.name}</p>
          </div>
          {signer?.email && (
            <div>
              <p className="text-[hsl(220,20%,50%)] text-xs">E-mail</p>
              <p className="text-[hsl(0,0%,90%)] text-sm">{signer.email}</p>
            </div>
          )}
          {signer?.cpf_cnpj && (
            <div>
              <p className="text-[hsl(220,20%,50%)] text-xs">CPF/CNPJ</p>
              <p className="text-[hsl(0,0%,90%)] text-sm">{signer.cpf_cnpj}</p>
            </div>
          )}
        </div>
      </div>

      <Separator className="bg-[hsl(224,40%,20%)]" />

      {/* Photo Capture */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[hsl(0,0%,90%)] uppercase tracking-wider flex items-center gap-2">
          <Camera className="h-4 w-4 text-primary" /> Selfie de Validação
          {photo && <CheckCircle className="h-4 w-4 text-[hsl(152,55%,40%)]" />}
        </h3>
        {!photo ? (
          cameraActive ? (
            <div className="relative rounded-xl overflow-hidden border border-[hsl(224,40%,20%)]">
              <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl" />
              {countdown !== null && (
                <div className="absolute inset-0 flex items-center justify-center bg-[hsl(224,62%,8%)]/40">
                  <span className="text-5xl font-bold text-[hsl(0,0%,100%)] bg-[hsl(224,62%,8%)]/60 rounded-full w-20 h-20 flex items-center justify-center">
                    {countdown}
                  </span>
                </div>
              )}
              <p className="text-center text-xs text-[hsl(220,20%,50%)] py-2">
                {countdown !== null ? `Foto será capturada em ${countdown}s...` : "Preparando..."}
              </p>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full h-12 border-dashed border-[hsl(224,40%,25%)] bg-[hsl(224,50%,15%)] text-[hsl(220,20%,70%)] hover:bg-[hsl(224,50%,18%)] hover:text-[hsl(0,0%,90%)]"
              onClick={startCamera}
            >
              <Camera className="h-5 w-5 mr-2" /> Abrir Câmera
            </Button>
          )
        ) : (
          <div className="flex items-center gap-3">
            <img src={photoPreview!} alt="Foto" className="w-16 h-16 rounded-xl border border-[hsl(224,40%,20%)] object-cover" />
            <div>
              <p className="text-sm text-[hsl(152,55%,40%)] font-medium">Foto capturada</p>
              <button
                className="text-xs text-primary hover:underline"
                    onClick={() => { resetCapturedPhoto(); startCamera(); }}
              >
                Tirar outra
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Location */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[hsl(0,0%,90%)] uppercase tracking-wider flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" /> Geolocalização
          {location && !locationLoading && <CheckCircle className="h-4 w-4 text-[hsl(152,55%,40%)]" />}
        </h3>
        {locationLoading ? (
          <div className="flex items-center gap-2 text-sm text-[hsl(220,20%,50%)] p-3 bg-[hsl(224,50%,15%)] rounded-xl">
            <Loader2 className="h-4 w-4 animate-spin" /> Obtendo localização...
          </div>
        ) : location ? (
          <p className="text-xs text-[hsl(220,20%,60%)] bg-[hsl(224,50%,15%)] rounded-xl p-3 leading-relaxed">
            {location.address}
          </p>
        ) : null}
      </div>

      <Separator className="bg-[hsl(224,40%,20%)]" />

      {/* Security info */}
      <div className="bg-[hsl(224,50%,15%)] border border-[hsl(224,40%,20%)] rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm text-[hsl(0,0%,90%)] font-medium">
          <Shield className="h-4 w-4 text-[hsl(152,55%,40%)]" /> Segurança da Assinatura
        </div>
        <ul className="text-xs text-[hsl(220,20%,55%)] space-y-1.5">
          <li className="flex items-start gap-2">
            <CheckCircle className="h-3 w-3 mt-0.5 text-[hsl(152,55%,40%)] shrink-0" />
            IP e geolocalização registrados
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-3 w-3 mt-0.5 text-[hsl(152,55%,40%)] shrink-0" />
            Data e hora da assinatura
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-3 w-3 mt-0.5 text-[hsl(152,55%,40%)] shrink-0" />
            Validade jurídica (MP 2.200-2/2001)
          </li>
        </ul>
      </div>

      {/* Sign CTA */}
      <Button
        className="w-full h-14 text-base font-bold bg-[hsl(152,55%,40%)] hover:bg-[hsl(152,55%,35%)] text-[hsl(0,0%,100%)] rounded-xl shadow-lg shadow-[hsl(152,55%,40%)]/20"
        onClick={handleSign}
        disabled={!photo || !location || signing}
      >
        {signing ? (
          <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Processando...</>
        ) : (
          <><FileSignature className="h-5 w-5 mr-2" /> Assinar Contrato</>
        )}
      </Button>

      {!photo && (
        <p className="text-xs text-center text-[hsl(220,20%,45%)]">
          Capture sua selfie para habilitar a assinatura
        </p>
      )}
    </div>
  );

  // ─── MAIN SIGNING VIEW ───
  return (
    <div className="min-h-screen bg-[hsl(224,62%,8%)]">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 bg-[hsl(224,50%,12%)]/95 backdrop-blur-md border-b border-[hsl(224,40%,18%)]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Left: Brand */}
          <div className="flex items-center gap-3">
            {companyBrand?.brand_logo_url ? (
              <img src={companyBrand.brand_logo_url} alt="" className="h-8 w-auto object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <FileSignature className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-[hsl(0,0%,92%)] leading-tight">{companyName}</p>
              <p className="text-xs text-[hsl(220,20%,50%)]">Assinatura Digital</p>
            </div>
          </div>

          {/* Center: Document name */}
          <div className="text-center hidden md:block">
            <p className="text-sm font-medium text-[hsl(0,0%,90%)] truncate max-w-[300px]">{contract?.name || "Contrato"}</p>
          </div>

          {/* Right: Status + Progress */}
          <div className="flex items-center gap-3">
            <Badge className="bg-[hsl(45,93%,47%)]/10 text-[hsl(45,93%,47%)] border-[hsl(45,93%,47%)]/20 text-xs">
              <Clock className="h-3 w-3 mr-1" /> Pendente
            </Badge>
            {allSigners.length > 1 && (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs text-[hsl(220,20%,55%)]">{signedCount}/{allSigners.length}</span>
                <div className="w-20">
                  <Progress value={progressPercent} className="h-1.5 bg-[hsl(224,50%,18%)]" />
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── ALERT BAR ── */}
      <div className="bg-[hsl(45,93%,47%)]/5 border-b border-[hsl(45,93%,47%)]/10">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-center gap-2 text-sm">
          <Eye className="h-4 w-4 text-[hsl(45,93%,47%)]" />
          <span className="text-[hsl(45,93%,47%)]">Leia atentamente o contrato antes de assinar</span>
        </div>
      </div>

      {error && (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-4">
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
            <AlertDescription className="text-destructive">{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* ── CONTENT ── */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── LEFT: Document Area ── */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Document name + zoom (mobile) */}
            <div className="flex items-center justify-between lg:hidden">
              <h1 className="text-lg font-bold text-[hsl(0,0%,92%)] truncate">{contract?.name || "Contrato"}</h1>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="ghost" size="icon"
                className="h-8 w-8 text-[hsl(220,20%,60%)] hover:text-[hsl(0,0%,90%)] hover:bg-[hsl(224,50%,15%)]"
                onClick={() => setPdfZoom(z => Math.max(50, z - 25))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs text-[hsl(220,20%,55%)] min-w-[40px] text-center">{pdfZoom}%</span>
              <Button
                variant="ghost" size="icon"
                className="h-8 w-8 text-[hsl(220,20%,60%)] hover:text-[hsl(0,0%,90%)] hover:bg-[hsl(224,50%,15%)]"
                onClick={() => setPdfZoom(z => Math.min(200, z + 25))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            {/* PDF Viewer */}
            <div className="bg-[hsl(224,50%,15%)] rounded-2xl border border-[hsl(224,40%,20%)] overflow-hidden shadow-2xl shadow-[hsl(224,62%,4%)]/50">
              <div
                className="overflow-auto max-h-[calc(100vh-260px)] p-4"
                style={{ transform: `scale(${pdfZoom / 100})`, transformOrigin: "top center" }}
              >
                {contract && signer && (
                  <PdfSigningOverlay
                    contractId={contract.id}
                    pdfUrl={contract.pdf_url}
                    currentSignerId={signer.id}
                    onFieldClick={handleFieldClick}
                    signedFieldIds={signedFieldIds}
                  />
                )}
              </div>
            </div>

            {/* Signers List */}
            {allSigners.length > 1 && (
              <div className="bg-[hsl(224,50%,12%)] rounded-2xl border border-[hsl(224,40%,20%)] p-5">
                <h3 className="text-sm font-semibold text-[hsl(0,0%,90%)] mb-4 flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" /> Assinaturas do Contrato
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {allSigners.map((s) => (
                    <div
                      key={s.id}
                      className={`rounded-xl p-4 border ${
                        s.status === "assinado"
                          ? "bg-[hsl(152,55%,40%)]/5 border-[hsl(152,55%,40%)]/20"
                          : s.id === signer?.id
                          ? "bg-primary/5 border-primary/20"
                          : "bg-[hsl(224,50%,15%)] border-[hsl(224,40%,22%)]"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-medium text-[hsl(0,0%,90%)]">{s.name}</p>
                        {s.status === "assinado" ? (
                          <Badge className="bg-[hsl(152,55%,40%)]/10 text-[hsl(152,55%,40%)] border-0 text-[10px]">Assinado</Badge>
                        ) : (
                          <Badge className="bg-[hsl(45,93%,47%)]/10 text-[hsl(45,93%,47%)] border-0 text-[10px]">Pendente</Badge>
                        )}
                      </div>
                      {s.status === "assinado" && s.signed_at ? (
                        <p className="text-xs text-[hsl(220,20%,50%)]">
                          Assinado em {new Date(s.signed_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                        </p>
                      ) : s.id === signer?.id ? (
                        <p className="text-xs text-primary">Sua vez de assinar</p>
                      ) : (
                        <div className="mt-2 border-b border-dashed border-[hsl(224,40%,25%)] w-3/4" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT SIDEBAR (desktop) ── */}
          <aside id="signing-sidebar" className="hidden lg:block w-[380px] shrink-0">
            <div className="sticky top-24 space-y-6">
              <div className="bg-[hsl(224,50%,12%)] rounded-2xl border border-[hsl(224,40%,20%)] p-6">
                <h2 className="text-lg font-bold text-[hsl(0,0%,92%)] mb-5 flex items-center gap-2">
                  <FileSignature className="h-5 w-5 text-primary" /> Assinar Documento
                </h2>
                <SigningPanel />
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ── MOBILE FIXED BOTTOM BAR ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[hsl(224,50%,12%)]/95 backdrop-blur-md border-t border-[hsl(224,40%,18%)] p-4 safe-area-pb">
        <Button
          className="w-full h-14 text-base font-bold bg-[hsl(152,55%,40%)] hover:bg-[hsl(152,55%,35%)] text-[hsl(0,0%,100%)] rounded-xl"
          onClick={() => setShowMobileSigning(true)}
        >
          <FileSignature className="h-5 w-5 mr-2" /> Assinar Contrato
        </Button>
      </div>

      {/* ── MOBILE SIGNING SHEET ── */}
      {showMobileSigning && (
        <div className="lg:hidden fixed inset-0 z-[60] bg-[hsl(224,62%,8%)]/80 backdrop-blur-sm" onClick={() => setShowMobileSigning(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-[hsl(224,50%,12%)] rounded-t-3xl border-t border-[hsl(224,40%,20%)] max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-[hsl(224,50%,12%)] p-4 flex items-center justify-between border-b border-[hsl(224,40%,18%)] rounded-t-3xl">
              <h2 className="text-lg font-bold text-[hsl(0,0%,92%)] flex items-center gap-2">
                <FileSignature className="h-5 w-5 text-primary" /> Assinar
              </h2>
              <button onClick={() => setShowMobileSigning(false)} className="text-[hsl(220,20%,50%)] hover:text-[hsl(0,0%,90%)]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 pb-10">
              <SigningPanel mobile />
            </div>
          </div>
        </div>
      )}

      {/* Bottom spacing for mobile CTA */}
      <div className="lg:hidden h-24" />
    </div>
  );
}
