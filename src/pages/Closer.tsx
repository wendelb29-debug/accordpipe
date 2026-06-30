// Closer — Painel do Vendedor (porta de rapport-master-tool/src/routes/index.tsx)
import { useEffect, useState } from "react";
import { Copy, Check, Phone, MessageSquare, AlertCircle, CheckCircle2, Sparkles, RotateCcw, Rocket } from "lucide-react";
import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageContainer } from "@/components/layout/PageContainer";
import { profiles, stages, scripts, objections, followUp, type DiscKey } from "@/lib/closer/disc-data";
import { discIcons, discPractice } from "@/lib/closer/disc-practice";
import { DiscQuizDialog } from "@/components/closer/DiscQuizDialog";
import { loadProfile, type SavedProfile } from "@/lib/closer/disc-quiz";
import { bantItems, spinItems } from "@/lib/closer/metodologias";
import { cn } from "@/lib/utils";

type Channel = "ligacao" | "whatsapp";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    try { await navigator.clipboard.writeText(text); } catch {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    }
    setCopied(true); setTimeout(() => setCopied(false), 1000);
  };
  return (
    <button onClick={handle} aria-label="Copiar texto"
      className="shrink-0 inline-flex items-center justify-center h-10 w-10 rounded-lg border border-border bg-background hover:bg-accent active:scale-95 transition">
      {copied ? <Check className="h-5 w-5 text-emerald-600" /> : <Copy className="h-5 w-5 text-muted-foreground" />}
    </button>
  );
}

