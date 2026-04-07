import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Camera, CheckCircle2, MapPin, User, FileSignature,
  AlertCircle, Users, Clock, Building2, Mail, Phone, Hash, MapPinned,
  ShieldCheck, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { generateContractPdf } from "@/lib/generateContractPdf";

const roleLabels: Record<string, string> = {
  matriz: "Representante da Matriz",
  revendedor: "Revendedor / Contratante",
  colaborador: "Colaborador",
  vendedor: "Vendedor",
  testemunha: "Testemunha",
  signatario: "Signatário",
  cliente: "Cliente",
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
  pdf_url: string | null;
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

  return <iframe src={pdfUrl} className="w-full h-full rounded-xl border-0" title="Contrato PDF" />;
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
  const [viewingContract, setViewingContract] = useState(false);
  const [signerNameInput, setSignerNameInput] = useState("");
  const [signerDocInput, setSignerDocInput] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const countdownStartedRef = useRef(false);
  const photoPreviewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    fetchContract();
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
      if (contractData.signer_signed_at) {
        setSigned(true);
      } else if (contractData.signature_status === "signed" && !contractData.signer_role) {
        setSigned(true);
      } else if (data.is_client_contract && contractData.signature_status === "assinado") {
        setSigned(true);
      }
      if (contractData.signer_name) setSignerNameInput(contractData.signer_name);
      if (contractData.signer_document) setSignerDocInput(contractData.signer_document);
      setContract(contractData);
    } catch {
      setError("Erro ao carregar contrato.");
    }
    setLoading(false);
  };

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) { toast.error("Geolocalização não suportada neste dispositivo"); return; }
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

  const revokePhotoPreview = useCallback(() => {
    if (photoPreviewUrlRef.current) {
      URL.revokeObjectURL(photoPreviewUrlRef.current);
      photoPreviewUrlRef.current = null;
    }
  }, []);

  const resetCapturedPhoto = useCallback(() => {
    revokePhotoPreview();
    setPhotoBlob(null);
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

    setCameraOpen(false);
    setCountdown(null);
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;

    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      toast.error("A câmera ainda está carregando. Tente novamente.");
      stopCamera();
      return;
    }

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    if (!width || !height) {
      toast.error("Não foi possível capturar a foto. Tente novamente.");
      stopCamera();
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(video, 0, 0, width, height);

    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error("Falha ao gerar a foto. Tente novamente.");
        stopCamera();
        return;
      }

      revokePhotoPreview();
      const previewUrl = URL.createObjectURL(blob);
      photoPreviewUrlRef.current = previewUrl;
      setPhotoBlob(blob);
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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });

      streamRef.current = stream;
      setCameraOpen(true);
      getLocation();
    } catch {
      toast.error("Permita o acesso à câmera para assinar");
    }
  };

  useEffect(() => {
    if (!cameraOpen || !streamRef.current || !videoRef.current) return;

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
  }, [cameraOpen, beginCountdown]);

  useEffect(() => {
    return () => {
      stopCamera();
      revokePhotoPreview();
    };
  }, [revokePhotoPreview, stopCamera]);

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
      if (!response.ok || result.error) throw new Error(result.error || "Erro ao assinar");
      setSigned(true);
      toast.success("Assinatura registrada com sucesso!");
    } catch (e: any) {
      toast.error("Erro ao assinar: " + (e.message || "tente novamente"));
    }
    setSigning(false);
  };

  // ─── LOADING ───
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
          <p className="text-sm text-slate-400">Carregando contrato...</p>
        </div>
      </div>
    );
  }

  // ─── ERROR ───
  if (error || !contract) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}>
        <div className="max-w-md w-full rounded-2xl border border-slate-700/50 bg-slate-800/80 backdrop-blur-xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-100">{error || "Contrato não encontrado"}</h1>
          <p className="text-slate-400 text-sm">Verifique o link e tente novamente.</p>
        </div>
      </div>
    );
  }

  // ─── SIGNED SUCCESS ───
  if (signed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}>
        <div className="max-w-md w-full rounded-2xl border border-slate-700/50 bg-slate-800/80 backdrop-blur-xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto ring-2 ring-emerald-500/20">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Assinatura Registrada!</h1>
          <p className="text-slate-400">
            {contract.signer_role && (
              <span className="block mb-2">
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-xs">{roleLabels[contract.signer_role] || contract.signer_role}</Badge>
              </span>
            )}
            O contrato <span className="font-mono font-semibold text-slate-200">{contract.code}</span> foi assinado com sucesso.
          </p>
          {contract.signatures && contract.signatures.length > 0 && (
            <div className="text-left space-y-2 pt-4 border-t border-slate-700/50">
              <p className="text-sm font-semibold text-slate-300 flex items-center gap-2"><Users className="h-4 w-4 text-blue-400" /> Status das Assinaturas</p>
              {contract.signatures.map((sig, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">{roleLabels[sig.signer_role] || sig.signer_role}</span>
                  {sig.signed_at ? (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs gap-1"><CheckCircle2 className="h-3 w-3" /> Assinado</Badge>
                  ) : (
                    <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs gap-1"><Clock className="h-3 w-3" /> Pendente</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const company = contract.company;
  const signerRole = contract.signer_role || "revendedor";
  const fullAddress = company ? [
    company.endereco,
    company.numero ? `nº ${company.numero}` : null,
    company.complemento,
    company.bairro,
    company.cep ? `CEP: ${company.cep}` : null,
    company.cidade && company.estado ? `${company.cidade}/${company.estado}` : company.cidade || company.estado,
  ].filter(Boolean).join(", ") : "";

  const canSign = !!photoBlob && !!location;

  return (
    <div className="min-h-screen pb-28 sm:pb-8" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-5">

        {/* ─── HEADER ─── */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20">
            <FileSignature className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">Assinatura de Contrato</h1>
          <p className="font-mono text-slate-400 text-sm">{contract.code}</p>
          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-xs">{roleLabels[signerRole] || signerRole}</Badge>
        </div>

        {/* ─── SIGNATURES GRID ─── */}
        {contract.signatures && contract.signatures.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-400" /> Assinaturas do Contrato
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {contract.signatures.map((sig, i) => {
                const isSigned = !!sig.signed_at;
                return (
                  <div
                    key={i}
                    className={`rounded-xl border p-3 text-center transition-all ${
                      isSigned
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-slate-700/50 bg-slate-800/50"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 ${
                      isSigned ? "bg-emerald-500/15" : "bg-amber-500/15"
                    }`}>
                      {isSigned
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        : <Clock className="h-4 w-4 text-amber-400" />
                      }
                    </div>
                    <p className="text-xs font-medium text-slate-300 truncate">{roleLabels[sig.signer_role] || sig.signer_role}</p>
                    {sig.signer_name && <p className="text-[10px] text-slate-500 truncate mt-0.5">{sig.signer_name}</p>}
                    <p className={`text-[10px] font-medium mt-1 ${isSigned ? "text-emerald-400" : "text-amber-400"}`}>
                      {isSigned ? "Assinado" : "Pendente"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── DADOS PESSOAIS ─── */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 backdrop-blur-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <User className="h-4 w-4 text-blue-400" />
            </div>
            <h2 className="text-sm font-semibold text-slate-200">Dados Pessoais</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <DataRow icon={Building2} label="Razão Social" value={company?.razao_social || "-"} />
            {company?.nome_fantasia && <DataRow icon={Building2} label="Nome Fantasia" value={company.nome_fantasia} />}
            <DataRow icon={Hash} label="CNPJ" value={company?.cnpj || "-"} mono />
            {company?.responsavel && <DataRow icon={User} label="Responsável" value={company.responsavel} />}
            {company?.email && <DataRow icon={Mail} label="E-mail" value={company.email} />}
            {company?.telefone && <DataRow icon={Phone} label="Telefone" value={company.telefone} />}
            {fullAddress && (
              <div className="sm:col-span-2">
                <DataRow icon={MapPinned} label="Endereço" value={fullAddress} />
              </div>
            )}
          </div>
        </div>

        {/* ─── CONTEÚDO DO CONTRATO ─── */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 backdrop-blur-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-700/50">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <FileText className="h-4 w-4 text-blue-400" />
            </div>
            <h2 className="text-sm font-semibold text-slate-200">Conteúdo do Contrato</h2>
          </div>
          <div className="h-[80vh] sm:h-[550px] bg-slate-900/40 p-1 sm:p-4">
            <div className="h-full rounded-xl overflow-hidden shadow-2xl shadow-black/30 bg-white">
              {contract.pdf_url ? (
                <iframe src={contract.pdf_url} className="w-full h-full border-0" title="Contrato PDF" style={{ minHeight: "100%" }} />
              ) : (
                <ContractPdfEmbed content={contract.contract_content || ""} code={contract.code} companyName={company?.razao_social || ""} />
              )}
            </div>
          </div>
        </div>

        {/* ─── LOCALIZAÇÃO ─── */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 backdrop-blur-sm p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-blue-400" />
            </div>
            <h2 className="text-sm font-semibold text-slate-200">Localização</h2>
          </div>
          {location ? (
            <div className="flex items-start gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-slate-300">{location.address}</p>
                <p className="font-mono text-xs text-slate-500 mt-0.5">({location.lat.toFixed(6)}, {location.lng.toFixed(6)})</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">A localização será capturada automaticamente ao abrir a câmera.</p>
          )}
        </div>

        {/* ─── FOTO DO SIGNATÁRIO ─── */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 backdrop-blur-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Camera className="h-4 w-4 text-blue-400" />
            </div>
            <h2 className="text-sm font-semibold text-slate-200">Foto do Signatário</h2>
          </div>

          {cameraOpen && (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-black ring-1 ring-slate-700/50">
                <video ref={videoRef} autoPlay playsInline muted className="w-full" />
                {countdown !== null && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="w-20 h-20 rounded-full bg-blue-500/20 ring-2 ring-blue-400/40 flex items-center justify-center">
                      <span className="text-4xl font-bold text-blue-300">{countdown}</span>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-center text-xs text-slate-500">
                {countdown !== null ? `Foto será capturada em ${countdown}s...` : "Preparando..."}
              </p>
            </div>
          )}

          {photoPreview && !cameraOpen && (
            <div className="space-y-3">
              <img src={photoPreview} alt="Foto de assinatura" className="w-full max-w-xs mx-auto rounded-xl ring-1 ring-slate-700/50" />
              <Button
                variant="outline"
                onClick={() => { resetCapturedPhoto(); startCamera(); }}
                className="w-full gap-2 border-slate-700 text-slate-300 hover:bg-slate-700/50 rounded-xl"
              >
                <Camera className="h-4 w-4" /> Tirar Nova Foto
              </Button>
            </div>
          )}

          {!cameraOpen && !photoPreview && (
            <Button
              variant="outline"
              onClick={startCamera}
              className="w-full gap-2 border-slate-700 text-slate-300 hover:bg-slate-700/50 rounded-xl h-12"
            >
              <Camera className="h-4 w-4" /> Abrir Câmera
            </Button>
          )}
        </div>

        {/* ─── DESKTOP SIGN BUTTON ─── */}
        <div className="hidden sm:block">
          <button
            disabled={!canSign || signing}
            onClick={handleSign}
            className="w-full h-14 rounded-2xl font-semibold text-base text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
            style={{
              background: canSign && !signing
                ? "linear-gradient(135deg, #3b82f6, #6366f1)"
                : "linear-gradient(135deg, #334155, #475569)",
            }}
          >
            {signing ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileSignature className="h-5 w-5" />}
            Assinar Documento
          </button>
          {!canSign && (
            <p className="text-center text-xs text-slate-500 mt-2">
              {!photoBlob && !location
                ? "Tire uma foto e permita a localização para assinar"
                : !photoBlob
                ? "Tire uma foto para assinar"
                : "Permita a localização para assinar"}
            </p>
          )}
        </div>
      </div>

      {/* ─── MOBILE FIXED BOTTOM BAR ─── */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/50 safe-area-pb z-50">
        <button
          disabled={!canSign || signing}
          onClick={handleSign}
          className="w-full h-12 rounded-xl font-semibold text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
          style={{
            background: canSign && !signing
              ? "linear-gradient(135deg, #3b82f6, #6366f1)"
              : "linear-gradient(135deg, #334155, #475569)",
          }}
        >
          {signing ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileSignature className="h-5 w-5" />}
          Assinar Documento
        </button>
        {!canSign && (
          <p className="text-center text-[10px] text-slate-500 mt-1.5">
            {!photoBlob ? "Tire uma foto" : "Permita a localização"} para assinar
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── DATA ROW HELPER ─── */
function DataRow({ icon: Icon, label, value, mono }: { icon: any; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-3.5 w-3.5 text-slate-500 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 uppercase tracking-wider">{label}</p>
        <p className={`text-slate-200 truncate ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
    </div>
  );
}
