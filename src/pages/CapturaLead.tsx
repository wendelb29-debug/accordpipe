import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Building2, User, Mail, Phone, StickyNote, Send, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import orbitLogo from "@/assets/orbit-logo.png";

export default function CapturaLead() {
  const { servidorId } = useParams<{ servidorId: string }>();
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
    if (!form.contact_name.trim() || !form.company_name.trim()) {
      setError("Preencha os campos obrigatórios");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const res = await supabase.functions.invoke("create-lead", {
        body: {
          servidor_id: servidorId,
          company_name: form.company_name,
          contact_name: form.contact_name,
          email: form.email,
          phone: form.phone,
          notes: form.notes,
          source: "Formulário Web",
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!servidor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-bold mb-2">Formulário indisponível</h2>
            <p className="text-muted-foreground">Este link não é válido ou o servidor está inativo.</p>
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
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-2xl font-bold mb-2 text-foreground">Enviado com sucesso!</h2>
            <p className="text-muted-foreground">Seus dados foram recebidos. Entraremos em contato em breve.</p>
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
          <CardTitle className="text-xl">
            {servidor.nome_fantasia || servidor.razao_social}
          </CardTitle>
          <CardDescription>
            Preencha seus dados para entrarmos em contato
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Nome completo *
              </Label>
              <Input
                required
                maxLength={200}
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Empresa *
              </Label>
              <Input
                required
                maxLength={200}
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                placeholder="Nome da sua empresa"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Email
                </Label>
                <Input
                  type="email"
                  maxLength={255}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="seu@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> Telefone
                </Label>
                <Input
                  maxLength={30}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <StickyNote className="h-3.5 w-3.5" /> Mensagem
              </Label>
              <Textarea
                maxLength={1000}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Como podemos ajudar?"
                rows={3}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
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
