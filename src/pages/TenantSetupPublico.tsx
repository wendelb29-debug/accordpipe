import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2, Loader2, Check, Search, Palette, MapPin, User,
  ArrowRight, ArrowLeft, Sparkles, CheckCircle2, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ─── Formatters ─── */
const cleanDigits = (v: string) => v.replace(/\D/g, "");

const formatCnpj = (v: string) => {
  const d = cleanDigits(v).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

const formatCep = (v: string) => {
  const d = cleanDigits(v).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
};

const formatPhone = (v: string) => {
  const d = cleanDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

/* ─── Steps config ─── */
const STEPS = [
  { id: "empresa", icon: Building2, label: "Empresa", desc: "Dados da empresa" },
  { id: "responsavel", icon: User, label: "Responsável", desc: "Contato principal" },
  { id: "endereco", icon: MapPin, label: "Endereço", desc: "Localização" },
  { id: "identidade", icon: Palette, label: "Identidade", desc: "Cores da marca" },
];

export default function TenantSetupPublico() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const [form, setForm] = useState({
    cnpj: "", razao_social: "", nome_fantasia: "", responsavel: "",
    email: "", telefone: "", cep: "", endereco: "", numero: "",
    complemento: "", bairro: "", cidade: "", estado: "",
    brand_primary_color: "#1E2952", brand_secondary_color: "#4F46E5",
    brand_accent_color: "#10B981", brand_bg_color: "#F3F4F6", brand_text_color: "#1F2937",
  });

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      const { data, error } = await supabase
        .from("tenant_setup_requests")
        .select("*")
        .eq("token", token)
        .maybeSingle();
      if (error || !data) { setNotFound(true); setLoading(false); return; }
      if (data.status === "submitted" || data.status === "activated") setSubmitted(true);
      setRequestId(data.id);
      setForm((prev) => ({
        ...prev,
        cnpj: data.cnpj || prev.cnpj,
        razao_social: data.razao_social || prev.razao_social,
        nome_fantasia: data.nome_fantasia || prev.nome_fantasia,
        responsavel: data.responsavel || prev.responsavel,
        email: data.email || prev.email,
        telefone: data.telefone || prev.telefone,
        cep: data.cep || prev.cep,
        endereco: data.endereco || prev.endereco,
        numero: data.numero || prev.numero,
        complemento: data.complemento || prev.complemento,
        bairro: data.bairro || prev.bairro,
        cidade: data.cidade || prev.cidade,
        estado: data.estado || prev.estado,
        brand_primary_color: data.brand_primary_color || prev.brand_primary_color,
        brand_secondary_color: data.brand_secondary_color || prev.brand_secondary_color,
        brand_accent_color: data.brand_accent_color || prev.brand_accent_color,
        brand_bg_color: data.brand_bg_color || prev.brand_bg_color,
        brand_text_color: data.brand_text_color || prev.brand_text_color,
      }));
      setLoading(false);
    };
    load();
  }, [token]);

  /* ─── CNPJ Search ─── */
  const handleCnpjSearch = async () => {
    const digits = cleanDigits(form.cnpj);
    if (digits.length !== 14) { toast.error("Digite um CNPJ válido com 14 dígitos"); return; }
    setCnpjLoading(true);
    try {
      let data: any = null;
      try {
        const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
        if (res.ok) data = await res.json();
      } catch (e) { console.warn("BrasilAPI falhou, tentando fallback...", e); }
      if (!data) {
        try {
          const res2 = await fetch(`https://publica.cnpj.ws/cnpj/${digits}`);
          if (res2.ok) {
            const raw = await res2.json();
            data = {
              razao_social: raw.razao_social,
              nome_fantasia: raw.estabelecimento?.nome_fantasia,
              email: raw.estabelecimento?.email,
              ddd_telefone_1: raw.estabelecimento?.ddd1 && raw.estabelecimento?.telefone1
                ? `${raw.estabelecimento.ddd1}${raw.estabelecimento.telefone1}` : null,
              cep: raw.estabelecimento?.cep,
              logradouro: raw.estabelecimento?.logradouro,
              numero: raw.estabelecimento?.numero,
              complemento: raw.estabelecimento?.complemento,
              bairro: raw.estabelecimento?.bairro,
              municipio: raw.estabelecimento?.cidade?.nome,
              uf: raw.estabelecimento?.estado?.sigla,
            };
          }
        } catch (e2) { console.warn("Fallback CNPJ API also failed", e2); }
      }
      if (!data) throw new Error("Nenhuma API retornou dados");
      setForm((prev) => ({
        ...prev,
        razao_social: data.razao_social || prev.razao_social,
        nome_fantasia: data.nome_fantasia || data.razao_social || prev.nome_fantasia,
        email: data.email || prev.email,
        telefone: data.ddd_telefone_1 ? formatPhone(data.ddd_telefone_1) : prev.telefone,
        cep: data.cep ? formatCep(data.cep) : prev.cep,
        endereco: data.logradouro || prev.endereco,
        numero: data.numero || prev.numero,
        complemento: data.complemento || prev.complemento,
        bairro: data.bairro || prev.bairro,
        cidade: data.municipio || prev.cidade,
        estado: data.uf || prev.estado,
      }));
      toast.success("Dados do CNPJ carregados!");
    } catch (err) {
      console.error("Erro ao buscar CNPJ:", err);
      toast.error("Não foi possível buscar o CNPJ. Verifique e tente novamente.");
    } finally { setCnpjLoading(false); }
  };

  /* ─── CEP Search ─── */
  const handleCepSearch = async (cep: string) => {
    const digits = cleanDigits(cep);
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) throw new Error();
      setForm((prev) => ({
        ...prev, cep: formatCep(digits),
        endereco: data.logradouro || prev.endereco,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        estado: data.uf || prev.estado,
        complemento: data.complemento || prev.complemento,
      }));
      toast.success("Endereço carregado!");
    } catch { toast.error("CEP não encontrado."); }
    finally { setCepLoading(false); }
  };

  /* ─── Submit ─── */
  const handleSubmit = async () => {
    if (!form.cnpj || !form.razao_social) {
      toast.error("CNPJ e Razão Social são obrigatórios");
      setCurrentStep(0);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase
      .from("tenant_setup_requests")
      .update({ ...form, status: "submitted", submitted_at: new Date().toISOString() } as any)
      .eq("id", requestId);
    if (error) {
      toast.error("Erro ao enviar configuração");
      console.error(error);
    } else {
      setSubmitted(true);
      toast.success("Configuração enviada com sucesso!");
    }
    setSubmitting(false);
  };

  const progressValue = ((currentStep + 1) / STEPS.length) * 100;

  const isStepComplete = (stepIndex: number) => {
    if (stepIndex === 0) return !!(form.cnpj && form.razao_social);
    if (stepIndex === 1) return !!(form.responsavel || form.email);
    if (stepIndex === 2) return !!(form.cep || form.endereco);
    if (stepIndex === 3) return !!(form.brand_primary_color);
    return false;
  };

  /* ─── States: Loading / Not Found / Submitted ─── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">Carregando configuração...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full shadow-xl border-0 rounded-2xl animate-scale-in">
          <CardContent className="pt-10 pb-10 text-center space-y-5">
            <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <Building2 className="h-10 w-10 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Link inválido ou expirado</h1>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              Este link de configuração não foi encontrado ou já não está mais disponível.
              Entre em contato com o administrador.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full shadow-xl border-0 rounded-2xl animate-scale-in">
          <CardContent className="pt-10 pb-10 text-center space-y-5">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Tudo pronto!</h1>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              Seus dados foram enviados com sucesso. Nossa equipe irá revisar e ativar seu ambiente em breve.
            </p>
            <div className="pt-2">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-primary bg-primary/5 px-4 py-2 rounded-full">
                <Sparkles className="h-3.5 w-3.5" />
                Fique atento ao seu e-mail
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ─── Main render ─── */
  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-6 md:py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
                Configuração do seu ambiente
              </h1>
              <p className="text-sm text-muted-foreground">
                Vamos preparar tudo para você começar com o Accord
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium">Etapa {currentStep + 1} de {STEPS.length}</span>
              <span>{Math.round(progressValue)}% concluído</span>
            </div>
            <Progress value={progressValue} className="h-1.5" />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Left sidebar – stepper */}
          <div className="md:w-56 shrink-0">
            <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
              {STEPS.map((step, idx) => {
                const isActive = idx === currentStep;
                const isComplete = isStepComplete(idx);
                const isPast = idx < currentStep;
                return (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(idx)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all duration-200 whitespace-nowrap md:whitespace-normal min-w-fit md:min-w-0 w-full group",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                        : "hover:bg-card hover:shadow-sm text-muted-foreground"
                    )}
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors text-sm font-semibold",
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : isComplete
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                    )}>
                      {isComplete && !isActive ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <step.icon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="hidden md:block">
                      <p className={cn(
                        "text-sm font-medium leading-tight",
                        isActive ? "text-primary-foreground" : isPast || isComplete ? "text-foreground" : ""
                      )}>
                        {step.label}
                      </p>
                      <p className={cn(
                        "text-[11px] mt-0.5 leading-tight",
                        isActive ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        {step.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right – form content */}
          <div className="flex-1 min-w-0">
            <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardContent className="p-6 md:p-8">
                <div className="animate-fade-in" key={currentStep}>
                  {/* STEP 0 — Empresa */}
                  {currentStep === 0 && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">Dados da Empresa</h2>
                        <p className="text-sm text-muted-foreground mt-1">Informe o CNPJ para buscar os dados automaticamente.</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">CNPJ <span className="text-destructive">*</span></Label>
                        <div className="flex gap-2">
                          <Input
                            value={form.cnpj}
                            onChange={(e) => setForm({ ...form, cnpj: formatCnpj(e.target.value) })}
                            placeholder="00.000.000/0000-00"
                            className="flex-1 h-11 rounded-xl bg-muted/50 border-border/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          />
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={handleCnpjSearch}
                            disabled={cnpjLoading}
                            className="h-11 w-11 rounded-xl shrink-0"
                          >
                            {cnpjLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Razão Social <span className="text-destructive">*</span></Label>
                          <Input
                            value={form.razao_social}
                            onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
                            placeholder="Razão Social da empresa"
                            className="h-11 rounded-xl bg-muted/50 border-border/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Nome Fantasia</Label>
                          <Input
                            value={form.nome_fantasia}
                            onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
                            placeholder="Nome Fantasia"
                            className="h-11 rounded-xl bg-muted/50 border-border/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 1 — Responsável */}
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">Responsável e Contato</h2>
                        <p className="text-sm text-muted-foreground mt-1">Quem será o ponto de contato principal?</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Nome do Responsável</Label>
                          <Input
                            value={form.responsavel}
                            onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
                            placeholder="Nome completo"
                            className="h-11 rounded-xl bg-muted/50 border-border/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">E-mail</Label>
                          <Input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="email@empresa.com"
                            className="h-11 rounded-xl bg-muted/50 border-border/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-2 max-w-xs">
                        <Label className="text-sm font-medium">Telefone</Label>
                        <Input
                          value={form.telefone}
                          onChange={(e) => setForm({ ...form, telefone: formatPhone(e.target.value) })}
                          placeholder="(00) 00000-0000"
                          className="h-11 rounded-xl bg-muted/50 border-border/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {/* STEP 2 — Endereço */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">Endereço</h2>
                        <p className="text-sm text-muted-foreground mt-1">Digite o CEP para preencher automaticamente.</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">CEP</Label>
                          <div className="flex gap-2 items-center">
                            <Input
                              value={form.cep}
                              onChange={(e) => {
                                const formatted = formatCep(e.target.value);
                                setForm({ ...form, cep: formatted });
                                if (cleanDigits(formatted).length === 8) handleCepSearch(formatted);
                              }}
                              placeholder="00000-000"
                              className="h-11 rounded-xl bg-muted/50 border-border/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all flex-1"
                            />
                            {cepLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                        <div className="space-y-2 md:col-span-2">
                          <Label className="text-sm font-medium">Endereço</Label>
                          <Input
                            value={form.endereco}
                            onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                            placeholder="Rua, Avenida..."
                            className="h-11 rounded-xl bg-muted/50 border-border/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Número</Label>
                          <Input
                            value={form.numero}
                            onChange={(e) => setForm({ ...form, numero: e.target.value })}
                            placeholder="Nº"
                            className="h-11 rounded-xl bg-muted/50 border-border/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Complemento</Label>
                          <Input
                            value={form.complemento}
                            onChange={(e) => setForm({ ...form, complemento: e.target.value })}
                            placeholder="Sala, Andar..."
                            className="h-11 rounded-xl bg-muted/50 border-border/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Bairro</Label>
                          <Input
                            value={form.bairro}
                            onChange={(e) => setForm({ ...form, bairro: e.target.value })}
                            placeholder="Bairro"
                            className="h-11 rounded-xl bg-muted/50 border-border/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Cidade</Label>
                          <Input
                            value={form.cidade}
                            onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                            placeholder="Cidade"
                            className="h-11 rounded-xl bg-muted/50 border-border/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Estado</Label>
                          <Input
                            value={form.estado}
                            onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })}
                            placeholder="UF"
                            maxLength={2}
                            className="h-11 rounded-xl bg-muted/50 border-border/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 3 — Identidade Visual */}
                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">Identidade Visual</h2>
                        <p className="text-sm text-muted-foreground mt-1">Defina as cores que serão utilizadas no seu ambiente.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[
                          { key: "brand_primary_color", label: "Cor Primária" },
                          { key: "brand_secondary_color", label: "Cor Secundária" },
                          { key: "brand_accent_color", label: "Cor de Destaque" },
                          { key: "brand_bg_color", label: "Cor de Fundo" },
                          { key: "brand_text_color", label: "Cor do Texto" },
                        ].map((c) => (
                          <div key={c.key} className="space-y-2">
                            <Label className="text-sm font-medium">{c.label}</Label>
                            <div className="flex items-center gap-3 p-2 rounded-xl border border-border/50 bg-muted/30">
                              <input
                                type="color"
                                value={(form as any)[c.key]}
                                onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
                                className="h-9 w-9 rounded-lg border-0 cursor-pointer shrink-0 bg-transparent"
                              />
                              <Input
                                value={(form as any)[c.key]}
                                onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
                                className="flex-1 font-mono text-xs h-9 border-0 bg-transparent shadow-none focus-visible:ring-0 px-0"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Preview */}
                      <div className="mt-6 p-5 rounded-xl border border-border/50 bg-muted/20">
                        <p className="text-xs text-muted-foreground font-medium mb-3">Pré-visualização</p>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg" style={{ backgroundColor: form.brand_primary_color }} />
                          <div className="h-10 w-10 rounded-lg" style={{ backgroundColor: form.brand_secondary_color }} />
                          <div className="h-10 w-10 rounded-lg" style={{ backgroundColor: form.brand_accent_color }} />
                          <div className="h-10 w-10 rounded-lg border border-border" style={{ backgroundColor: form.brand_bg_color }} />
                          <div className="h-10 w-10 rounded-lg" style={{ backgroundColor: form.brand_text_color }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation buttons */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/50">
                  <Button
                    variant="ghost"
                    onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
                    disabled={currentStep === 0}
                    className="gap-2 rounded-xl h-11 px-5"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                  </Button>

                  {currentStep < STEPS.length - 1 ? (
                    <Button
                      onClick={() => setCurrentStep((s) => Math.min(STEPS.length - 1, s + 1))}
                      className="gap-2 rounded-xl h-11 px-6 bg-primary hover:bg-primary/90 shadow-md shadow-primary/20"
                    >
                      Próximo
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="gap-2 rounded-xl h-11 px-8 bg-primary hover:bg-primary/90 shadow-md shadow-primary/20"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      {submitting ? "Enviando..." : "Enviar Configuração"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
