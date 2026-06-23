import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import DOMPurify from "dompurify";
import { fmtCur, fmtDate, STATUS_LABEL } from "@/components/atendimento/proposta/utils";

export default function PropostaPublica() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [accepting, setAccepting] = useState(false);
  const [showAccept, setShowAccept] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [acceptName, setAcceptName] = useState("");
  const [acceptDoc, setAcceptDoc] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    if (!token) return;
    setLoading(true);
    const { data: res } = await supabase.rpc("get_proposal_by_public_token", { p_token: token });
    setData(res);
    setLoading(false);
    if (res) {
      const ip = await fetch("https://api.ipify.org?format=json").then(r => r.json()).catch(() => ({}));
      await supabase.rpc("record_proposal_public_view", {
        p_token: token, p_ip: ip?.ip || null, p_user_agent: navigator.userAgent,
      });
    }
  };

  useEffect(() => { load(); }, [token]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-muted/30"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!data?.proposal) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-6 text-center">
      <XCircle className="h-12 w-12 text-destructive mb-2" />
      <p className="text-lg font-semibold">Proposta não encontrada</p>
      <p className="text-sm text-muted-foreground">O link pode ter expirado ou estar incorreto.</p>
    </div>
  );

  const { proposal, items, company, lead } = data;
  const totals = proposal.totals || {};
  const status = STATUS_LABEL[proposal.status] || STATUS_LABEL.aberta;
  const accepted = !!proposal.public_accepted_at;
  const rejected = proposal.status === "recusada";

  const submitAccept = async () => {
    if (acceptName.trim().length < 3) { toast.error("Informe seu nome completo"); return; }
    const docDigits = acceptDoc.replace(/\D/g, "");
    if (docDigits.length < 11) { toast.error("CPF/CNPJ inválido"); return; }
    setAccepting(true);
    const ip = await fetch("https://api.ipify.org?format=json").then(r => r.json()).catch(() => ({}));
    const { error } = await supabase.rpc("accept_proposal_public", {
      p_token: token!, p_name: acceptName, p_doc: docDigits, p_ip: ip?.ip || null, p_user_agent: navigator.userAgent,
    });
    setAccepting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Proposta aceita com sucesso!");
    setShowAccept(false);
    load();
  };

  const submitReject = async () => {
    setAccepting(true);
    const ip = await fetch("https://api.ipify.org?format=json").then(r => r.json()).catch(() => ({}));
    await supabase.rpc("reject_proposal_public", {
      p_token: token!, p_reason: rejectReason || null, p_ip: ip?.ip || null, p_user_agent: navigator.userAgent,
    });
    setAccepting(false);
    setShowReject(false);
    toast.success("Resposta registrada");
    load();
  };

  return (
    <div className="min-h-screen bg-muted/30 py-6 px-3">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Header */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              {company?.logo_url ? (
                <img src={company.logo_url} alt="" className="h-16 w-16 rounded-md object-contain bg-muted" />
              ) : (
                <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center"><Building2 className="h-6 w-6 text-muted-foreground" /></div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{company?.razao_social}</p>
                <p className="text-xs text-muted-foreground">CNPJ: {company?.cnpj || "—"}</p>
              </div>
              <Badge className={status.color}>{status.label}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Title */}
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Sigla {proposal.control_code} · v{proposal.version}</p>
            <h1 className="text-xl font-bold mt-1">{proposal.titulo}</h1>
            <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
              <div><p className="text-muted-foreground">Cliente</p><p className="font-medium">{lead?.name || "—"}</p></div>
              <div><p className="text-muted-foreground">Emissão</p><p className="font-medium">{fmtDate(proposal.created_date)}</p></div>
              <div><p className="text-muted-foreground">Validade</p><p className="font-medium">{proposal.validity_days} dias</p></div>
            </div>
          </CardContent>
        </Card>

        {/* Intro */}
        {proposal.intro_html && (
          <Card><CardContent className="p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Introdução</p>
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(proposal.intro_html) }} />
          </CardContent></Card>
        )}

        {/* Items */}
        <Card><CardContent className="p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Itens</p>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground"><tr>
              <th className="text-left pb-2">Item</th><th className="text-right pb-2">Qtd</th>
              <th className="text-right pb-2">Unit.</th><th className="text-right pb-2">Total</th>
            </tr></thead>
            <tbody>
              {(items || []).map((it: any) => (
                <tr key={it.id} className="border-t">
                  <td className="py-2"><Badge variant="outline" className="mr-2 text-[10px]">{it.item_type === "mrr" ? "MRR" : "Serviço"}</Badge>{it.name}</td>
                  <td className="text-right py-2">{it.quantity}</td>
                  <td className="text-right py-2">{fmtCur(it.unit_value)}</td>
                  <td className="text-right py-2 font-semibold">{fmtCur(it.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 pt-3 border-t text-sm space-y-1">
            {totals.ps_total > 0 && <div className="flex justify-between"><span>Total P&amp;S</span><span className="font-semibold">{fmtCur(totals.ps_total)}</span></div>}
            {totals.mrr_monthly > 0 && <div className="flex justify-between"><span>MRR mensal</span><span className="font-semibold">{fmtCur(totals.mrr_monthly)}/mês</span></div>}
            {totals.mrr_contract > 0 && <div className="flex justify-between"><span>MRR contrato</span><span className="font-semibold">{fmtCur(totals.mrr_contract)}</span></div>}
            <div className="flex justify-between text-base pt-2 border-t"><span className="font-semibold">Total geral</span><span className="font-bold text-primary">{fmtCur(totals.grand_total)}</span></div>
          </div>
        </CardContent></Card>

        {/* Observations */}
        {proposal.observations && (
          <Card><CardContent className="p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Observações</p>
            <p className="text-sm whitespace-pre-wrap">{proposal.observations}</p>
          </CardContent></Card>
        )}

        {/* Accept / Reject */}
        {accepted ? (
          <Card><CardContent className="p-5 flex items-center gap-3 bg-emerald-500/10">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            <div>
              <p className="font-semibold text-sm">Proposta aceita</p>
              <p className="text-xs text-muted-foreground">Por {proposal.public_accepted_name} em {fmtDate(proposal.public_accepted_at)}</p>
            </div>
          </CardContent></Card>
        ) : rejected ? (
          <Card><CardContent className="p-5 flex items-center gap-3 bg-red-500/10">
            <XCircle className="h-6 w-6 text-red-600" />
            <p className="text-sm font-semibold">Proposta recusada</p>
          </CardContent></Card>
        ) : (
          <Card><CardContent className="p-5 space-y-3">
            {!showAccept && !showReject && (
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => setShowAccept(true)}>Aceitar proposta</Button>
                <Button variant="outline" onClick={() => setShowReject(true)}>Recusar</Button>
              </div>
            )}
            {showAccept && (
              <div className="space-y-3">
                <p className="text-sm font-semibold">Aceitar proposta</p>
                <div><Label className="text-xs">Seu nome completo *</Label><Input value={acceptName} onChange={e => setAcceptName(e.target.value)} /></div>
                <div><Label className="text-xs">CPF ou CNPJ *</Label><Input value={acceptDoc} onChange={e => setAcceptDoc(e.target.value)} placeholder="Apenas números" /></div>
                <p className="text-[11px] text-muted-foreground">Ao clicar em "Confirmar aceite", você declara concordar com os termos desta proposta. Seu IP e data/hora serão registrados.</p>
                <div className="flex gap-2">
                  <Button onClick={submitAccept} disabled={accepting} className="flex-1">{accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar aceite"}</Button>
                  <Button variant="ghost" onClick={() => setShowAccept(false)}>Cancelar</Button>
                </div>
              </div>
            )}
            {showReject && (
              <div className="space-y-3">
                <p className="text-sm font-semibold">Recusar proposta</p>
                <div><Label className="text-xs">Motivo (opcional)</Label>
                  <Input value={rejectReason} onChange={e => setRejectReason(e.target.value)} /></div>
                <div className="flex gap-2">
                  <Button variant="destructive" onClick={submitReject} disabled={accepting} className="flex-1">{accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar recusa"}</Button>
                  <Button variant="ghost" onClick={() => setShowReject(false)}>Cancelar</Button>
                </div>
              </div>
            )}
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}
