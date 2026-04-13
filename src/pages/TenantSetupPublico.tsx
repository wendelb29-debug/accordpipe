import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Loader2, Check, Search, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

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

export default function TenantSetupPublico() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("dados");

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
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      if (data.status === "submitted" || data.status === "activated") {
        setSubmitted(true);
      }
      setRequestId(data.id);
      // Pre-fill if data exists
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

  const handleCnpjSearch = async () => {
    const digits = cleanDigits(form.cnpj);
    if (digits.length !== 14) { toast.error("Digite um CNPJ válido"); return; }
    setCnpjLoading(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
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
    } catch { toast.error("CNPJ não encontrado."); }
    finally { setCnpjLoading(false); }
  };

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

  const handleSubmit = async () => {
    if (!form.cnpj || !form.razao_social) {
      toast.error("CNPJ e Razão Social são obrigatórios");
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <Building2 className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Link inválido ou expirado</h1>
            <p className="text-muted-foreground text-sm">
              Este link de configuração não foi encontrado ou já não está mais disponível.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Configuração enviada!</h1>
            <p className="text-muted-foreground text-sm">
              Seus dados foram enviados com sucesso. Nossa equipe irá revisar e ativar seu ambiente em breve.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sections = [
    { id: "dados", icon: Building2, label: "Dados Cadastrais" },
    { id: "identidade", icon: Palette, label: "Identidade Visual" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-foreground">Configuração do Ambiente</h1>
          <p className="text-sm text-muted-foreground">Preencha os dados da sua empresa para configurar o ambiente.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 flex gap-6">
        <div className="w-52 shrink-0 space-y-1">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
                activeSection === s.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <s.icon className="h-4 w-4 shrink-0" />
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-6">
          {activeSection === "dados" && (
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <Label className="font-semibold">CNPJ *</Label>
                  <div className="flex gap-2">
                    <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: formatCnpj(e.target.value) })} placeholder="00.000.000/0000-00" className="flex-1" />
                    <Button variant="secondary" size="icon" onClick={handleCnpjSearch} disabled={cnpjLoading}>
                      {cnpjLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-semibold">Razão Social *</Label>
                    <Input value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} placeholder="Razão Social" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nome Fantasia</Label>
                    <Input value={form.nome_fantasia} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} placeholder="Nome Fantasia" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Responsável</Label>
                    <Input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} placeholder="Nome do responsável" />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@empresa.com" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: formatPhone(e.target.value) })} placeholder="(00) 00000-0000" />
                  </div>
                  <div className="space-y-2">
                    <Label>CEP</Label>
                    <div className="flex gap-2">
                      <Input
                        value={form.cep}
                        onChange={(e) => {
                          const formatted = formatCep(e.target.value);
                          setForm({ ...form, cep: formatted });
                          if (cleanDigits(formatted).length === 8) handleCepSearch(formatted);
                        }}
                        placeholder="00000-000"
                        className="flex-1"
                      />
                      {cepLoading && <Loader2 className="h-4 w-4 animate-spin self-center text-muted-foreground" />}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Endereço</Label>
                    <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} placeholder="Rua, Avenida..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Número</Label>
                    <Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} placeholder="Nº" />
                  </div>
                  <div className="space-y-2">
                    <Label>Complemento</Label>
                    <Input value={form.complemento} onChange={(e) => setForm({ ...form, complemento: e.target.value })} placeholder="Sala, Andar..." />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Bairro</Label>
                    <Input value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} placeholder="Bairro" />
                  </div>
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} placeholder="Cidade" />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Input value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })} placeholder="UF" maxLength={2} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "identidade" && (
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">Cores da Marca</h3>
                  <p className="text-xs text-muted-foreground mb-4">Defina as cores que serão utilizadas no seu ambiente.</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { key: "brand_primary_color", label: "Cor Primária" },
                    { key: "brand_secondary_color", label: "Cor Secundária" },
                    { key: "brand_accent_color", label: "Cor de Destaque" },
                    { key: "brand_bg_color", label: "Cor de Fundo" },
                    { key: "brand_text_color", label: "Cor do Texto" },
                  ].map((c) => (
                    <div key={c.key} className="space-y-2">
                      <Label className="text-sm">{c.label}</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={(form as any)[c.key]}
                          onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
                          className="h-10 w-10 rounded border border-border cursor-pointer"
                        />
                        <Input
                          value={(form as any)[c.key]}
                          onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
                          className="flex-1 font-mono text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end pt-4">
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2 px-8">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {submitting ? "Enviando..." : "Enviar Configuração"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
