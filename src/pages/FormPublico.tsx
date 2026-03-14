import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { User, Mail, Phone, Building2, MapPin, Users, MessageSquare, Send, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import orbitLogo from "@/assets/orbit-logo.png";

interface FormConfig {
  id: string;
  name: string;
  description: string | null;
  fields: string[];
  servidor_id: string;
  is_active: boolean;
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

export default function FormPublico() {
  const { formId } = useParams<{ formId: string }>();
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [honeypot, setHoneypot] = useState("");
  const [timestamp] = useState(Date.now());

  useEffect(() => {
    const fetchForm = async () => {
      if (!formId) return;
      const { data } = await supabase
        .from("crm_forms")
        .select("id, name, description, fields, servidor_id, is_active")
        .eq("id", formId)
        .eq("is_active", true)
        .maybeSingle();
      setFormConfig(data as unknown as FormConfig | null);
      setLoading(false);
    };
    fetchForm();
  }, [formId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formConfig) return;

    if (!values.nome?.trim()) { setError("Nome é obrigatório"); return; }
    if (!values.telefone?.trim() || values.telefone.trim().length < 8) { setError("Telefone é obrigatório"); return; }

    setSubmitting(true);
    setError("");

    try {
      const res = await supabase.functions.invoke("lead-form-webhook", {
        body: {
          nome: values.nome,
          telefone: values.telefone,
          email: values.email || "",
          empresa: values.empresa || "",
          colaboradores: values.colaboradores || "",
          mensagem: values.mensagem || "",
          cidade: values.cidade || "",
          origem: `Formulário: ${formConfig.name}`,
          form_id: formConfig.id,
          servidor_id: formConfig.servidor_id,
          _honeypot: honeypot,
          _timestamp: timestamp,
        },
      });

      if (res.error) {
        setError("Erro ao enviar. Tente novamente.");
      } else {
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!formConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-bold mb-2">Formulário indisponível</h2>
            <p className="text-muted-foreground">Este formulário não existe ou está inativo.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-emerald-500" />
            <h2 className="text-2xl font-bold mb-2 text-foreground">Enviado com sucesso!</h2>
            <p className="text-muted-foreground">Recebemos suas informações. Um consultor entrará em contato.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="max-w-lg w-full shadow-lg">
        <CardHeader className="text-center space-y-3">
          <img src={orbitLogo} alt="Logo" className="h-10 mx-auto" />
          <CardTitle className="text-xl">{formConfig.name}</CardTitle>
          {formConfig.description && <CardDescription>{formConfig.description}</CardDescription>}
        </CardHeader>
        <CardContent>
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
                  <div key={fieldId} className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5" /> {config.label}
                    </Label>
                    <Select value={values.colaboradores || ""} onValueChange={(v) => setValues({ ...values, colaboradores: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
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
                  <div key={fieldId} className="space-y-2">
                    <Label className="flex items-center gap-1.5">
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
                <div key={fieldId} className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5" /> {config.label}
                  </Label>
                  <Input
                    type={config.type || "text"}
                    required={fieldId === "nome" || fieldId === "telefone"}
                    maxLength={fieldId === "email" ? 255 : 200}
                    value={values[fieldId] || ""}
                    onChange={(e) => setValues({ ...values, [fieldId]: e.target.value })}
                    placeholder={config.placeholder}
                  />
                </div>
              );
            })}

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            <Button type="submit" className="w-full gap-2" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
