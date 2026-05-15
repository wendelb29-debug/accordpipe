import { useState, useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  Building2,
  User,
  Mail,
  Phone,
  Send,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Clock,
  Shield,
  Sparkles,
  MessageCircle,
  Users,
  FileSignature,
  ArrowRight,
  Target,
  LogIn,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import accordLogo from "@/assets/accord-logo-full.png";

const SEGMENTOS = [
  "Tecnologia / SaaS",
  "Educação",
  "Saúde",
  "Varejo / E-commerce",
  "Serviços",
  "Indústria",
  "Outro",
];

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) =>
        [a && `(${a}`, a && a.length === 2 ? ") " : "", b, c && `-${c}`].filter(Boolean).join(""),
      )
      .trim();
  }
  return d.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
}

export default function CapturaLead() {
  const { servidorId } = useParams<{ servidorId: string }>();
  const [searchParams] = useSearchParams();
  const urlTags = searchParams.get("tags")?.split(",").filter(Boolean) || [];
  const [servidor, setServidor] = useState<{ nome_fantasia: string | null; razao_social: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    notes: "",
    segmento: "",
  });

  useEffect(() => {
    const fetchServidor = async () => {
      if (!servidorId) return;
      const { data } = await supabase
        .from("companies")
        .select("nome_fantasia, razao_social, status")
        .eq("id", servidorId)
        .is("servidor_id", null)
        .maybeSingle();
      if (data && ["active", "teste"].includes(data.status)) {
        setServidor({ nome_fantasia: data.nome_fantasia, razao_social: data.razao_social });
      }
      setLoading(false);
    };
    fetchServidor();
  }, [servidorId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contact_name.trim() || !form.phone.trim()) {
      setError("Preencha nome e WhatsApp");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const segmentoNote = form.segmento ? `Segmento: ${form.segmento}` : "";
      const notes = [segmentoNote, form.notes].filter(Boolean).join("\n");
      const res = await supabase.functions.invoke("create-lead", {
        body: {
          servidor_id: servidorId,
          company_name: form.company_name || form.contact_name,
          contact_name: form.contact_name,
          email: form.email,
          phone: form.phone,
          notes,
          source: "Formulário Web",
          tags: urlTags.length > 0 ? urlTags : undefined,
        },
      });
      if (res.error || res.data?.error) {
        setError(res.data?.error || "Erro ao enviar formulário");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Erro ao enviar formulário. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a]">
        <Loader2 className="h-8 w-8 animate-spin text-[#7C3AED]" />
      </div>
    );
  }

  if (!servidor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a] p-4">
        <div className="max-w-md w-full text-center rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-8">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-rose-400" />
          <h2 className="text-xl font-bold mb-2 text-white">Formulário indisponível</h2>
          <p className="text-white/60">Este link não é válido ou o servidor está inativo.</p>
        </div>
      </div>
    );
  }

  const headerName = servidor.nome_fantasia || servidor.razao_social;

  return (
    <div
      className="min-h-screen relative overflow-x-hidden text-white"
      style={{
        background:
          "linear-gradient(135deg, #0a0a1a 0%, #0f0f2e 40%, #0a1628 100%)",
      }}
    >
      {/* Decorative glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-[#7C3AED] opacity-20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-[#06B6D4] opacity-20 blur-[120px]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
        backgroundSize: "32px 32px",
      }} />

      {/* Header */}
      <header
        className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0a1a]/70 border-b border-white/5"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="mx-auto max-w-6xl flex h-14 items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src={accordLogo} alt="Accord" className="h-9 w-auto brightness-200" />
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Já tenho conta</span>
            <span className="sm:hidden">Entrar</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-5 pb-16">
        {/* Hero */}
        <section className="pt-12 sm:pt-20 pb-8 text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/80 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-[#A78BFA]" />
            Plataforma completa de atendimento
          </div>

          <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight max-w-3xl mx-auto"
              style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
            Transforme seu atendimento
            <br />
            com o{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: "linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)",
              }}
            >
              Accord Stack
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
            WhatsApp, CRM, contratos digitais e muito mais — tudo integrado em uma única plataforma.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
            {["WhatsApp", "CRM", "Contratos", "Relatórios", "IA"].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/70 backdrop-blur-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>

        {/* Form Card */}
        <section className="mx-auto max-w-xl animate-scale-in">
          <div
            className="relative rounded-[24px] p-6 sm:p-8"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.4)",
            }}
          >
            {success ? (
              <div className="py-8 text-center animate-fade-in">
                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-bold text-white">Recebemos seu contato! 🎉</h3>
                <p className="mt-3 text-white/60">
                  Nossa equipe entrará em contato pelo WhatsApp em até 2h.
                </p>
                <div className="mt-6 inline-flex items-center gap-2 text-xs text-white/40">
                  <Shield className="h-3.5 w-3.5" />
                  Seus dados estão seguros
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white">Comece agora</h2>
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm text-white/60">
                    <Clock className="h-3.5 w-3.5" />
                    Nossa equipe entra em contato em até 2h
                  </p>
                  <p className="mt-1 text-xs text-white/40">via {headerName}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <FieldInput
                    icon={<User className="h-4 w-4" />}
                    placeholder="Nome completo *"
                    required
                    maxLength={200}
                    value={form.contact_name}
                    onChange={(v) => setForm({ ...form, contact_name: v })}
                  />
                  <FieldInput
                    icon={<Phone className="h-4 w-4" />}
                    placeholder="WhatsApp * — (00) 00000-0000"
                    required
                    type="tel"
                    inputMode="numeric"
                    maxLength={16}
                    value={form.phone}
                    onChange={(v) => setForm({ ...form, phone: maskPhone(v) })}
                  />
                  <FieldInput
                    icon={<Mail className="h-4 w-4" />}
                    placeholder="E-mail"
                    type="email"
                    maxLength={255}
                    value={form.email}
                    onChange={(v) => setForm({ ...form, email: v })}
                  />
                  <FieldInput
                    icon={<Building2 className="h-4 w-4" />}
                    placeholder="Empresa"
                    maxLength={200}
                    value={form.company_name}
                    onChange={(v) => setForm({ ...form, company_name: v })}
                  />
                  <FieldSelect
                    icon={<Target className="h-4 w-4" />}
                    value={form.segmento}
                    onChange={(v) => setForm({ ...form, segmento: v })}
                    options={SEGMENTOS}
                  />

                  {error && (
                    <div className="flex items-center gap-2 text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="group relative w-full inline-flex items-center justify-center gap-2 rounded-[14px] px-6 text-base font-bold text-white transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                    style={{
                      background: "linear-gradient(135deg, #7C3AED, #06B6D4)",
                      boxShadow: "0 8px 24px rgba(124, 58, 237, 0.4)",
                      minHeight: 54,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 12px 32px rgba(124, 58, 237, 0.5)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 8px 24px rgba(124, 58, 237, 0.4)";
                    }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        Quero começar agora
                      </>
                    )}
                  </button>

                  <p className="flex items-center justify-center gap-1.5 text-xs text-white/40 pt-1">
                    <Shield className="h-3 w-3" />
                    Seus dados estão seguros. Sem spam, prometemos.
                  </p>
                </form>
              </>
            )}
          </div>
        </section>

        {/* Benefits */}
        <section className="mt-16 sm:mt-20">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: MessageCircle,
                tint: "from-emerald-500/20 to-emerald-500/0",
                ring: "ring-emerald-500/20",
                color: "text-emerald-400",
                title: "WhatsApp Integrado",
                desc: "Atenda todos os seus clientes direto pelo WhatsApp com múltiplos atendentes.",
              },
              {
                icon: Users,
                tint: "from-violet-500/20 to-violet-500/0",
                ring: "ring-violet-500/20",
                color: "text-violet-400",
                title: "CRM Completo",
                desc: "Gerencie leads, clientes e todo o histórico de conversas em um só lugar.",
              },
              {
                icon: FileSignature,
                tint: "from-cyan-500/20 to-cyan-500/0",
                ring: "ring-cyan-500/20",
                color: "text-cyan-400",
                title: "Contratos Digitais",
                desc: "Assine contratos digitalmente com validade jurídica em segundos.",
              },
            ].map((b, i) => (
              <div
                key={b.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5 transition-all hover:bg-white/[0.06] hover:border-white/15 animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${b.tint} ring-1 ${b.ring}`}
                >
                  <b.icon className={`h-5 w-5 ${b.color}`} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">{b.title}</h3>
                <p className="mt-1.5 text-sm text-white/60 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-white/5 text-center">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} Accord. Todos os direitos reservados.
          </p>
        </footer>
      </main>

      <style>{`
        input, select, textarea { font-size: 16px !important; }
      `}</style>
    </div>
  );
}

function FieldInput({
  icon,
  ...props
}: {
  icon: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement> & { onChange: (v: string) => void } & { value: string }) {
  const { onChange, value, ...rest } = props;
  return (
    <div className="relative group">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#A78BFA] transition-colors">
        {icon}
      </span>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[12px] border border-white/[0.12] bg-white/[0.06] pl-11 pr-4 py-3.5 text-white placeholder:text-white/40 outline-none transition-all focus:border-[#7C3AED] focus:bg-white/[0.08]"
        style={{ boxShadow: "none" }}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124, 58, 237, 0.15)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = "none";
        }}
      />
    </div>
  );
}

function FieldSelect({
  icon,
  value,
  onChange,
  options,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="relative group">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#A78BFA] transition-colors z-10">
        {icon}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-[12px] border border-white/[0.12] bg-white/[0.06] pl-11 pr-10 py-3.5 text-white outline-none transition-all focus:border-[#7C3AED] focus:bg-white/[0.08]"
        onFocus={(e) => {
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124, 58, 237, 0.15)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <option value="" className="bg-[#0f0f2e]">Segmento (opcional)</option>
        {options.map((o) => (
          <option key={o} value={o} className="bg-[#0f0f2e]">
            {o}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40">▾</span>
    </div>
  );
}
