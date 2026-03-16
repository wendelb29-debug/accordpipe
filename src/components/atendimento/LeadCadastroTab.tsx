import { useState, useEffect } from "react";
import { Plus, Trash2, Save, CheckCircle, Loader2, Upload, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CrmLead } from "@/hooks/useCrmLeads";
import { toast } from "sonner";

interface Dependent {
  id?: string;
  nome_completo: string;
  data_nascimento: string;
  grau_parentesco: string;
}

interface Registration {
  id?: string;
  lead_id: string;
  servidor_id: string;
  nome_completo: string;
  cpf: string;
  data_nascimento: string;
  email: string;
  nome_pai: string;
  nome_mae: string;
  cep: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  rg: string;
  comprovante_url: string;
  status: string;
}

interface LeadCadastroTabProps {
  lead: CrmLead;
  onUpdate: (id: string, updates: Partial<CrmLead>) => Promise<boolean>;
}

const parentescoOptions = [
  "Cônjuge", "Filho(a)", "Pai", "Mãe", "Irmão(ã)", "Avô(ó)", "Neto(a)", "Sogro(a)", "Genro/Nora", "Outro"
];

export function LeadCadastroTab({ lead, onUpdate }: LeadCadastroTabProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [registration, setRegistration] = useState<Registration>({
    lead_id: lead.id,
    servidor_id: lead.servidor_id,
    nome_completo: "",
    cpf: "",
    data_nascimento: "",
    email: "",
    nome_pai: "",
    nome_mae: "",
    cep: "",
    endereco: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
    rg: "",
    comprovante_url: "",
    status: "pendente",
  });
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchRegistration();
  }, [lead.id]);

  const fetchRegistration = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("crm_client_registrations" as any)
      .select("*")
      .eq("lead_id", lead.id)
      .maybeSingle();

    if (data) {
      const reg = data as any;
      setRegistration({
        id: reg.id,
        lead_id: reg.lead_id,
        servidor_id: reg.servidor_id,
        nome_completo: reg.nome_completo || "",
        cpf: reg.cpf || "",
        data_nascimento: reg.data_nascimento || "",
        email: reg.email || "",
        nome_pai: reg.nome_pai || "",
        nome_mae: reg.nome_mae || "",
        cep: reg.cep || "",
        endereco: reg.endereco || "",
        numero: reg.numero || "",
        bairro: reg.bairro || "",
        cidade: reg.cidade || "",
        estado: reg.estado || "",
        rg: reg.rg || "",
        comprovante_url: reg.comprovante_url || "",
        status: reg.status || "pendente",
      });

      // Fetch dependents
      const { data: deps } = await supabase
        .from("crm_client_dependents" as any)
        .select("*")
        .eq("registration_id", reg.id)
        .order("created_at");

      if (deps) {
        setDependents((deps as any[]).map(d => ({
          id: d.id,
          nome_completo: d.nome_completo,
          data_nascimento: d.data_nascimento || "",
          grau_parentesco: d.grau_parentesco || "",
        })));
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let regId = registration.id;

      if (regId) {
        // Update
        const { error } = await supabase
          .from("crm_client_registrations" as any)
          .update({
            nome_completo: registration.nome_completo,
            cpf: registration.cpf,
            data_nascimento: registration.data_nascimento || null,
            email: registration.email,
            nome_pai: registration.nome_pai,
            nome_mae: registration.nome_mae,
            cep: registration.cep,
            endereco: registration.endereco,
            numero: registration.numero,
            bairro: registration.bairro,
            cidade: registration.cidade,
            estado: registration.estado,
            rg: registration.rg,
            comprovante_url: registration.comprovante_url,
          } as any)
          .eq("id", regId);
        if (error) throw error;
      } else {
        // Insert
        const { data, error } = await supabase
          .from("crm_client_registrations" as any)
          .insert({
            lead_id: lead.id,
            servidor_id: lead.servidor_id,
            nome_completo: registration.nome_completo,
            cpf: registration.cpf,
            data_nascimento: registration.data_nascimento || null,
            email: registration.email,
            nome_pai: registration.nome_pai,
            nome_mae: registration.nome_mae,
            cep: registration.cep,
            endereco: registration.endereco,
            numero: registration.numero,
            bairro: registration.bairro,
            cidade: registration.cidade,
            estado: registration.estado,
            rg: registration.rg,
            comprovante_url: registration.comprovante_url,
            created_by_user_id: profile?.user_id,
            created_by_name: profile?.name,
          } as any)
          .select()
          .single();
        if (error) throw error;
        regId = (data as any).id;
        setRegistration(prev => ({ ...prev, id: regId! }));
      }

      // Save dependents
      if (regId) {
        // Delete existing
        await supabase.from("crm_client_dependents" as any).delete().eq("registration_id", regId);

        // Insert all
        if (dependents.length > 0) {
          const depsToInsert = dependents.map(d => ({
            registration_id: regId,
            nome_completo: d.nome_completo,
            data_nascimento: d.data_nascimento || null,
            grau_parentesco: d.grau_parentesco || null,
          }));
          await supabase.from("crm_client_dependents" as any).insert(depsToInsert);
        }
      }

      toast.success("Cadastro salvo com sucesso!");
    } catch (error: any) {
      console.error("Error saving registration:", error);
      toast.error("Erro ao salvar cadastro");
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!registration.nome_completo || !registration.cpf) {
      toast.error("Preencha pelo menos o nome e CPF do titular para finalizar.");
      return;
    }

    await handleSave();

    // Update registration status
    if (registration.id) {
      await supabase
        .from("crm_client_registrations" as any)
        .update({ status: "concluido" } as any)
        .eq("id", registration.id);
    }

    // Move lead to cadastro-concluido
    await onUpdate(lead.id, { stage: "cadastro-concluido", stage_entered_at: new Date().toISOString() } as any);

    setRegistration(prev => ({ ...prev, status: "concluido" }));
    toast.success("✅ Cadastro finalizado com sucesso!");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo deve ter no máximo 10MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `cadastros/${lead.id}/comprovante-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("documents").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);
      setRegistration(prev => ({ ...prev, comprovante_url: urlData.publicUrl }));
      toast.success("Comprovante enviado!");
    } catch {
      toast.error("Erro ao enviar arquivo");
    } finally {
      setUploading(false);
    }
  };

  const addDependent = () => {
    setDependents(prev => [...prev, { nome_completo: "", data_nascimento: "", grau_parentesco: "" }]);
  };

  const removeDependent = (index: number) => {
    setDependents(prev => prev.filter((_, i) => i !== index));
  };

  const updateDependent = (index: number, field: keyof Dependent, value: string) => {
    setDependents(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isFinalized = registration.status === "concluido";

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-primary" />
                <span className="font-medium">Titular:</span>
                <span>{registration.nome_completo || "Não preenchido"}</span>
              </div>
              <Separator orientation="vertical" className="h-5" />
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-medium">Dependentes:</span>
                <span>{dependents.length}</span>
              </div>
              <Separator orientation="vertical" className="h-5" />
              <Badge variant={isFinalized ? "default" : "secondary"}>
                {isFinalized ? "✅ Concluído" : "⏳ Pendente"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados do Titular */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4" />
            Dados do Titular
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Nome Completo *</Label>
              <Input className="text-sm" value={registration.nome_completo} onChange={(e) => setRegistration(prev => ({ ...prev, nome_completo: e.target.value }))} disabled={isFinalized} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">CPF *</Label>
              <Input className="text-sm" value={registration.cpf} onChange={(e) => setRegistration(prev => ({ ...prev, cpf: e.target.value }))} placeholder="000.000.000-00" disabled={isFinalized} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Data de Nascimento</Label>
              <Input type="date" className="text-sm" value={registration.data_nascimento} onChange={(e) => setRegistration(prev => ({ ...prev, data_nascimento: e.target.value }))} disabled={isFinalized} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">E-mail</Label>
              <Input className="text-sm" value={registration.email} onChange={(e) => setRegistration(prev => ({ ...prev, email: e.target.value }))} disabled={isFinalized} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">RG</Label>
              <Input className="text-sm" value={registration.rg} onChange={(e) => setRegistration(prev => ({ ...prev, rg: e.target.value }))} disabled={isFinalized} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Nome Completo do Pai</Label>
              <Input className="text-sm" value={registration.nome_pai} onChange={(e) => setRegistration(prev => ({ ...prev, nome_pai: e.target.value }))} disabled={isFinalized} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nome Completo da Mãe</Label>
              <Input className="text-sm" value={registration.nome_mae} onChange={(e) => setRegistration(prev => ({ ...prev, nome_mae: e.target.value }))} disabled={isFinalized} />
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">CEP</Label>
              <Input className="text-sm" value={registration.cep} onChange={(e) => setRegistration(prev => ({ ...prev, cep: e.target.value }))} placeholder="00000-000" disabled={isFinalized} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Endereço</Label>
              <Input className="text-sm" value={registration.endereco} onChange={(e) => setRegistration(prev => ({ ...prev, endereco: e.target.value }))} disabled={isFinalized} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Número</Label>
              <Input className="text-sm" value={registration.numero} onChange={(e) => setRegistration(prev => ({ ...prev, numero: e.target.value }))} disabled={isFinalized} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Bairro</Label>
              <Input className="text-sm" value={registration.bairro} onChange={(e) => setRegistration(prev => ({ ...prev, bairro: e.target.value }))} disabled={isFinalized} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cidade</Label>
              <Input className="text-sm" value={registration.cidade} onChange={(e) => setRegistration(prev => ({ ...prev, cidade: e.target.value }))} disabled={isFinalized} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Estado</Label>
              <Input className="text-sm" value={registration.estado} onChange={(e) => setRegistration(prev => ({ ...prev, estado: e.target.value }))} disabled={isFinalized} />
            </div>
          </div>

          {/* Comprovante upload */}
          <div className="space-y-1">
            <Label className="text-xs">Comprovante de Endereço</Label>
            {registration.comprovante_url ? (
              <div className="flex items-center gap-2">
                <a href={registration.comprovante_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                  Ver comprovante
                </a>
                {!isFinalized && (
                  <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setRegistration(prev => ({ ...prev, comprovante_url: "" }))}>
                    Trocar
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} disabled={uploading || isFinalized} className="text-xs" />
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dependentes */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Dependentes ({dependents.length})
            </CardTitle>
            {!isFinalized && (
              <Button size="sm" variant="outline" onClick={addDependent} className="gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" /> Adicionar Dependente
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {dependents.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum dependente adicionado</p>
          )}
          {dependents.map((dep, i) => (
            <Card key={i} className="bg-muted/30">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="grid grid-cols-3 gap-3 flex-1">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Nome Completo</Label>
                      <Input className="text-xs h-8" value={dep.nome_completo} onChange={(e) => updateDependent(i, "nome_completo", e.target.value)} disabled={isFinalized} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Data de Nascimento</Label>
                      <Input type="date" className="text-xs h-8" value={dep.data_nascimento} onChange={(e) => updateDependent(i, "data_nascimento", e.target.value)} disabled={isFinalized} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Grau de Parentesco</Label>
                      <Select value={dep.grau_parentesco} onValueChange={(v) => updateDependent(i, "grau_parentesco", v)} disabled={isFinalized}>
                        <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {parentescoOptions.map(o => (
                            <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {!isFinalized && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeDependent(i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {!isFinalized && (
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Cadastro
          </Button>
          <Button onClick={handleFinalize} disabled={saving} className="gap-1.5 bg-green-600 hover:bg-green-700 text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Finalizar Cadastro
          </Button>
        </div>
      )}
    </div>
  );
}
