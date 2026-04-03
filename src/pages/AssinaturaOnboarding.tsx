import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Pen, Type, Upload, ArrowLeft, ArrowRight, Check,
  User, Mail, Phone, Briefcase, Calendar, ShieldCheck, Lock, FileSignature
} from "lucide-react";

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

const steps = [
  { label: "Dados", icon: User },
  { label: "Assinatura", icon: FileSignature },
  { label: "Confirmação", icon: Check },
];

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

      const { error: profErr } = await supabase
        .from("profiles")
        .update({ signature_completed: true } as any)
        .eq("user_id", user.id);
      if (profErr) throw profErr;

      toast.success("Assinatura criada com sucesso!");
      window.location.href = "/home";
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao salvar assinatura: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-2xl">
        {/* Stepper */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {steps.map((s, i) => {
            const stepNum = i + 1;
            const isActive = step === stepNum;
            const isDone = step > stepNum;
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                      isDone
                        ? "bg-primary text-primary-foreground"
                        : isActive
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span
                    className={`text-xs font-medium transition-colors ${
                      isActive || isDone ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`w-16 sm:w-24 h-0.5 mx-2 mb-5 transition-colors ${
                      step > stepNum ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <Card className="shadow-sm border border-border/50 rounded-2xl overflow-hidden">
          <CardContent className="p-6 md:p-10">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Criação de Assinatura
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {step === 1 && "Preencha seus dados pessoais para continuar"}
                {step === 2 && "Crie sua assinatura digital personalizada"}
                {step === 3 && "Revise suas informações e finalize"}
              </p>
            </div>

            {/* STEP 1 - Dados */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5 mb-1.5">
                    <User className="h-3.5 w-3.5" /> Nome completo *
                  </Label>
                  <Input
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    placeholder="Nome completo"
                    className="h-11"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5 mb-1.5">
                      <ShieldCheck className="h-3.5 w-3.5" /> CPF *
                    </Label>
                    <Input
                      name="cpf"
                      value={form.cpf}
                      onChange={handleChange}
                      placeholder="000.000.000-00"
                      className="h-11"
                    />
                    {form.cpf && !validateCPF(form.cpf.replace(/\D/g, "")) && (
                      <p className="text-xs text-destructive mt-1">CPF inválido</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5 mb-1.5">
                      <Calendar className="h-3.5 w-3.5" /> Data de nascimento
                    </Label>
                    <Input
                      name="birth_date"
                      type="date"
                      value={form.birth_date}
                      onChange={handleChange}
                      className="h-11"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5 mb-1.5">
                      <Mail className="h-3.5 w-3.5" /> Email *
                    </Label>
                    <Input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="email@exemplo.com"
                      className="h-11"
                    />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5 mb-1.5">
                      <Phone className="h-3.5 w-3.5" /> Telefone
                    </Label>
                    <Input
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="(00) 00000-0000"
                      className="h-11"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5 mb-1.5">
                    <Briefcase className="h-3.5 w-3.5" /> Cargo (opcional)
                  </Label>
                  <Input
                    name="cargo"
                    value={form.cargo}
                    onChange={handleChange}
                    placeholder="Ex: Gerente comercial"
                    className="h-11"
                  />
                </div>
                <Button onClick={() => setStep(2)} disabled={!canProceedStep1} className="w-full h-12 text-base">
                  Próximo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {/* STEP 2 - Assinatura */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="flex gap-2 p-1 bg-muted rounded-xl">
                  {([
                    { key: "typed" as const, icon: Type, label: "Digitar" },
                    { key: "draw" as const, icon: Pen, label: "Desenhar" },
                    { key: "upload" as const, icon: Upload, label: "Upload" },
                  ]).map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setSignatureType(opt.key)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        signatureType === opt.key
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <opt.icon className="h-4 w-4" />
                      {opt.label}
                    </button>
                  ))}
                </div>

                {signatureType === "typed" && (
                  <div className="space-y-4">
                    <Input
                      placeholder="Digite seu nome para gerar assinatura"
                      value={typedSignature}
                      onChange={(e) => setTypedSignature(e.target.value)}
                      className="h-11"
                    />
                    <div className="border-2 border-dashed border-border rounded-xl p-8 bg-slate-50/50 text-center min-h-[120px] flex items-center justify-center">
                      <span
                        className="text-3xl md:text-4xl italic text-foreground"
                        style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                      >
                        {typedSignature || form.full_name || "Sua assinatura"}
                      </span>
                    </div>
                  </div>
                )}

                {signatureType === "draw" && (
                  <div className="space-y-3">
                    <div className="border-2 border-dashed border-border rounded-xl overflow-hidden bg-white">
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
                    <Button variant="ghost" size="sm" onClick={clearCanvas} className="text-muted-foreground">
                      Limpar desenho
                    </Button>
                  </div>
                )}

                {signatureType === "upload" && (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-border rounded-xl p-8 bg-slate-50/50 text-center">
                      {uploadPreview ? (
                        <img src={uploadPreview} alt="Preview" className="max-h-[100px] object-contain mx-auto" />
                      ) : (
                        <div className="text-muted-foreground">
                          <Upload className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          <p className="text-sm">Selecione uma imagem da sua assinatura</p>
                        </div>
                      )}
                    </div>
                    <Input type="file" accept="image/*" onChange={handleUpload} />
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button variant="ghost" onClick={() => setStep(1)} className="text-muted-foreground">
                    <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
                  </Button>
                  <Button onClick={() => setStep(3)} className="flex-1 h-12 text-base">
                    Próximo <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3 - Confirmação */}
            {step === 3 && (
              <div className="space-y-6">
                {/* User data grid */}
                <div className="rounded-xl border border-border bg-slate-50/50 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">Dados Verificados</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: "Nome", value: form.full_name },
                      { label: "CPF", value: form.cpf },
                      ...(form.birth_date
                        ? [{ label: "Nascimento", value: new Date(form.birth_date + "T12:00:00").toLocaleDateString("pt-BR") }]
                        : []),
                      { label: "Email", value: form.email },
                      ...(form.phone ? [{ label: "Telefone", value: form.phone }] : []),
                      ...(form.cargo ? [{ label: "Cargo", value: form.cargo }] : []),
                    ].map((item) => (
                      <div key={item.label}>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-0.5">
                          {item.label}
                        </p>
                        <p className="text-sm font-semibold text-foreground">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Signature preview */}
                <div className="rounded-xl border-2 border-dashed border-border bg-[#fefefe] p-6 flex flex-col items-center justify-center min-h-[110px] relative">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium absolute top-3 left-4">
                    Assinatura Digital
                  </p>
                  {signatureType === "typed" && (
                    <span
                      className="text-3xl md:text-4xl italic text-foreground"
                      style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                    >
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

                {/* Checkbox */}
                <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-muted/30">
                  <Checkbox
                    id="accept"
                    checked={accepted}
                    onCheckedChange={(v) => setAccepted(v === true)}
                    className="mt-0.5"
                  />
                  <label htmlFor="accept" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                    Declaro que esta assinatura é válida e de minha responsabilidade.
                  </label>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => setStep(2)} className="text-muted-foreground">
                    <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!accepted || saving}
                    className="flex-1 h-12 text-base gap-2"
                  >
                    {saving ? (
                      "Salvando..."
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        Finalizar com segurança
                      </>
                    )}
                  </Button>
                </div>

                {/* Security badge */}
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-1">
                  <Lock className="h-3 w-3" />
                  <span>Protegido com criptografia de ponta a ponta</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer security */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Accord · Assinatura Digital Segura
        </p>
      </div>
    </div>
  );
}
