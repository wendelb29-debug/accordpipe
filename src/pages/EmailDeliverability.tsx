import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, ShieldCheck, ShieldAlert, RefreshCw, ExternalLink, Copy, Loader2, Info } from "lucide-react";

/**
 * Entregabilidade de E-mail (admin) — Onda 13.
 *
 * Mostra o status dos 3 registros DNS críticos do subdomínio de envio
 * transacional do Accord (SPF / DKIM / DMARC), consultando via DNS-over-HTTPS
 * público (Cloudflare) — não configura registro nenhum sozinho.
 *
 * Também lista a suppression list do tenant (bounces/complaints), pra que o
 * admin veja quem foi automaticamente bloqueado.
 */

const SENDER_DOMAIN = "notify.accordpipe.com.br";
const DMARC_HOST = `_dmarc.${SENDER_DOMAIN}`;
const DKIM_HOSTS = [
  `lovable._domainkey.${SENDER_DOMAIN}`,
  `mailo._domainkey.${SENDER_DOMAIN}`,
];

type CheckStatus = "loading" | "ok" | "missing" | "error";
interface DnsCheck {
  key: "spf" | "dkim" | "dmarc";
  label: string;
  host: string;
  type: "TXT" | "CNAME";
  expectContains?: string;
  status: CheckStatus;
  value?: string;
  note?: string;
}

