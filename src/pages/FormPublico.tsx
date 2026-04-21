import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import {
  User, Mail, Phone, Building2, MapPin, Users, MessageSquare, Send,
  CheckCircle2, Loader2, AlertCircle, Sparkles, ShieldCheck, Lock,
  MessageCircle, FileText, BarChart3, Star, ArrowRight, LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import accordLogo from "@/assets/accord-logo.png";

interface PublicForm {
  id: string;
  servidor_id: string;
  workspace_id: string | null;
  name: string;
  description: string | null;
  fields: string[];
  tags: string[] | null;
  slug: string | null;
  headline: string | null;
  subheadline: string | null;
  cta_text: string | null;
  thank_you_message: string | null;
  redirect_url_after_submit: string | null;
  seo_title: string | null;
  seo_description: string | null;
  brand_logo_url: string | null;
  brand_primary_color: string | null;
  brand_secondary_color: string | null;
  brand_accent_color: string | null;
  brand_bg_color: string | null;
  brand_text_color: string | null;
  tenant_name: string | null;
}

const FIELD_CONFIG: Record<string, { label: string; icon: React.ElementType; type?: string; placeholder: string }> = {
  nome: { label: "Nome completo *", icon: User, placeholder: "Seu nome completo" },
  telefone: { label: "WhatsApp *", icon: Phone, type: "tel", placeholder: "(00) 00000-0000" },
  email: { label: "E-mail", icon: Mail, type: "email", placeholder: "seu@email.com" },
  empresa: { label: "Empresa", icon: Building2, placeholder: "Nome da empresa" },
  cidade: { label: "Cidade", icon: MapPin, placeholder: "Sua cidade" },
  colaboradores: { label: "Qtd. de Colaboradores", icon: Users, placeholder: "" },
  mensagem: { label: "Mensagem", icon: MessageSquare, placeholder: "Como podemos ajudar?" },
};

const COLABORADORES_OPTIONS = ["1-5", "6-10", "11-50", "51-200", "200+"];
const SEGMENTOS = [
  "Vendas / Comercial",
  "Atendimento ao Cliente",
  "Saúde",
  "Educação",
  "Imobiliário",
  "Financeiro / Fintech",
  "Outro",
];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FEATURES = [
  { icon: MessageCircle, color: "#22c55e", title: "WhatsApp Integrado", desc: "Atenda todos os seus clientes direto pelo WhatsApp. Múltiplos atendentes, um único número." },
  { icon: Users, color: "#3B5BDB", title: "CRM Completo", desc: "Gerencie leads, clientes e todo o histórico de conversas em um só lugar." },
  { icon: FileText, color: "#a855f7", title: "Contratos Digitais", desc: "Crie, envie e assine contratos digitalmente sem sair da plataforma." },
  { icon: BarChart3, color: "#f97316", title: "Relatórios em tempo real", desc: "Acompanhe performance do time, tempo de resposta e satisfação dos clientes." },
];

function AnimatedNumber({ end, suffix = "", prefix = "" }: { end: number; suffix?: string; prefix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          const dur = 1400;
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min(1, (now - start) / dur);
            setVal(Math.floor(p * end));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      });
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [end]);
  return <span ref={ref}>{prefix}{val.toLocaleString("pt-BR")}{suffix}</span>;
}

