import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { User, Mail, Phone, Building2, MapPin, Users, MessageSquare, Send, CheckCircle2, Loader2, AlertCircle, Sparkles, ShieldCheck, Zap } from "lucide-react";
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
  email: { label: "Email", icon: Mail, type: "email", placeholder: "seu@email.com" },
  empresa: { label: "Empresa", icon: Building2, placeholder: "Nome da empresa" },
  cidade: { label: "Cidade", icon: MapPin, placeholder: "Sua cidade" },
  colaboradores: { label: "Qtd. de Colaboradores", icon: Users, placeholder: "" },
  mensagem: { label: "Mensagem", icon: MessageSquare, placeholder: "Como podemos ajudar?" },
};

const COLABORADORES_OPTIONS = ["1-5", "6-10", "11-50", "51-200", "200+"];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  // UTM tracking
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

      // If param looks like UUID, fall back to direct table query (for legacy /form/:uuid links)
      if (UUID_RE.test(formId)) {
        const { data: legacy } = await supabase
          .from("crm_forms")
          .select("id, name, description, fields, servidor_id, slug, is_active, landing_page_enabled, headline, subheadline, cta_text, thank_you_message, redirect_url_after_submit, seo_title, seo_description, workspace_id, tags")
          .eq("id", formId)
          .eq("is_active", true)
          .maybeSingle();
        if (legacy) {
          // Fetch tenant brand
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
        // Slug-based public lookup via RPC (works without auth)
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

  // SEO meta
  useEffect(() => {
    if (!formConfig) return;
    const title = formConfig.seo_title || formConfig.headline || formConfig.name || "Formulário";
    document.title = title;
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    const setOg = (prop: string, content: string) => {
      let el = document.querySelector(`meta[property="${prop}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement("meta"); el.setAttribute("property", prop); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    if (formConfig.seo_description) setMeta("description", formConfig.seo_description);
    setOg("og:title", title);
    if (formConfig.seo_description) setOg("og:description", formConfig.seo_description);
    setOg("og:type", "website");
    if (formConfig.brand_logo_url) setOg("og:image", formConfig.brand_logo_url);
  }, [formConfig]);

  // Brand-driven CSS variables for white-label
  const brandStyle = useMemo(() => {
    if (!formConfig) return {};
    const style: Record<string, string> = {};
    if (formConfig.brand_primary_color) style["--lp-primary"] = formConfig.brand_primary_color;
    if (formConfig.brand_secondary_color) style["--lp-secondary"] = formConfig.brand_secondary_color;
    if (formConfig.brand_accent_color) style["--lp-accent"] = formConfig.brand_accent_color;
    if (formConfig.brand_bg_color) style["--lp-bg"] = formConfig.brand_bg_color;
    if (formConfig.brand_text_color) style["--lp-text"] = formConfig.brand_text_color;
    return style as React.CSSProperties;
  }, [formConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formConfig) return;
    if (!values.nome?.trim()) { setError("Nome é obrigatório"); return; }
    if (!values.telefone?.trim() || values.telefone.trim().length < 8) { setError("Telefone é obrigatório"); return; }

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

      const mensagemFinal = (values.mensagem || "") + utmSummary + referrerSummary + slugSummary;
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!formConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-bold mb-2">Página indisponível</h2>
            <p className="text-muted-foreground">Esta landing page não existe ou foi desativada.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          background: `linear-gradient(135deg, ${formConfig.brand_bg_color || "hsl(var(--background))"} 0%, ${formConfig.brand_primary_color || "hsl(var(--primary))"}15 100%)`,
        }}
      >
        <Card className="max-w-md w-full text-center shadow-2xl border-0">
          <CardContent className="p-10">
            <div
              className="h-20 w-20 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{ background: `${formConfig.brand_primary_color || "hsl(var(--primary))"}20` }}
            >
              <CheckCircle2 className="h-10 w-10" style={{ color: formConfig.brand_primary_color || "hsl(var(--primary))" }} />
            </div>
            <h2 className="text-2xl font-bold mb-3">Recebemos seu contato!</h2>
            <p className="text-muted-foreground">
              {formConfig.thank_you_message || "Em breve um especialista entrará em contato com você."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const headline = formConfig.headline || formConfig.name;
  const subheadline = formConfig.subheadline || formConfig.description || "Preencha o formulário e fale com nossa equipe.";
  const ctaText = formConfig.cta_text || "Enviar agora";
  const logoUrl = formConfig.brand_logo_url || accordLogo;
  const primary = formConfig.brand_primary_color || "#3B82F6";
  const secondary = formConfig.brand_secondary_color || "#8B5CF6";

  return (
    <div
      className="min-h-screen relative overflow-hidden text-white"
      style={{
        ...brandStyle,
        background: "#070B14",
      }}
    >
      {/* Premium ambient gradients (Accord home style) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-48 -right-48 w-[700px] h-[700px] rounded-full blur-3xl opacity-25"
          style={{ background: `radial-gradient(circle, ${primary} 0%, transparent 70%)` }}
        />
        <div
          className="absolute -bottom-48 -left-48 w-[700px] h-[700px] rounded-full blur-3xl opacity-25"
          style={{ background: `radial-gradient(circle, ${secondary} 0%, transparent 70%)` }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full blur-3xl opacity-10"
          style={{ background: `radial-gradient(circle, ${primary} 0%, transparent 60%)` }}
        />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-6 lg:py-12 min-h-screen flex flex-col">
        {/* Header logo */}
        <div className="flex items-center justify-between mb-8 lg:mb-12 animate-fade-in">
          <img src={logoUrl} alt={formConfig.tenant_name || "Logo"} className="h-10 object-contain" />
          {formConfig.tenant_name && (
            <span className="text-sm text-white/60 hidden sm:block font-medium">{formConfig.tenant_name}</span>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center flex-1">
          {/* Left — Hero (mobile: shows after form) */}
          <div className="space-y-6 lg:pr-8 order-2 lg:order-1 animate-fade-in">
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium border"
              style={{
                background: `${primary}15`,
                color: primary,
                borderColor: `${primary}30`,
              }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {formConfig.tenant_name || "Atendimento especializado"}
            </div>

            <h1 className="text-4xl lg:text-6xl font-bold leading-[1.05] tracking-tight text-white">
              {headline}
            </h1>

            <p className="text-base lg:text-lg text-white/70 leading-relaxed max-w-xl">
              {subheadline}
            </p>

            {/* Benefits */}
            <div className="flex flex-wrap gap-3 pt-2">
              {[
                { icon: Zap, label: "Atendimento rápido" },
                { icon: ShieldCheck, label: "Dados seguros" },
                { icon: Sparkles, label: "Sem compromisso" },
              ].map(({ icon: Icon, label }, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm text-white/80 px-3 py-2 rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm"
                >
                  <div
                    className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${primary}20`, color: primary }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Form card */}
          <div className="order-1 lg:order-2 animate-fade-in">
            <Card
              className="border border-white/10 shadow-2xl backdrop-blur-2xl overflow-hidden"
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                boxShadow: `0 30px 90px -20px ${primary}30, 0 0 0 1px rgba(255,255,255,0.05)`,
              }}
            >
              <CardContent className="p-6 lg:p-8">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Honeypot */}
                  <input
                    type="text"
                    name="website"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0 }}
                    tabIndex={-1}
                    autoComplete="off"
                  />

                  {formConfig.fields.map((fieldId) => {
                    const config = FIELD_CONFIG[fieldId];
                    if (!config) return null;
                    const Icon = config.icon;

                    if (fieldId === "colaboradores") {
                      return (
                        <div key={fieldId} className="space-y-1.5">
                          <Label className="flex items-center gap-1.5 text-xs font-medium">
                            <Icon className="h-3.5 w-3.5" /> {config.label}
                          </Label>
                          <Select value={values.colaboradores || ""} onValueChange={(v) => setValues({ ...values, colaboradores: v })}>
                            <SelectTrigger className="h-11"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              {COLABORADORES_OPTIONS.map((opt) => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    }

                    if (fieldId === "mensagem") {
                      return (
                        <div key={fieldId} className="space-y-1.5">
                          <Label className="flex items-center gap-1.5 text-xs font-medium">
                            <Icon className="h-3.5 w-3.5" /> {config.label}
                          </Label>
                          <Textarea
                            maxLength={1000}
                            value={values.mensagem || ""}
                            onChange={(e) => setValues({ ...values, mensagem: e.target.value })}
                            placeholder={config.placeholder}
                            rows={3}
                          />
                        </div>
                      );
                    }

                    return (
                      <div key={fieldId} className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 text-xs font-medium">
                          <Icon className="h-3.5 w-3.5" /> {config.label}
                        </Label>
                        <Input
                          type={config.type || "text"}
                          required={fieldId === "nome" || fieldId === "telefone"}
                          maxLength={fieldId === "email" ? 255 : 200}
                          value={values[fieldId] || ""}
                          onChange={(e) => setValues({ ...values, [fieldId]: e.target.value })}
                          placeholder={config.placeholder}
                          className="h-11"
                        />
                      </div>
                    );
                  })}

                  {error && (
                    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                      <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full gap-2 h-12 text-base font-semibold border-0 hover:opacity-90 transition-opacity"
                    disabled={submitting}
                    style={{
                      background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                      color: "white",
                    }}
                  >
                    {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    {ctaText}
                  </Button>

                  <p className="text-[11px] text-center opacity-60 pt-2">
                    Seus dados estão protegidos e não serão compartilhados.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 pt-8 border-t border-white/5">
          <p className="text-xs opacity-50">
            © {new Date().getFullYear()} {formConfig.tenant_name || "Accord"} — Todos os direitos reservados
          </p>
        </div>
      </div>
    </div>
  );
}