async function dohLookup(name: string, type: "TXT" | "CNAME"): Promise<string[]> {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`;
  const resp = await fetch(url, { headers: { accept: "application/dns-json" } });
  if (!resp.ok) throw new Error(`DNS lookup ${resp.status}`);
  const data = await resp.json();
  const answers = (data.Answer || []) as Array<{ data: string; type: number }>;
  return answers.map((a) => a.data.replace(/^"|"$/g, "").replace(/"\s+"/g, ""));
}

export default function EmailDeliverability() {
  const [checks, setChecks] = useState<DnsCheck[]>([
    { key: "spf", label: "SPF", host: SENDER_DOMAIN, type: "TXT", expectContains: "v=spf1", status: "loading" },
    { key: "dkim", label: "DKIM", host: DKIM_HOSTS[0], type: "TXT", expectContains: "v=DKIM1", status: "loading" },
    { key: "dmarc", label: "DMARC", host: DMARC_HOST, type: "TXT", expectContains: "v=DMARC1", status: "loading" },
  ]);
  const [suppressed, setSuppressed] = useState<any[]>([]);
  const [loadingSuppression, setLoadingSuppression] = useState(true);

  const runChecks = async () => {
    setChecks((prev) => prev.map((c) => ({ ...c, status: "loading" as CheckStatus, value: undefined, note: undefined })));
    const next = await Promise.all(
      checks.map(async (c) => {
        try {
          if (c.key === "dkim") {
            for (const host of DKIM_HOSTS) {
              const answers = await dohLookup(host, "TXT");
              const hit = answers.find((a) => a.toLowerCase().includes("v=dkim1"));
              if (hit) return { ...c, host, status: "ok" as CheckStatus, value: hit };
            }
            return { ...c, status: "missing" as CheckStatus, note: `Nenhum registro DKIM encontrado em ${DKIM_HOSTS.join(" ou ")}` };
          }
          const answers = await dohLookup(c.host, c.type);
          const hit = c.expectContains ? answers.find((a) => a.toLowerCase().includes(c.expectContains!.toLowerCase())) : answers[0];
          if (hit) return { ...c, status: "ok" as CheckStatus, value: hit };
          return { ...c, status: "missing" as CheckStatus, note: "Registro não encontrado" };
        } catch (e) {
          return { ...c, status: "error" as CheckStatus, note: (e as Error).message };
        }
      }),
    );
    setChecks(next);
  };

  const loadSuppression = async () => {
    setLoadingSuppression(true);
    const { data, error } = await supabase
      .from("email_suppression_list" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) console.error(error);
    setSuppressed((data as any[]) || []);
    setLoadingSuppression(false);
  };

  useEffect(() => {
    runChecks();
    loadSuppression();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copy = (t: string) => {
    navigator.clipboard.writeText(t);
    toast.success("Copiado");
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
          <Mail className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Entregabilidade de E-mail</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Diagnóstico dos registros DNS do domínio de envio do Accord. Só admin da plataforma.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex gap-3">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <div className="text-[12.5px] leading-relaxed text-foreground/80">
          Nenhuma plataforma consegue garantir 100% de entrega. Os 3 registros abaixo maximizam a
          chance de o e-mail ser aceito e priorizado, e reduzem o risco de cair em spam. Eles são
          configurados no painel de DNS do domínio <strong>{SENDER_DOMAIN.split(".").slice(-2).join(".")}</strong>,
          não dentro do Accord.
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
            Autenticação de domínio ({SENDER_DOMAIN})
          </h2>
          <button
            onClick={runChecks}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold bg-secondary hover:bg-secondary/80 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Verificar novamente
          </button>
        </div>
        <div className="grid gap-3">
          {checks.map((c) => (
            <div key={c.key} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  c.status === "ok" ? "bg-emerald-500/10 text-emerald-500" :
                  c.status === "loading" ? "bg-muted text-muted-foreground" :
                  "bg-red-500/10 text-red-500"
                }`}>
                  {c.status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> :
                   c.status === "ok" ? <ShieldCheck className="w-5 h-5" /> :
                   <ShieldAlert className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold">{c.label}</span>
                    <span className="text-[11px] text-muted-foreground">TXT em <code className="text-[11px]">{c.host}</code></span>
                    <button onClick={() => copy(c.host)} className="text-muted-foreground hover:text-foreground">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <div className={`text-[12px] mt-1 ${c.status === "ok" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                    {c.status === "loading" ? "Consultando DNS…" :
                     c.status === "ok" ? "Verificado" :
                     c.status === "missing" ? (c.note || "Registro não encontrado") :
                     `Erro: ${c.note}`}
                  </div>
                  {c.value && (
                    <div className="mt-2 text-[11px] font-mono bg-muted/50 rounded px-2 py-1 break-all">
                      {c.value}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4 text-[12.5px] leading-relaxed text-foreground/80 space-y-2">
          <p><strong>Como configurar (fora do Accord):</strong></p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Acesse o painel do provedor onde o domínio está registrado.</li>
            <li>Crie o subdomínio <code>{SENDER_DOMAIN}</code> se ainda não existir.</li>
            <li>SPF: adicione um <code>TXT</code> em <code>{SENDER_DOMAIN}</code> autorizando o provedor de envio (ex.: <code>v=spf1 include:_spf.provedor.com ~all</code>).</li>
            <li>DKIM: crie o <code>TXT</code>/<code>CNAME</code> em <code>{DKIM_HOSTS[0]}</code> com a chave fornecida pelo provedor.</li>
            <li>DMARC: adicione um <code>TXT</code> em <code>{DMARC_HOST}</code>. Comece com <code>v=DMARC1; p=none; rua=mailto:dmarc@accordpipe.com.br</code> para monitorar. Depois de algumas semanas sem problema, endureça para <code>p=quarantine</code> e depois <code>p=reject</code>.</li>
          </ol>
          <p className="text-muted-foreground pt-1">
            <a href="https://postmaster.google.com/" target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
              Google Postmaster Tools <ExternalLink className="w-3 h-3" />
            </a>{" "}
            é gratuito e mostra a reputação do seu domínio no Gmail nas primeiras semanas após o setup.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Lista de supressão (últimos 50)
        </h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {loadingSuppression ? (
            <div className="p-6 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : suppressed.length === 0 ? (
            <div className="p-6 text-center text-[13px] text-muted-foreground">
              Nenhum endereço na lista de supressão.
            </div>
          ) : (
            <table className="w-full text-[12.5px]">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">E-mail</th>
                  <th className="text-left px-4 py-2 font-medium">Motivo</th>
                  <th className="text-left px-4 py-2 font-medium">Origem</th>
                  <th className="text-left px-4 py-2 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {suppressed.map((s: any) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-4 py-2 font-mono">{s.email}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        s.reason === "complaint" ? "bg-red-500/10 text-red-500" :
                        s.reason === "hard_bounce" ? "bg-amber-500/10 text-amber-500" :
                        "bg-muted text-muted-foreground"
                      }`}>{s.reason}</span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{s.source || "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(s.created_at).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
