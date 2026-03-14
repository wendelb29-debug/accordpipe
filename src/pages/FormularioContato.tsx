import { useState, useRef } from "react";
import { User, Phone, Mail, Building2, FileText, Send, CheckCircle2, Loader2, AlertCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { supabase } from "@/integrations/supabase/client";
import orbitLogo from "@/assets/orbit-logo.png";

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").substring(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const formatCnpj = (value: string) => {
  const digits = value.replace(/\D/g, "").substring(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

export default function FormularioContato() {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const timestampRef = useRef(Date.now());

  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    email: "",
    empresa: "",
    colaboradores: "",
    mensagem: "",
    _honeypot: "", // anti-spam
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.nome.trim()) {
      setError("Nome completo é obrigatório");
      return;
    }
    if (form.telefone.replace(/\D/g, "").length < 10) {
      setError("Informe um telefone válido com DDD");
      return;
    }

    setSubmitting(true);

    try {
      const res = await supabase.functions.invoke("lead-form-webhook", {
        body: {
          nome: form.nome.trim(),
          telefone: form.telefone.trim(),
          email: form.email.trim() || undefined,
          empresa: form.empresa.trim() || undefined,
          colaboradores: form.colaboradores || undefined,
          mensagem: form.mensagem.trim() || undefined,
          origem: "Landing Page",
          _honeypot: form._honeypot,
          _timestamp: timestampRef.current,
        },
      });

      if (res.error || res.data?.error) {
        setError(res.data?.error || "Erro ao enviar. Tente novamente.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Erro ao enviar formulário. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10 p-4">
        <Card className="max-w-md w-full text-center shadow-xl border-0 bg-card/95 backdrop-blur">
          <CardContent className="p-10">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-foreground">Recebemos seu contato!</h2>
            <p className="text-muted-foreground text-base leading-relaxed">
              Um especialista entrará em contato em breve pelo WhatsApp informado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10 p-4">
      <Card className="max-w-lg w-full shadow-xl border-0 bg-card/95 backdrop-blur">
        <CardHeader className="text-center space-y-4 pb-2">
          <img src={orbitLogo} alt="Orbit" className="h-10 mx-auto" />
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight">Fale com um especialista</CardTitle>
            <CardDescription className="text-base mt-1.5">
              Preencha o formulário e entraremos em contato
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Honeypot - hidden from users */}
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={form._honeypot}
                onChange={(e) => setForm({ ...form, _honeypot: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <User className="h-3.5 w-3.5 text-primary" /> Nome completo <span className="text-destructive">*</span>
              </Label>
              <Input
                required
                maxLength={200}
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Seu nome completo"
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <Phone className="h-3.5 w-3.5 text-primary" /> Telefone (WhatsApp) <span className="text-destructive">*</span>
              </Label>
              <Input
                required
                maxLength={16}
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: formatPhone(e.target.value) })}
                placeholder="(00) 00000-0000"
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <Mail className="h-3.5 w-3.5 text-primary" /> Email
              </Label>
              <Input
                type="email"
                maxLength={255}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="seu@email.com"
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <Building2 className="h-3.5 w-3.5 text-primary" /> Empresa
                </Label>
                <Input
                  maxLength={200}
                  value={form.empresa}
                  onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                  placeholder="Nome da empresa"
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <Users className="h-3.5 w-3.5 text-primary" /> Colaboradores
                </Label>
                <Select value={form.colaboradores} onValueChange={(v) => setForm({ ...form, colaboradores: v })}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1 a 10</SelectItem>
                    <SelectItem value="11-50">11 a 50</SelectItem>
                    <SelectItem value="51-200">51 a 200</SelectItem>
                    <SelectItem value="201-500">201 a 500</SelectItem>
                    <SelectItem value="500+">Mais de 500</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <MessageSquare className="h-3.5 w-3.5 text-primary" /> Mensagem / Necessidade
              </Label>
              <Textarea
                maxLength={500}
                value={form.mensagem}
                onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
                placeholder="Conte-nos como podemos ajudar..."
                rows={3}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-12 gap-2 text-base font-semibold" disabled={submitting}>
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              Enviar
            </Button>

            <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
              <Shield className="h-3 w-3" /> Seus dados estão protegidos e não serão compartilhados.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
