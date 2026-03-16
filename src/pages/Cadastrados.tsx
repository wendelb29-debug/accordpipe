import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Users, UserCheck, Clock, FileWarning } from "lucide-react";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cadastrados</h1>
        <p className="text-sm text-muted-foreground">Base de clientes cadastrados no sistema</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{counts.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-lg bg-green-500/10">
              <UserCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{counts.concluido}</p>
              <p className="text-xs text-muted-foreground">Concluídos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{counts.pendente}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-lg bg-red-500/10">
              <FileWarning className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{counts.doc_pendente}</p>
              <p className="text-xs text-muted-foreground">Doc. Pendente</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Clientes Cadastrados</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
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
                        <TableCell>
                          <Badge variant="outline">{depCount}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={st.color} variant="outline">{st.label}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(r.created_at).toLocaleDateString("pt-BR")}
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
    </div>
  );
}
