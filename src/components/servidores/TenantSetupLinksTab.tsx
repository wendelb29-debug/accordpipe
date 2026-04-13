import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link2, Copy, Check, Eye, Loader2, Building2, Clock, CheckCircle2, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface SetupRequest {
  id: string;
  token: string;
  status: string;
  cnpj: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  responsavel: string | null;
  email: string | null;
  telefone: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  brand_primary_color: string | null;
  brand_secondary_color: string | null;
  brand_accent_color: string | null;
  brand_bg_color: string | null;
  brand_text_color: string | null;
  reviewer_notes: string | null;
  submitted_at: string | null;
  activated_at: string | null;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "Aguardando preenchimento", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  submitted: { label: "Enviado pelo cliente", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  reviewed: { label: "Revisado", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  activated: { label: "Ativado", color: "bg-green-500/10 text-green-600 border-green-500/20" },
  expired: { label: "Expirado", color: "bg-muted text-muted-foreground border-border" },
};

export default function TenantSetupLinksTab() {
  const [requests, setRequests] = useState<SetupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [reviewRequest, setReviewRequest] = useState<SetupRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [activating, setActivating] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchRequests = useCallback(async () => {
    const { data } = await supabase
      .from("tenant_setup_requests")
      .select("*")
      .order("created_at", { ascending: false });
    setRequests((data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleGenerate = async () => {
    setGenerating(true);
    const { error } = await supabase.from("tenant_setup_requests").insert({
      created_by: user?.id,
    } as any);
    if (error) {
      toast.error("Erro ao gerar link");
      console.error(error);
    } else {
      toast.success("Link gerado com sucesso!");
      await fetchRequests();
    }
    setGenerating(false);
  };

  const getLink = (token: string) => `${window.location.origin}/setup-tenant/${token}`;

  const handleCopy = (req: SetupRequest) => {
    navigator.clipboard.writeText(getLink(req.token));
    setCopiedId(req.id);
    toast.success("Link copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleActivate = async () => {
    if (!reviewRequest) return;
    setActivating(true);

    // Navigate to NovoServidor with pre-filled data from the request
    const params = new URLSearchParams();
    params.set("from_setup", reviewRequest.id);
    
    // Update status to activated
    await supabase
      .from("tenant_setup_requests")
      .update({
        status: "activated",
        reviewed_by: user?.id,
        reviewer_notes: reviewNotes || null,
        activated_at: new Date().toISOString(),
      } as any)
      .eq("id", reviewRequest.id);

    // Navigate to create tenant with data pre-filled
    navigate(`/servidores/novo?from_setup=${reviewRequest.id}`);
    setActivating(false);
    setReviewRequest(null);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("tenant_setup_requests").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir");
    } else {
      toast.success("Link removido");
      setRequests((prev) => prev.filter((r) => r.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-primary">Links de Configuração</h3>
          <p className="text-sm text-muted-foreground mt-1">Gere links para clientes configurarem o próprio tenant.</p>
        </div>
        <Button onClick={handleGenerate} disabled={generating} className="gap-2">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
          Gerar Novo Link
        </Button>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Link2 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Nenhum link gerado ainda.</p>
            <p className="text-xs text-muted-foreground mt-1">Clique em "Gerar Novo Link" para começar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const status = STATUS_MAP[req.status] || STATUS_MAP.pending;
            return (
              <Card key={req.id} className="transition-all hover:shadow-md">
                <CardContent className="py-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    {req.status === "submitted" ? (
                      <Send className="h-5 w-5 text-primary" />
                    ) : req.status === "activated" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm text-foreground truncate">
                        {req.nome_fantasia || req.razao_social || "Aguardando preenchimento"}
                      </p>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${status.color}`}>
                        {status.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Criado em {format(new Date(req.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                      {req.cnpj && <span>• CNPJ: {req.cnpj}</span>}
                      {req.submitted_at && (
                        <span>• Enviado em {format(new Date(req.submitted_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopy(req)} title="Copiar link">
                      {copiedId === req.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    {req.status === "submitted" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => { setReviewRequest(req); setReviewNotes(req.reviewer_notes || ""); }}
                        title="Revisar e ativar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {req.status === "pending" && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(req.id)} title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewRequest} onOpenChange={(o) => !o && setReviewRequest(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Revisar Configuração
            </DialogTitle>
            <DialogDescription>Revise os dados enviados pelo cliente antes de ativar o tenant.</DialogDescription>
          </DialogHeader>

          {reviewRequest && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "CNPJ", value: reviewRequest.cnpj },
                  { label: "Razão Social", value: reviewRequest.razao_social },
                  { label: "Nome Fantasia", value: reviewRequest.nome_fantasia },
                  { label: "Responsável", value: reviewRequest.responsavel },
                  { label: "E-mail", value: reviewRequest.email },
                  { label: "Telefone", value: reviewRequest.telefone },
                  { label: "CEP", value: reviewRequest.cep },
                  { label: "Endereço", value: [reviewRequest.endereco, reviewRequest.numero, reviewRequest.complemento].filter(Boolean).join(", ") },
                  { label: "Bairro", value: reviewRequest.bairro },
                  { label: "Cidade/Estado", value: [reviewRequest.cidade, reviewRequest.estado].filter(Boolean).join(" - ") },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-medium text-foreground">{item.value || "—"}</p>
                  </div>
                ))}
              </div>

              {(reviewRequest.brand_primary_color || reviewRequest.brand_secondary_color) && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Cores da Marca</p>
                  <div className="flex gap-2">
                    {[
                      reviewRequest.brand_primary_color,
                      reviewRequest.brand_secondary_color,
                      reviewRequest.brand_accent_color,
                      reviewRequest.brand_bg_color,
                      reviewRequest.brand_text_color,
                    ].filter(Boolean).map((color, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <div className="h-6 w-6 rounded border border-border" style={{ backgroundColor: color! }} />
                        <span className="text-xs font-mono text-muted-foreground">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Notas do revisor (opcional)</Label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Observações sobre esta configuração..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewRequest(null)}>Fechar</Button>
            <Button onClick={handleActivate} disabled={activating} className="gap-2">
              {activating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Criar Tenant com estes dados
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
