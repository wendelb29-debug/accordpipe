import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, RotateCcw, Users } from "lucide-react";
import { toast } from "sonner";

interface UserSignature {
  id: string;
  user_id: string;
  full_name: string;
  cpf: string;
  birth_date: string | null;
  email: string | null;
  phone: string | null;
  cargo: string | null;
  signature_image_url: string | null;
  signature_type: string;
  created_at: string;
}

export default function Assinaturas() {
  const { isMaster, isAdmin, isCeo } = useAuth();
  const [signatures, setSignatures] = useState<UserSignature[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewSig, setViewSig] = useState<UserSignature | null>(null);

  const canManage = isMaster || isAdmin || isCeo;

  useEffect(() => {
    fetchSignatures();
  }, []);

  const fetchSignatures = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_signatures" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      toast.error("Erro ao carregar assinaturas");
    } else {
      setSignatures((data as any[]) || []);
    }
    setLoading(false);
  };

  const handleReset = async (userId: string) => {
    if (!confirm("Isso permitirá que o usuário recrie sua assinatura. Continuar?")) return;
    // Delete signature and reset profile flag
    const { error: delErr } = await supabase
      .from("user_signatures" as any)
      .delete()
      .eq("user_id", userId);
    if (delErr) {
      toast.error("Erro ao resetar assinatura");
      return;
    }
    const { error: profErr } = await supabase
      .from("profiles")
      .update({ signature_completed: false } as any)
      .eq("user_id", userId);
    if (profErr) {
      toast.error("Erro ao atualizar perfil");
      return;
    }
    toast.success("Assinatura resetada com sucesso");
    fetchSignatures();
  };

  const maskCPF = (cpf: string) => {
    if (!cpf) return "";
    const c = cpf.replace(/\D/g, "");
    return c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  if (!canManage) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Acesso restrito.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assinaturas de Usuários</h1>
          <p className="text-sm text-muted-foreground">Gerencie as assinaturas digitais dos usuários</p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Users className="h-3 w-3" />
          {signatures.length} assinatura(s)
        </Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : signatures.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma assinatura cadastrada
                  </TableCell>
                </TableRow>
              ) : (
                signatures.map((sig) => (
                  <TableRow key={sig.id}>
                    <TableCell className="font-medium">{sig.full_name}</TableCell>
                    <TableCell>{sig.email}</TableCell>
                    <TableCell>{maskCPF(sig.cpf)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {sig.signature_type === "draw" ? "Desenho" : sig.signature_type === "typed" ? "Digitada" : "Upload"}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(sig.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewSig(sig)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleReset(sig.user_id)}>
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={!!viewSig} onOpenChange={() => setViewSig(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assinatura de {viewSig?.full_name}</DialogTitle>
          </DialogHeader>
          {viewSig && (
            <div className="space-y-3 text-sm">
              <p><strong>CPF:</strong> {maskCPF(viewSig.cpf)}</p>
              {viewSig.email && <p><strong>Email:</strong> {viewSig.email}</p>}
              {viewSig.phone && <p><strong>Telefone:</strong> {viewSig.phone}</p>}
              {viewSig.cargo && <p><strong>Cargo:</strong> {viewSig.cargo}</p>}
              {viewSig.birth_date && (
                <p><strong>Nascimento:</strong> {new Date(viewSig.birth_date + "T12:00:00").toLocaleDateString("pt-BR")}</p>
              )}
              <div className="border rounded-lg p-4 bg-card flex justify-center">
                {viewSig.signature_image_url ? (
                  <img src={viewSig.signature_image_url} alt="Assinatura" className="max-h-[100px] object-contain" />
                ) : (
                  <span className="text-muted-foreground">Sem imagem</span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