export default function Closer() {
  const [disc, setDisc] = useState<DiscKey>("D");
  const [channel, setChannel] = useState<Channel>("ligacao");
  const [openObj, setOpenObj] = useState(false);
  const [tab, setTab] = useState<"atendimento" | "pratica" | "metodologias">("atendimento");
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizPhase, setQuizPhase] = useState<"intro" | "result">("intro");
  const [savedProfile, setSavedProfile] = useState<SavedProfile | null>(null);

  useEffect(() => { setSavedProfile(loadProfile()); }, []);

  const profile = profiles[disc];

  return (
    <PageContainer>
      <div className="pb-28">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-2xl font-black tracking-tight truncate">Closer</h1>
            <Link to="/sdr" className="hidden sm:inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-2.5 py-1 text-[11px] font-semibold hover:opacity-90">
              <Rocket className="h-3 w-3" /> SDR OS
            </Link>
          </div>
          <div className="inline-flex rounded-full border border-border bg-card p-1 shrink-0">
            <button onClick={() => setChannel("ligacao")} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium transition", channel === "ligacao" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
              <Phone className="h-4 w-4" /> Ligação
            </button>
            <button onClick={() => setChannel("whatsapp")} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium transition", channel === "whatsapp" ? "bg-emerald-600 text-white" : "text-muted-foreground")}>
              <MessageSquare className="h-4 w-4" /> WhatsApp
            </button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="w-full grid grid-cols-3 h-11 mb-4">
            <TabsTrigger value="atendimento" className="text-xs sm:text-sm font-semibold">Atendimento</TabsTrigger>
            <TabsTrigger value="pratica" className="text-xs sm:text-sm font-semibold">DISC na prática</TabsTrigger>
            <TabsTrigger value="metodologias" className="text-xs sm:text-sm font-semibold">Metodologias</TabsTrigger>
          </TabsList>

          <TabsContent value="atendimento" className="space-y-5">
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Perfil do cliente</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(Object.keys(profiles) as DiscKey[]).map((k) => {
                  const p = profiles[k];
                  const Icon = discIcons[k];
                  const active = disc === k;
                  return (
                    <button key={k} onClick={() => setDisc(k)}
                      className={cn("group relative rounded-2xl bg-card p-4 text-left shadow-sm transition active:scale-[0.98] border-2", active ? p.border : "border-transparent hover:border-border")}>
                      <div className="flex items-center gap-3">
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white" style={{ backgroundColor: `var(--${p.colorVar})` }}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-base font-bold leading-tight truncate" style={{ color: `var(--${p.colorVar})` }}>{p.name}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 rounded-xl bg-card px-4 py-3 shadow-sm border-l-4" style={{ borderLeftColor: `var(--${profile.colorVar})` }}>
                <p className="text-sm">
                  <span className="font-semibold" style={{ color: `var(--${profile.colorVar})` }}>Foco {profile.name}:</span>{" "}
                  <span className="text-foreground/80">{profile.focus}</span>
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Scripts por etapa</h2>
              <Accordion type="single" collapsible defaultValue={stages[0]} className="space-y-2">
                {stages.map((stage) => (
                  <AccordionItem key={stage} value={stage} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                    <AccordionTrigger className="px-4 py-4 hover:no-underline text-left text-base font-semibold">{stage}</AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-2">
                        {scripts[disc][stage].map((phrase, i) => (
                          <div key={i} className="flex items-start gap-2 rounded-xl bg-muted/60 p-3">
                            <p className="flex-1 min-w-0 text-sm leading-relaxed text-foreground whitespace-pre-wrap">{phrase}</p>
                            <CopyButton text={phrase} />
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          </TabsContent>

          <TabsContent value="pratica" className="space-y-5">
            <section id="descubra-seu-perfil">
              {savedProfile ? (
                <div className="rounded-2xl bg-card p-4 shadow-sm border-l-4 flex items-center gap-3" style={{ borderLeftColor: `var(--${profiles[savedProfile.primary].colorVar})` }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Seu perfil</div>
                    <div className="text-base font-bold leading-tight" style={{ color: `var(--${profiles[savedProfile.primary].colorVar})` }}>
                      {profiles[savedProfile.primary].name}{savedProfile.secondary && ` + ${profiles[savedProfile.secondary].name}`}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { setQuizPhase("result"); setQuizOpen(true); }}>Ver</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setQuizPhase("intro"); setQuizOpen(true); }}><RotateCcw className="h-4 w-4" /></Button>
                </div>
              ) : (
                <div className="rounded-2xl bg-foreground text-background p-5 shadow-md">
                  <div className="flex items-center gap-2 mb-2"><Sparkles className="h-5 w-5 text-amber-300" /><h3 className="text-lg font-black">Qual é o seu DISC?</h3></div>
                  <p className="text-sm opacity-80 leading-relaxed mb-4">Entenda como seu próprio perfil influencia sua venda — o que te ajuda a fechar e o que pode atrapalhar sem você perceber.</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button className="bg-background text-foreground hover:bg-background/90 font-semibold" onClick={() => { setQuizPhase("intro"); setQuizOpen(true); }}>Fazer meu teste</Button>
                    <button onClick={() => document.getElementById("o-que-e-disc")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="text-sm opacity-80 underline underline-offset-4 hover:opacity-100">O que é o DISC?</button>
                  </div>
                </div>
              )}
            </section>

            <p id="o-que-e-disc" className="text-sm sm:text-base text-foreground/80 leading-relaxed scroll-mt-32">
              Em menos de 1 minuto de conversa dá pra perceber o perfil do cliente. Você não pergunta <em>"qual seu perfil"</em>, você observa <strong>como ele fala</strong>.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(profiles) as DiscKey[]).map((k) => {
                const p = profiles[k]; const Icon = discIcons[k]; const data = discPractice[k];
                return (
                  <div key={k} className="rounded-2xl bg-card shadow-sm border-t-4 overflow-hidden" style={{ borderTopColor: `var(--${p.colorVar})` }}>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white" style={{ backgroundColor: `var(--${p.colorVar})` }}><Icon className="h-5 w-5" /></div>
                        <div className="min-w-0">
                          <div className="text-base font-bold leading-tight truncate" style={{ color: `var(--${p.colorVar})` }}>{p.name}</div>
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Como identificar</div>
                        <ul className="space-y-1.5">
                          {data.identify.map((s, i) => (
                            <li key={i} className="flex gap-2 text-sm text-foreground/80 leading-snug">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: `var(--${p.colorVar})` }} />
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-lg bg-muted/60 p-3 space-y-3">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Como adaptar a linguagem</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">Faça</div>
                            <ul className="space-y-1">
                              {data.adapt.do.map((s, i) => (
                                <li key={i} className="flex gap-1.5 text-xs text-foreground/80 leading-snug"><span className="text-emerald-600 font-bold">✓</span><span>{s}</span></li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700 mb-1">Evite</div>
                            <ul className="space-y-1">
                              {data.adapt.avoid.map((s, i) => (
                                <li key={i} className="flex gap-1.5 text-xs text-foreground/80 leading-snug"><span className="text-rose-600 font-bold">✕</span><span>{s}</span></li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Na prática</div>
                          <div className="space-y-1.5">
                            {data.adapt.examples.map((ex, i) => (
                              <p key={i} className="text-xs italic text-foreground/80 leading-snug rounded-md bg-card px-2.5 py-1.5 border-l-2" style={{ borderLeftColor: `var(--${p.colorVar})` }}>{ex}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl bg-foreground text-background p-5 shadow-md">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-400 mt-0.5" />
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">O segredo</div>
                  <p className="text-sm sm:text-base leading-relaxed">O erro é usar o mesmo discurso pra todo mundo. O certo é mudar o <strong>ritmo da conversa</strong>, não só as palavras.</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="metodologias" className="space-y-5">
            <Accordion type="multiple" defaultValue={["bant", "spin"]} className="space-y-3">
              <AccordionItem value="bant" className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <AccordionTrigger className="px-4 py-4 hover:no-underline text-left">
                  <div><div className="text-base font-bold text-foreground">Qualificação (BANT/BAND)</div>
                  <div className="text-xs text-muted-foreground font-normal mt-0.5">Antes de investir tempo na venda</div></div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <p className="text-sm text-foreground/80 leading-relaxed mb-3">Use essas perguntas pra entender se o cliente tem perfil, urgência e poder de decisão antes de investir tempo na venda.</p>
                  <div className="space-y-3">
                    {bantItems.map((item) => (
                      <div key={item.letter} className="rounded-xl border border-border bg-card p-3">
                        <div className="flex items-center gap-2.5 mb-2.5">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary text-sm font-black">{item.letter}</div>
                          <div className="text-sm font-bold text-foreground">{item.name}</div>
                        </div>
                        <div className="space-y-2">
                          {item.questions.map((q, i) => (
                            <div key={i} className="flex items-start gap-2 rounded-lg bg-muted/60 p-2.5">
                              <p className="flex-1 min-w-0 text-sm leading-relaxed text-foreground">{q}</p>
                              <CopyButton text={q} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="spin" className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <AccordionTrigger className="px-4 py-4 hover:no-underline text-left">
                  <div><div className="text-base font-bold text-foreground">Técnicas de venda (SPIN Selling)</div>
                  <div className="text-xs text-muted-foreground font-normal mt-0.5">Construa valor antes de apresentar a solução</div></div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <p className="text-sm text-foreground/80 leading-relaxed mb-3">Conduza a conversa nessa ordem pra construir a percepção de valor antes de apresentar a solução.</p>
                  <div className="space-y-3">
                    {spinItems.map((item) => (
                      <div key={item.step} className="rounded-xl border border-border bg-card p-3">
                        <div className="flex items-center gap-2.5 mb-2">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary text-sm font-black">{item.step}</div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-foreground leading-tight"><span className="text-primary">{item.letter}</span> — {item.name}</div>
                            <div className="text-xs text-muted-foreground leading-snug mt-0.5">{item.description}</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-2.5">
                          <p className="flex-1 min-w-0 text-sm leading-relaxed text-foreground">{item.question}</p>
                          <CopyButton text={item.question} />
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="rounded-2xl border-l-4 border-primary bg-card p-4 shadow-sm">
              <div className="text-[11px] font-bold uppercase tracking-wider text-primary mb-1.5">Como usar juntas</div>
              <p className="text-sm leading-relaxed text-foreground/80">
                <strong>BANT/BAND</strong> ajuda a saber SE vale investir tempo nesse cliente. <strong>SPIN Selling</strong> ajuda a conduzir a conversa pra ele sentir a necessidade antes de você apresentar a proteção.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {tab === "atendimento" && (
          <Dialog open={openObj} onOpenChange={setOpenObj}>
            <DialogTrigger asChild>
              <Button size="lg" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 h-14 px-6 rounded-full shadow-xl">
                <AlertCircle className="h-5 w-5 mr-2" /> Objeções
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Objeções comuns</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                {objections.map((o) => (
                  <div key={o.title} className="rounded-xl border border-border p-3 bg-card">
                    <div className="text-sm font-semibold text-foreground mb-1.5">{o.title}</div>
                    <div className="flex items-start gap-2">
                      <p className="flex-1 min-w-0 text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">{o.response}</p>
                      <CopyButton text={o.response} />
                    </div>
                  </div>
                ))}
                <div className="rounded-xl border-2 border-primary p-3 bg-primary/5 mt-4">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-primary mb-1.5">Follow-up</div>
                  <div className="flex items-start gap-2">
                    <p className="flex-1 min-w-0 text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">{followUp}</p>
                    <CopyButton text={followUp} />
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <DiscQuizDialog open={quizOpen} onOpenChange={setQuizOpen} initialPhase={quizPhase} onSaved={(p) => setSavedProfile(p)} />
      </div>
    </PageContainer>
  );
}