export default function FormPublico() {
  const { formId } = useParams<{ formId: string }>();
  const [searchParams] = useSearchParams();
  const [formConfig, setFormConfig] = useState<PublicForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [honeypot, setHoneypot] = useState("");
  const [timestamp] = useState(Date.now());
  const formRef = useRef<HTMLDivElement>(null);

  const utmData = useMemo(() => ({
    utm_source: searchParams.get("utm_source") || undefined,
    utm_medium: searchParams.get("utm_medium") || undefined,
    utm_campaign: searchParams.get("utm_campaign") || undefined,
    utm_content: searchParams.get("utm_content") || undefined,
    utm_term: searchParams.get("utm_term") || undefined,
    referrer: typeof document !== "undefined" ? document.referrer : undefined,
  }), [searchParams]);

  useEffect(() => {
    const fetchForm = async () => {
      if (!formId) { setLoading(false); return; }
      if (UUID_RE.test(formId)) {
        const { data: legacy } = await supabase
          .from("crm_forms")
          .select("id, name, description, fields, servidor_id, slug, is_active, landing_page_enabled, headline, subheadline, cta_text, thank_you_message, redirect_url_after_submit, seo_title, seo_description, workspace_id, tags")
          .eq("id", formId)
          .maybeSingle();
        if (legacy) {
          const { data: tenant } = await supabase
            .from("companies")
            .select("brand_logo_url, brand_primary_color, brand_secondary_color, brand_accent_color, brand_bg_color, brand_text_color, nome_fantasia, razao_social")
            .eq("id", legacy.servidor_id)
            .maybeSingle();
          setFormConfig({
            ...(legacy as any),
            brand_logo_url: tenant?.brand_logo_url || null,
            brand_primary_color: tenant?.brand_primary_color || null,
            brand_secondary_color: tenant?.brand_secondary_color || null,
            brand_accent_color: tenant?.brand_accent_color || null,
            brand_bg_color: tenant?.brand_bg_color || null,
            brand_text_color: tenant?.brand_text_color || null,
            tenant_name: tenant?.nome_fantasia || tenant?.razao_social || null,
          });
        }
      } else {
        const { data } = await supabase.rpc("get_public_form_by_slug" as any, { p_slug: formId });
        const row = Array.isArray(data) && data.length > 0 ? (data[0] as any) : null;
        if (row) {
          setFormConfig({
            ...row,
            fields: typeof row.fields === "string" ? JSON.parse(row.fields) : row.fields,
          });
        }
      }
      setLoading(false);
    };
    fetchForm();
  }, [formId]);

  useEffect(() => {
    if (!formConfig) return;
    const title = formConfig.seo_title || formConfig.headline || formConfig.name || "Accord Stack";
    document.title = title;
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    if (formConfig.seo_description) setMeta("description", formConfig.seo_description);
  }, [formConfig]);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formConfig) return;
    if (!values.nome?.trim()) { setError("Nome é obrigatório"); return; }
    if (!values.telefone?.trim() || values.telefone.trim().length < 8) { setError("WhatsApp é obrigatório"); return; }

    setSubmitting(true);
    setError("");

    try {
      const utmParts: string[] = [];
      if (utmData.utm_source) utmParts.push(`source=${utmData.utm_source}`);
      if (utmData.utm_medium) utmParts.push(`medium=${utmData.utm_medium}`);
      if (utmData.utm_campaign) utmParts.push(`campaign=${utmData.utm_campaign}`);
      if (utmData.utm_content) utmParts.push(`content=${utmData.utm_content}`);
      if (utmData.utm_term) utmParts.push(`term=${utmData.utm_term}`);
      const utmSummary = utmParts.length ? `\n\n[UTM] ${utmParts.join(" | ")}` : "";
      const referrerSummary = utmData.referrer ? `\n[Referrer] ${utmData.referrer}` : "";
      const slugSummary = formConfig.slug ? `\n[Landing Page] /form/${formConfig.slug}` : "";
      const segmentoSummary = values.segmento ? `\n[Segmento] ${values.segmento}` : "";

      const mensagemFinal = (values.mensagem || "") + segmentoSummary + utmSummary + referrerSummary + slugSummary;
      const origemBase = utmData.utm_source ? `Landing Page (${utmData.utm_source})` : "Landing Page";

      const res = await supabase.functions.invoke("lead-form-webhook", {
        body: {
          nome: values.nome,
          telefone: values.telefone,
          email: values.email || "",
          empresa: values.empresa || "",
          colaboradores: values.colaboradores || "",
          mensagem: mensagemFinal.trim(),
          cidade: values.cidade || "",
          origem: `${origemBase} — ${formConfig.name}`,
          form_id: formConfig.id,
          servidor_id: formConfig.servidor_id,
          _honeypot: honeypot,
          _timestamp: timestamp,
        },
      });

      if (res.error) {
        setError("Erro ao enviar. Tente novamente.");
      } else {
        if (formConfig.redirect_url_after_submit) {
          window.location.href = formConfig.redirect_url_after_submit;
          return;
        }
        setSuccess(true);
      }
    } catch {
      setError("Erro ao enviar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#0F172A]">
        <Loader2 className="h-8 w-8 animate-spin text-[#3B5BDB]" />
      </div>
    );
  }

  if (!formConfig) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#0F172A] p-4">
        <Card className="max-w-md w-full text-center bg-[#1E293B] border-white/10">
          <CardContent className="p-8">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-bold mb-2 text-white">Página indisponível</h2>
            <p className="text-white/60">Esta landing page não existe ou foi desativada.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const headline = formConfig.headline || `Transforme seu atendimento com o Accord Stack`;
  const subheadline = formConfig.subheadline || formConfig.description || "WhatsApp, CRM, contratos digitais e muito mais — tudo integrado em uma única plataforma.";
  const ctaText = formConfig.cta_text || "Quero começar agora";
  const logoUrl = formConfig.brand_logo_url || accordLogo;
  const fieldsList = formConfig.fields?.length ? formConfig.fields : ["nome", "telefone", "email", "empresa", "colaboradores"];

  return (
    <div className="min-h-[100dvh] bg-[#0F172A] text-white relative overflow-x-hidden font-sans">
      {/* Mesh gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#0F172A_0%,#1E293B_50%,#0F172A_100%)]" />
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full blur-[120px] opacity-30 bg-[#3B5BDB]" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 bg-[#6366f1]" />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] rounded-full blur-[120px] opacity-15 bg-[#8b5cf6]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }}
        />
      </div>

      {/* Header fixed */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0F172A]/70 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <img src={logoUrl} alt="Accord" className="h-9 sm:h-10 w-auto object-contain [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.3))] mix-blend-screen" />
          <Link to="/auth">
            <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10 gap-2">
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Já tenho conta — </span>Entrar
            </Button>
          </Link>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-14">
        <div className="grid lg:grid-cols-[1.3fr_1fr] gap-10 lg:gap-14">
          {/* LEFT */}
          <div className="space-y-10 animate-fade-in">
            {/* Hero */}
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-[#3B5BDB]/15 text-[#93b5ff] border border-[#3B5BDB]/30">
                <Sparkles className="h-3.5 w-3.5" />
                Plataforma completa de atendimento
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold leading-[1.1] tracking-tight">
                Transforme seu atendimento com o{" "}
                <span className="bg-gradient-to-r from-[#3B5BDB] to-[#8b5cf6] bg-clip-text text-transparent">
                  Accord Stack
                </span>
              </h1>
              <p className="text-base sm:text-lg text-white/70 leading-relaxed max-w-2xl">
                {subheadline}
              </p>

              {/* Integrations row */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {[
                  { icon: MessageCircle, label: "WhatsApp", color: "#22c55e" },
                  { icon: Users, label: "CRM", color: "#3B5BDB" },
                  { icon: FileText, label: "Contratos", color: "#a855f7" },
                  { icon: BarChart3, label: "Relatórios", color: "#f97316" },
                ].map(({ icon: Icon, label, color }) => (
                  <div key={label} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-medium">
                    <Icon className="h-3.5 w-3.5" style={{ color }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Feature cards */}
            <div className="grid sm:grid-cols-2 gap-4">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="group p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#3B5BDB]/50 hover:-translate-y-1 hover:bg-white/[0.05] transition-all duration-300"
                  >
                    <div
                      className="h-11 w-11 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: `${f.color}1f`, color: f.color }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-white mb-1">{f.title}</h3>
                    <p className="text-sm text-white/60 leading-relaxed">{f.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Social proof numbers */}
            <div className="grid grid-cols-3 gap-4 py-6 border-y border-white/10">
              <div className="text-center sm:text-left">
                <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                  +<AnimatedNumber end={500} />
                </div>
                <div className="text-xs text-white/60 mt-1">empresas usam o Accord</div>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                  +<AnimatedNumber end={1} />M
                </div>
                <div className="text-xs text-white/60 mt-1">mensagens por mês</div>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                  <AnimatedNumber end={98} />%
                </div>
                <div className="text-xs text-white/60 mt-1">satisfação dos clientes</div>
              </div>
            </div>

            {/* Testimonial */}
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-white/10">
              <div className="flex gap-1 mb-3">
                {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-[#fbbf24] text-[#fbbf24]" />)}
              </div>
              <p className="text-white/80 text-sm sm:text-base leading-relaxed mb-4 italic">
                "Centralizamos WhatsApp, CRM e contratos no Accord. Nossa equipe ficou 3x mais produtiva e nunca mais perdemos um lead."
              </p>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#3B5BDB] to-[#8b5cf6] flex items-center justify-center font-bold text-sm">
                  MR
                </div>
                <div>
                  <div className="text-sm font-semibold">Marina Rodrigues</div>
                  <div className="text-xs text-white/50">Diretora Comercial · TechFlow</div>
                </div>
              </div>
            </div>

            {/* Security badges */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-white/60">
              <div className="flex items-center gap-2"><Lock className="h-4 w-4 text-[#22c55e]" /> Dados protegidos</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#22c55e]" /> LGPD</div>
              <div className="flex items-center gap-2"><Star className="h-4 w-4 text-[#fbbf24]" /> Suporte dedicado</div>
            </div>
          </div>

          {/* RIGHT — Form (sticky on desktop) */}
          <div ref={formRef} className="lg:sticky lg:top-24 lg:self-start scroll-mt-24">
            {success ? (
              <Card className="border-white/10 bg-[#1E293B] shadow-2xl">
                <CardContent className="p-8 text-center space-y-4 animate-scale-in">
                  <div className="h-20 w-20 mx-auto rounded-full bg-[#22c55e]/15 flex items-center justify-center">
                    <CheckCircle2 className="h-10 w-10 text-[#22c55e]" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Recebemos seu contato!</h2>
                  <p className="text-white/70 leading-relaxed">
                    {formConfig.thank_you_message || "Nossa equipe vai entrar em contato pelo WhatsApp em até 2 horas. Fique atento!"}
                  </p>
                  <Link to="/auth" className="block pt-2">
                    <Button className="w-full h-12 gap-2 bg-gradient-to-r from-[#3B5BDB] to-[#8b5cf6] hover:opacity-90 border-0">
                      Acessar o Accord agora <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-white/10 bg-[#1E293B]/90 backdrop-blur-xl shadow-[0_25px_80px_-20px_rgba(59,91,219,0.4)]">
                <CardContent className="p-5 sm:p-7">
                  <div className="mb-5">
                    <h2 className="text-xl sm:text-2xl font-bold text-white">Comece agora</h2>
                    <p className="text-sm text-white/60 mt-1">Preencha e nossa equipe entra em contato em até 2h</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3.5">
                    <input
                      type="text"
                      name="website"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                      style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0 }}
                      tabIndex={-1}
                      autoComplete="off"
                    />

                    {fieldsList.map((fieldId) => {
                      const config = FIELD_CONFIG[fieldId];
                      if (!config) return null;
                      const Icon = config.icon;

                      if (fieldId === "colaboradores") {
                        return (
                          <div key={fieldId} className="space-y-1.5">
                            <Label className="flex items-center gap-1.5 text-xs font-medium text-white/80">
                              <Icon className="h-3.5 w-3.5" /> {config.label}
                            </Label>
                            <Select value={values.colaboradores || ""} onValueChange={(v) => setValues({ ...values, colaboradores: v })}>
                              <SelectTrigger className="h-12 bg-[#0F172A] border-white/10 text-white text-base"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                              <SelectContent>
                                {COLABORADORES_OPTIONS.map((opt) => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      }

                      if (fieldId === "mensagem") {
                        return (
                          <div key={fieldId} className="space-y-1.5">
                            <Label className="flex items-center gap-1.5 text-xs font-medium text-white/80">
                              <Icon className="h-3.5 w-3.5" /> {config.label}
                            </Label>
                            <Textarea
                              maxLength={1000}
                              value={values.mensagem || ""}
                              onChange={(e) => setValues({ ...values, mensagem: e.target.value })}
                              placeholder={config.placeholder}
                              rows={3}
                              className="bg-[#0F172A] border-white/10 text-white text-base placeholder:text-white/30"
                            />
                          </div>
                        );
                      }

                      return (
                        <div key={fieldId} className="space-y-1.5">
                          <Label className="flex items-center gap-1.5 text-xs font-medium text-white/80">
                            <Icon className="h-3.5 w-3.5" /> {config.label}
                          </Label>
                          <Input
                            type={config.type || "text"}
                            required={fieldId === "nome" || fieldId === "telefone"}
                            maxLength={fieldId === "email" ? 255 : 200}
                            value={values[fieldId] || ""}
                            onChange={(e) => setValues({ ...values, [fieldId]: e.target.value })}
                            placeholder={config.placeholder}
                            className="h-12 bg-[#0F172A] border-white/10 text-white text-base placeholder:text-white/30 focus-visible:ring-[#3B5BDB]"
                          />
                        </div>
                      );
                    })}

                    {/* Segmento */}
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5 text-xs font-medium text-white/80">
                        <Sparkles className="h-3.5 w-3.5" /> Segmento
                      </Label>
                      <Select value={values.segmento || ""} onValueChange={(v) => setValues({ ...values, segmento: v })}>
                        <SelectTrigger className="h-12 bg-[#0F172A] border-white/10 text-white text-base"><SelectValue placeholder="Selecione seu segmento..." /></SelectTrigger>
                        <SelectContent>
                          {SEGMENTOS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                        <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full h-[52px] text-base font-semibold gap-2 rounded-xl border-0 bg-gradient-to-r from-[#3B5BDB] to-[#8b5cf6] hover:scale-[1.02] hover:shadow-[0_10px_40px_-10px_rgba(139,92,246,0.6)] transition-all duration-200"
                    >
                      {submitting ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-4 w-4" /> {ctaText}
                        </>
                      )}
                    </Button>

                    <div className="flex items-center justify-center gap-2 text-[11px] text-white/50 pt-2">
                      <Lock className="h-3 w-3" /> Seus dados estão protegidos e não serão compartilhados.
                    </div>
                    <div className="flex items-center justify-center gap-3 text-[10px] text-white/40 uppercase tracking-wider">
                      <span>WhatsApp</span><span>·</span><span>SSL</span><span>·</span><span>LGPD</span>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-white/5 mt-10">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-xs text-white/40">
          © {new Date().getFullYear()} Accord — Todos os direitos reservados
        </div>
      </footer>

      {/* Mobile floating CTA */}
      {!success && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/95 to-transparent pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            onClick={scrollToForm}
            className="w-full h-12 gap-2 rounded-xl border-0 bg-gradient-to-r from-[#3B5BDB] to-[#8b5cf6] font-semibold shadow-[0_10px_40px_-10px_rgba(59,91,219,0.6)]"
          >
            Quero começar <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
