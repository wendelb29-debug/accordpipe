import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Pen, Type, Upload, ArrowLeft, ArrowRight, Check } from "lucide-react";

function validateCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11 || /^(\d)\1+$/.test(cleaned)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cleaned[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(cleaned[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cleaned[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  return rest === parseInt(cleaned[10]);
}

function maskCPF(value: string): string {
  const cleaned = value.replace(/\D/g, "").slice(0, 11);
  return cleaned
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function maskPhone(value: string): string {
  const cleaned = value.replace(/\D/g, "").slice(0, 11);
  if (cleaned.length <= 10) {
    return cleaned.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return cleaned.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

export default function AssinaturaOnboarding() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [signatureType, setSignatureType] = useState<"draw" | "typed" | "upload">("typed");
  const [isDrawing, setIsDrawing] = useState(false);
  const [typedSignature, setTypedSignature] = useState("");
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    full_name: profile?.name || "",
    cpf: "",
    birth_date: "",
    email: profile?.email || "",
    phone: "",
    cargo: "",
  });

  useEffect(() => {
    if (profile) {
      setForm((f) => ({
        ...f,
        full_name: f.full_name || profile.name || "",
        email: f.email || profile.email || "",
      }));
    }
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { name, value } = e.target;
    if (name === "cpf") value = maskCPF(value);
    if (name === "phone") value = maskPhone(value);
    setForm((f) => ({ ...f, [name]: value }));
  };

  // Canvas drawing
  useEffect(() => {
    if (signatureType === "draw" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "#1a1a2e";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
      }
    }
  }, [signatureType, step]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const rect = canvasRef.current.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setUploadPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const canProceedStep1 = form.full_name && form.cpf && validateCPF(form.cpf.replace(/\D/g, "")) && form.email;

  const getSignaturePreview = () => {
    if (signatureType === "typed") return typedSignature || form.full_name;
    if (signatureType === "upload") return uploadPreview;
    return null;
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!accepted) {
      toast.error("Você precisa aceitar a declaração.");
      return;
    }
    setSaving(true);
    try {
      let signatureImageUrl = "";

      if (signatureType === "draw" && canvasRef.current) {
        const blob = await new Promise<Blob | null>((res) =>
          canvasRef.current!.toBlob(res, "image/png")
        );
        if (blob) {
          const path = `${user.id}/signature-${Date.now()}.png`;
          const { error: upErr } = await supabase.storage
            .from("user-signatures")
            .upload(path, blob, { contentType: "image/png" });
          if (upErr) throw upErr;
          const { data: urlData } = supabase.storage.from("user-signatures").getPublicUrl(path);
          signatureImageUrl = urlData.publicUrl;
        }
      } else if (signatureType === "upload" && uploadFile) {
        const path = `${user.id}/signature-${Date.now()}.${uploadFile.name.split(".").pop()}`;
        const { error: upErr } = await supabase.storage
          .from("user-signatures")
          .upload(path, uploadFile);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("user-signatures").getPublicUrl(path);
        signatureImageUrl = urlData.publicUrl;
      } else if (signatureType === "typed") {
        // Generate typed signature as canvas image
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = 400;
        tempCanvas.height = 100;
        const ctx = tempCanvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, 400, 100);
          ctx.font = "italic 32px 'Georgia', serif";
          ctx.fillStyle = "#1a1a2e";
          ctx.fillText(typedSignature || form.full_name, 20, 60);
        }
        const blob = await new Promise<Blob | null>((res) =>
          tempCanvas.toBlob(res, "image/png")
        );
        if (blob) {
          const path = `${user.id}/signature-${Date.now()}.png`;
          const { error: upErr } = await supabase.storage
            .from("user-signatures")
            .upload(path, blob, { contentType: "image/png" });
          if (upErr) throw upErr;
          const { data: urlData } = supabase.storage.from("user-signatures").getPublicUrl(path);
          signatureImageUrl = urlData.publicUrl;
        }
      }

      // Save user_signatures
      const { error: sigErr } = await supabase.from("user_signatures" as any).insert({
        user_id: user.id,
        full_name: form.full_name,
        cpf: form.cpf.replace(/\D/g, ""),
        birth_date: form.birth_date || null,
        email: form.email,
        phone: form.phone.replace(/\D/g, "") || null,
        cargo: form.cargo || null,
        signature_image_url: signatureImageUrl,
        signature_type: signatureType,
      } as any);
      if (sigErr) throw sigErr;

      // Update profile
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ signature_completed: true } as any)
        .eq("user_id", user.id);
      if (profErr) throw profErr;

      toast.success("Assinatura criada com sucesso!");
      // Force reload to update profile state
      window.location.href = "/home";
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao salvar assinatura: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const progressValue = step === 1 ? 33 : step === 2 ? 66 : 100;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardContent className="p-6 md:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-1">Criação de Assinatura</h1>
            <p className="text-sm text-muted-foreground">
              {step === 1 && "Preencha seus dados pessoais"}
              {step === 2 && "Crie sua assinatura digital"}
              {step === 3 && "Confirme e finalize"}
            </p>
            <Progress value={progressValue} className="mt-4 h-2" />
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span className={step >= 1 ? "text-primary font-medium" : ""}>Dados</span>
              <span className={step >= 2 ? "text-primary font-medium" : ""}>Assinatura</span>
              <span className={step >= 3 ? "text-primary font-medium" : ""}>Confirmação</span>
            </div>
          </div>

          {/* STEP 1 - Dados */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label>Nome completo *</Label>
                <Input name="full_name" value={form.full_name} onChange={handleChange} placeholder="Nome completo" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>CPF *</Label>
                  <Input name="cpf" value={form.cpf} onChange={handleChange} placeholder="000.000.000-00" />
                  {form.cpf && !validateCPF(form.cpf.replace(/\D/g, "")) && (
                    <p className="text-xs text-destructive mt-1">CPF inválido</p>
                  )}
                </div>
                <div>
                  <Label>Data de nascimento</Label>
                  <Input name="birth_date" type="date" value={form.birth_date} onChange={handleChange} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Email *</Label>
                  <Input name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@exemplo.com" />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input name="phone" value={form.phone} onChange={handleChange} placeholder="(00) 00000-0000" />
                </div>
              </div>
              <div>
                <Label>Cargo (opcional)</Label>
                <Input name="cargo" value={form.cargo} onChange={handleChange} placeholder="Ex: Gerente comercial" />
              </div>
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1} className="w-full">
                Próximo <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* STEP 2 - Assinatura */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={signatureType === "typed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSignatureType("typed")}
                >
                  <Type className="mr-1 h-4 w-4" /> Digitar
                </Button>
                <Button
                  variant={signatureType === "draw" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSignatureType("draw")}
                >
                  <Pen className="mr-1 h-4 w-4" /> Desenhar
                </Button>
                <Button
                  variant={signatureType === "upload" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSignatureType("upload")}
                >
                  <Upload className="mr-1 h-4 w-4" /> Upload
                </Button>
              </div>

              {signatureType === "typed" && (
                <div className="space-y-3">
                  <Input
                    placeholder="Digite seu nome para gerar assinatura"
                    value={typedSignature}
                    onChange={(e) => setTypedSignature(e.target.value)}
                  />
                  <div className="border rounded-lg p-6 bg-card text-center min-h-[100px] flex items-center justify-center">
                    <span className="text-3xl italic text-foreground" style={{ fontFamily: "Georgia, serif" }}>
                      {typedSignature || form.full_name || "Sua assinatura"}
                    </span>
                  </div>
                </div>
              )}

              {signatureType === "draw" && (
                <div className="space-y-2">
                  <div className="border rounded-lg overflow-hidden bg-white">
                    <canvas
                      ref={canvasRef}
                      width={500}
                      height={150}
                      className="w-full cursor-crosshair"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={clearCanvas}>
                    Limpar
                  </Button>
                </div>
              )}

              {signatureType === "upload" && (
                <div className="space-y-3">
                  <Input type="file" accept="image/*" onChange={handleUpload} />
                  {uploadPreview && (
                    <div className="border rounded-lg p-4 bg-card flex justify-center">
                      <img src={uploadPreview} alt="Preview" className="max-h-[100px] object-contain" />
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1">
                  Próximo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3 - Confirmação */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-muted/50 space-y-2 text-sm">
                <p><strong>Nome:</strong> {form.full_name}</p>
                <p><strong>CPF:</strong> {form.cpf}</p>
                {form.birth_date && <p><strong>Nascimento:</strong> {new Date(form.birth_date + "T12:00:00").toLocaleDateString("pt-BR")}</p>}
                <p><strong>Email:</strong> {form.email}</p>
                {form.phone && <p><strong>Telefone:</strong> {form.phone}</p>}
                {form.cargo && <p><strong>Cargo:</strong> {form.cargo}</p>}
              </div>

              <div className="border rounded-lg p-4 bg-card flex justify-center min-h-[80px] items-center">
                {signatureType === "typed" && (
                  <span className="text-3xl italic" style={{ fontFamily: "Georgia, serif" }}>
                    {typedSignature || form.full_name}
                  </span>
                )}
                {signatureType === "draw" && canvasRef.current && (
                  <img src={canvasRef.current.toDataURL()} alt="Assinatura" className="max-h-[80px]" />
                )}
                {signatureType === "upload" && uploadPreview && (
                  <img src={uploadPreview} alt="Assinatura" className="max-h-[80px]" />
                )}
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="accept"
                  checked={accepted}
                  onCheckedChange={(v) => setAccepted(v === true)}
                />
                <label htmlFor="accept" className="text-sm text-muted-foreground leading-tight cursor-pointer">
                  Declaro que esta assinatura é válida e de minha responsabilidade.
                </label>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
                </Button>
                <Button onClick={handleSubmit} disabled={!accepted || saving} className="flex-1">
                  {saving ? "Salvando..." : (
                    <>
                      <Check className="mr-1 h-4 w-4" /> Finalizar
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
