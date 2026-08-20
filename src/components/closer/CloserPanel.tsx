import { useState, useEffect } from "react";
import { 
  Phone, MessageSquare, AlertCircle, Copy, Check, Sparkles, 
  RotateCcw, Rocket, CheckCircle2, Zap, Shield, ListChecks, MessageCircle,
  TrendingUp, Briefcase, FileSpreadsheet, Download, Layout, ListChecks as ListChecksIcon
} from "lucide-react";
import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

export function CloserPanel() {
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
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      <div className="p-4 flex items-center justify-between gap-3 border-b border-border/50">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-xl font-black tracking-tight truncate">Closer</h1>
          <Link to="/sdr" className="hidden sm:inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-2.5 py-1 text-[11px] font-semibold hover:opacity-90">
            <Rocket className="h-3 w-3" /> SDR OS
          </Link>
        </div>
        <div className="inline-flex rounded-full border border-border bg-card p-0.5 shrink-0">
          <button onClick={() => setChannel("ligacao")} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium transition", channel === "ligacao" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
            <Phone className="h-3.5 w-3.5" /> Ligação
          </button>
          <button onClick={() => setChannel("whatsapp")} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium transition", channel === "whatsapp" ? "bg-emerald-600 text-white" : "text-muted-foreground")}>
            <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="w-full grid grid-cols-3 h-9 mb-4">
              <TabsTrigger value="atendimento" className="text-[11px] font-semibold">Atendimento</TabsTrigger>
              <TabsTrigger value="pratica" className="text-[11px] font-semibold">DISC na prática</TabsTrigger>
              <TabsTrigger value="metodologias" className="text-[11px] font-semibold">Metodologias</TabsTrigger>
            </TabsList>

            <TabsContent value="atendimento" className="space-y-5 mt-0">
              <section>
                <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Perfil do cliente</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(profiles) as DiscKey[]).map((k) => {
                    const p = profiles[k];
                    const Icon = discIcons[k];
                    const active = disc === k;
                    return (
                      <button key={k} onClick={() => setDisc(k)}
                        className={cn("group relative rounded-xl bg-card p-3 text-left shadow-sm transition active:scale-[0.98] border-2", active ? p.border : "border-transparent hover:border-border")}>
                        <div className="flex items-center gap-2">
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white" style={{ backgroundColor: `var(--${p.colorVar})` }}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[13px] font-bold leading-tight truncate" style={{ color: `var(--${p.colorVar})` }}>{p.name}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 rounded-xl bg-card px-3 py-2 shadow-sm border-l-4" style={{ borderLeftColor: `var(--${profile.colorVar})` }}>
                  <p className="text-xs">
                    <span className="font-semibold" style={{ color: `var(--${profile.colorVar})` }}>Foco {profile.name}:</span>{" "}
                    <span className="text-foreground/80">{profile.focus}</span>
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Scripts por etapa</h2>
                <Accordion type="single" collapsible defaultValue={stages[0]} className="space-y-2">
                  {stages.map((stage) => (
                    <AccordionItem key={stage} value={stage} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                      <AccordionTrigger className="px-3 py-3 hover:no-underline text-left text-sm font-semibold">{stage}</AccordionTrigger>
                      <AccordionContent className="px-3 pb-3">
                        <div className="space-y-2">
                          {scripts[disc][stage].map((phrase, i) => (
                            <div key={i} className="flex items-start gap-2 rounded-lg bg-muted/60 p-2.5">
                              <p className="flex-1 min-w-0 text-[13px] leading-relaxed text-foreground whitespace-pre-wrap">{phrase}</p>
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

            <TabsContent value="pratica" className="space-y-5 mt-0">
              <section id="descubra-seu-perfil">
                {savedProfile ? (
                  <div className="rounded-xl bg-card p-3 shadow-sm border-l-4 flex items-center gap-3" style={{ borderLeftColor: `var(--${profiles[savedProfile.primary].colorVar})` }}>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Seu perfil</div>
                      <div className="text-[13px] font-bold leading-tight" style={{ color: `var(--${profiles[savedProfile.primary].colorVar})` }}>
                        {profiles[savedProfile.primary].name}{savedProfile.secondary && ` + ${profiles[savedProfile.secondary].name}`}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => { setQuizPhase("result"); setQuizOpen(true); }}>Ver</Button>
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => { setQuizPhase("intro"); setQuizOpen(true); }}><RotateCcw className="h-3.5 w-3.5" /></Button>
                  </div>
                ) : (
                  <div className="rounded-xl bg-foreground text-background p-4 shadow-md">
                    <div className="flex items-center gap-2 mb-1.5"><Sparkles className="h-4 w-4 text-amber-300" /><h3 className="text-base font-black">Qual é o seu DISC?</h3></div>
                    <p className="text-[11px] opacity-80 leading-relaxed mb-3">Entenda como seu próprio perfil influencia sua venda.</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" className="bg-background text-foreground hover:bg-background/90 font-semibold h-8 text-[11px]" onClick={() => { setQuizPhase("intro"); setQuizOpen(true); }}>Fazer meu teste</Button>
                    </div>
                  </div>
                )}
              </section>

              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(profiles) as DiscKey[]).map((k) => {
                  const p = profiles[k]; const Icon = discIcons[k]; const data = discPractice[k];
                  return (
                    <div key={k} className="rounded-xl bg-card shadow-sm border-t-4 overflow-hidden" style={{ borderTopColor: `var(--${p.colorVar})` }}>
                      <div className="p-3 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white" style={{ backgroundColor: `var(--${p.colorVar})` }}><Icon className="h-4 w-4" /></div>
                          <div className="min-w-0">
                            <div className="text-[13px] font-bold leading-tight truncate" style={{ color: `var(--${p.colorVar})` }}>{p.name}</div>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Como identificar</div>
                          <ul className="space-y-1">
                            {data.identify.map((s, i) => (
                              <li key={i} className="flex gap-1.5 text-[11px] text-foreground/80 leading-snug">
                                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: `var(--${p.colorVar})` }} />
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="metodologias" className="space-y-5 mt-0">
              <Accordion type="multiple" defaultValue={["bant", "spin"]} className="space-y-2">
                <AccordionItem value="bant" className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                  <AccordionTrigger className="px-3 py-3 hover:no-underline text-left">
                    <div><div className="text-sm font-bold text-foreground">Qualificação (BANT/BAND)</div></div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3">
                    <div className="space-y-2">
                      {bantItems.map((item) => (
                        <div key={item.letter} className="rounded-lg border border-border bg-card p-2.5">
                          <div className="text-xs font-bold text-foreground mb-2">{item.letter} — {item.name}</div>
                          <div className="space-y-1.5">
                            {item.questions.map((q, i) => (
                              <div key={i} className="flex items-start gap-2 rounded-lg bg-muted/60 p-2">
                                <p className="flex-1 min-w-0 text-[12px] leading-relaxed text-foreground">{q}</p>
                                <CopyButton text={q} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="spin" className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                  <AccordionTrigger className="px-3 py-3 hover:no-underline text-left">
                    <div><div className="text-sm font-bold text-foreground">Técnicas de venda (SPIN Selling)</div></div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3">
                    <div className="space-y-2">
                      {spinItems.map((item) => (
                        <div key={item.step} className="rounded-lg border border-border bg-card p-2.5">
                          <div className="text-xs font-bold text-foreground mb-1"><span className="text-primary">{item.letter}</span> — {item.name}</div>
                          <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-2">
                            <p className="flex-1 min-w-0 text-[12px] leading-relaxed text-foreground">{item.question}</p>
                            <CopyButton text={item.question} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {tab === "atendimento" && (
        <Dialog open={openObj} onOpenChange={setOpenObj}>
          <DialogTrigger asChild>
            <Button size="sm" className="fixed bottom-4 right-4 z-40 h-10 px-4 rounded-full shadow-lg">
              <AlertCircle className="h-4 w-4 mr-2" /> Objeções
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="text-sm">Objeções comuns</DialogTitle></DialogHeader>
            <div className="space-y-2.5 mt-2">
              {objections.map((o) => (
                <div key={o.title} className="rounded-lg border border-border p-2.5 bg-card">
                  <div className="text-xs font-semibold text-foreground mb-1">{o.title}</div>
                  <div className="flex items-start gap-2">
                    <p className="flex-1 min-w-0 text-[12px] leading-relaxed text-foreground/80 whitespace-pre-wrap">{o.response}</p>
                    <CopyButton text={o.response} />
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <DiscQuizDialog open={quizOpen} onOpenChange={setQuizOpen} initialPhase={quizPhase} onSaved={(p) => setSavedProfile(p)} />
    </div>
  );
}

export default function Closer() {
  return (
    <div className="p-0 h-full w-full">
      <CloserPanel />
    </div>
  );
}
