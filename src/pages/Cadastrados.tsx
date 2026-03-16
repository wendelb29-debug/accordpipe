import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Search, Users, UserCheck, Clock, FileWarning, Eye, Paperclip, FileSignature, Download, User, UsersRound, Pencil, Save, Loader2 } from "lucide-react";

const statusLabels: Record<string, { label: string; color: string }> = {
  pendente: { label: "Cadastro Pendente", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  em_analise: { label: "Dados em Análise", color: "bg-blue-100 text-blue-800 border-blue-200" },
  concluido: { label: "Cadastro Concluído", color: "bg-green-100 text-green-800 border-green-200" },
  doc_pendente: { label: "Doc. Pendente", color: "bg-red-100 text-red-800 border-red-200" },
};

export default function Cadastrados() {
  const { profile } = useAuth();
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedReg, setSelectedReg] = useState<any | null>(null);
  const [contracts, setContracts] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    fetchRegistrations();
  }, [profile]);

  const fetchRegistrations = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const { data } = await supabase
      .from("crm_client_registrations")
      .select("*, crm_leads(*), crm_client_dependents(*)")
      .eq("servidor_id", profile.company_id)
      .order("created_at", { ascending: false });
    setRegistrations(data || []);
    setLoading(false);
  };

  const openDetail = async (reg: any) => {
    setSelectedReg(reg);
    setEditing(false);
    setEditData({
      nome_completo: reg.nome_completo || "",
      cpf: reg.cpf || "",
      rg: reg.rg || "",
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
    });
    if (reg.crm_leads?.company_id) {
      const { data } = await supabase
        .from("contracts")
        .select("*")
        .eq("company_id", reg.crm_leads.company_id)
        .order("created_at", { ascending: false });
      setContracts(data || []);
    } else {
      setContracts([]);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedReg?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("crm_client_registrations")
        .update(editData as any)
        .eq("id", selectedReg.id);
      if (error) throw error;
      // Update local state
      const updated = { ...selectedReg, ...editData };
      setSelectedReg(updated);
      setRegistrations(prev => prev.map(r => r.id === selectedReg.id ? { ...r, ...editData } : r));
      setEditing(false);
    } catch {
      // toast would be nice but keeping it simple
    } finally {
      setSaving(false);
    }
  };

  const filtered = registrations.filter((r) => {
    const term = search.toLowerCase();
    return (
      (r.nome_completo || "").toLowerCase().includes(term) ||
      (r.cpf || "").includes(term) ||
      (r.email || "").toLowerCase().includes(term) ||
      (r.crm_leads?.company_name || "").toLowerCase().includes(term)
    );
  });

  const counts = {
    total: registrations.length,
    concluido: registrations.filter((r) => r.status === "concluido").length,
    pendente: registrations.filter((r) => r.status === "pendente").length,
    doc_pendente: registrations.filter((r) => r.status === "doc_pendente").length,
  };

  const InfoRow = ({ label, value, field }: { label: string; value: string; field?: string }) => (
    <div className="grid grid-cols-3 gap-2 py-1.5 items-center">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      {editing && field ? (
        <Input
          className="col-span-2 h-8 text-sm"
          value={editData[field] || ""}
          onChange={(e) => setEditData((prev: any) => ({ ...prev, [field]: e.target.value }))}
        />
      ) : (
        <span className="text-sm text-foreground col-span-2">{value || "—"}</span>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cadastrados</h1>
        <p className="text-sm text-muted-foreground">Base de clientes cadastrados no sistema</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold text-foreground">{counts.total}</p><p className="text-xs text-muted-foreground">Total</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-lg bg-green-500/10"><UserCheck className="h-5 w-5 text-green-600" /></div>
            <div><p className="text-2xl font-bold text-foreground">{counts.concluido}</p><p className="text-xs text-muted-foreground">Concluídos</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-lg bg-yellow-500/10"><Clock className="h-5 w-5 text-yellow-600" /></div>
            <div><p className="text-2xl font-bold text-foreground">{counts.pendente}</p><p className="text-xs text-muted-foreground">Pendentes</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-lg bg-red-500/10"><FileWarning className="h-5 w-5 text-red-600" /></div>
            <div><p className="text-2xl font-bold text-foreground">{counts.doc_pendente}</p><p className="text-xs text-muted-foreground">Doc. Pendente</p></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Clientes Cadastrados</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome, CPF, email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum cadastro encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Empresa (Lead)</TableHead>
                    <TableHead>Dependentes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const st = statusLabels[r.status] || statusLabels.pendente;
                    const depCount = r.crm_client_dependents?.length || 0;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.nome_completo || "—"}</TableCell>
                        <TableCell>{r.cpf || "—"}</TableCell>
                        <TableCell>{r.email || "—"}</TableCell>
                        <TableCell>{r.crm_leads?.company_name || "—"}</TableCell>
                        <TableCell><Badge variant="outline">{depCount}</Badge></TableCell>
                        <TableCell><Badge className={st.color} variant="outline">{st.label}</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-sm">{new Date(r.created_at).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell className="text-center">
                          <Button size="icon" variant="ghost" onClick={() => openDetail(r)} title="Ver cadastro completo">
                            <Eye className="h-4 w-4 text-primary" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedReg} onOpenChange={(open) => !open && setSelectedReg(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {editing ? "Editar Cadastro" : "Cadastro Completo"}
              </DialogTitle>
              <div className="flex items-center gap-2">
                {editing ? (
                  <Button size="sm" onClick={handleSaveEdit} disabled={saving} className="gap-1.5">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salvar
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-1.5">
                    <Pencil className="h-4 w-4" /> Editar
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {selectedReg && (
            <div className="space-y-6">
              {/* Status do cadastro */}
              <div className="flex items-center gap-2">
                <Badge className={(statusLabels[selectedReg.status] || statusLabels.pendente).color} variant="outline">
                  {(statusLabels[selectedReg.status] || statusLabels.pendente).label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Empresa: {selectedReg.crm_leads?.company_name || "—"}
                </span>
              </div>

              {/* Status do cliente (financeiro) */}
              <Card className="border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Status do Cliente</p>
                      <p className="text-lg font-bold text-foreground mt-0.5">
                        {selectedReg.client_status === "ativo" ? "🟢 ATIVO" :
                         selectedReg.client_status === "inadimplente" ? "🔴 INADIMPLENTE" :
                         selectedReg.client_status === "cancelado" ? "⚫ CANCELADO" :
                         "🟡 PENDENTE"}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground space-y-0.5">
                      {selectedReg.plano_contratado && <p>Plano: <strong className="text-foreground">{selectedReg.plano_contratado}</strong></p>}
                      {selectedReg.valor_mensal > 0 && <p>Valor: <strong className="text-foreground">R$ {Number(selectedReg.valor_mensal).toFixed(2)}</strong></p>}
                      {selectedReg.data_adesao && <p>Adesão: <strong className="text-foreground">{new Date(selectedReg.data_adesao).toLocaleDateString("pt-BR")}</strong></p>}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dados do Titular */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" /> Dados do Titular
                </h3>
                <Card>
                  <CardContent className="p-4 space-y-0.5">
                    <InfoRow label="Nome completo" value={selectedReg.nome_completo} field="nome_completo" />
                    <InfoRow label="CPF" value={selectedReg.cpf} field="cpf" />
                    <InfoRow label="RG" value={selectedReg.rg} field="rg" />
                    <InfoRow label="Data de nascimento" value={selectedReg.data_nascimento ? new Date(selectedReg.data_nascimento).toLocaleDateString("pt-BR") : ""} field="data_nascimento" />
                    <InfoRow label="E-mail" value={selectedReg.email} field="email" />
                    <InfoRow label="Nome do pai" value={selectedReg.nome_pai} field="nome_pai" />
                    <InfoRow label="Nome da mãe" value={selectedReg.nome_mae} field="nome_mae" />
                  </CardContent>
                </Card>
              </div>

              {/* Endereço */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Endereço</h3>
                <Card>
                  <CardContent className="p-4 space-y-0.5">
                    <InfoRow label="CEP" value={selectedReg.cep} field="cep" />
                    <InfoRow label="Endereço" value={selectedReg.endereco} field="endereco" />
                    <InfoRow label="Número" value={selectedReg.numero} field="numero" />
                    <InfoRow label="Bairro" value={selectedReg.bairro} field="bairro" />
                    <InfoRow label="Cidade" value={selectedReg.cidade} field="cidade" />
                    <InfoRow label="Estado" value={selectedReg.estado} field="estado" />
                  </CardContent>
                </Card>
              </div>

              {/* Documento anexado */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Paperclip className="h-4 w-4" /> Documento Anexado
                </h3>
                {selectedReg.comprovante_url ? (
                  <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Paperclip className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm font-medium text-foreground">Comprovante de endereço</p>
                          <p className="text-xs text-muted-foreground">Documento disponível para download</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" asChild className="gap-1.5">
                        <a href={selectedReg.comprovante_url} target="_blank" rel="noreferrer">
                          <Download className="h-4 w-4" /> Baixar
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p>
                )}
              </div>

              {/* Dependentes */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <UsersRound className="h-4 w-4" /> Dependentes ({selectedReg.crm_client_dependents?.length || 0})
                </h3>
                {selectedReg.crm_client_dependents?.length > 0 ? (
                  <div className="space-y-2">
                    {selectedReg.crm_client_dependents.map((dep: any, i: number) => (
                      <Card key={dep.id || i}>
                        <CardContent className="p-3 space-y-0.5">
                          <InfoRow label="Nome" value={dep.nome_completo} />
                          <InfoRow label="Nascimento" value={dep.data_nascimento ? new Date(dep.data_nascimento).toLocaleDateString("pt-BR") : ""} />
                          <InfoRow label="Parentesco" value={dep.grau_parentesco} />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum dependente cadastrado.</p>
                )}
              </div>

              {/* Contratos */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <FileSignature className="h-4 w-4" /> Contratos
                </h3>
                {contracts.length > 0 ? (
                  <div className="space-y-2">
                    {contracts.map((c) => (
                      <Card key={c.id}>
                        <CardContent className="p-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-foreground">{c.code}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.signature_status === "signed" ? "✅ Assinado" : "⏳ Pendente"} · {new Date(c.created_at).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {c.signature_photo_url && (
                              <Button size="sm" variant="ghost" asChild title="Ver assinatura">
                                <a href={c.signature_photo_url} target="_blank" rel="noreferrer">
                                  <Eye className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            {c.signature_link && (
                              <Button size="sm" variant="outline" asChild className="gap-1">
                                <a href={c.signature_link} target="_blank" rel="noreferrer">
                                  <FileSignature className="h-4 w-4" /> Contrato
                                </a>
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum contrato vinculado.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
