import { useMemo, useState } from "react";
import jsPDF from "jspdf";
import { ArrowRight, Download, RotateCcw, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { profiles, type DiscKey } from "@/lib/closer/disc-data";
import { quizQuestions, profileResults, computeResult, saveProfile, loadProfile, type SavedProfile } from "@/lib/closer/disc-quiz";
import { discIcons } from "@/lib/closer/disc-practice";
import { cn } from "@/lib/utils";

type Phase = "intro" | "quiz" | "name" | "result";

const HEX: Record<DiscKey, string> = { D: "#dc2626", I: "#f59e0b", S: "#16a34a", C: "#2563eb" };

export function DiscQuizDialog({
  open, onOpenChange, initialPhase, onSaved,
}: { open: boolean; onOpenChange: (v: boolean) => void; initialPhase: Phase; onSaved?: (p: SavedProfile) => void; }) {
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<(DiscKey | null)[]>(() => Array(quizQuestions.length).fill(null));
  const [name, setName] = useState("");
  const [saved, setSaved] = useState<SavedProfile | null>(null);

  const handleOpenChange = (v: boolean) => {
    if (v) {
      setPhase(initialPhase);
      setIdx(0);
      setAnswers(Array(quizQuestions.length).fill(null));
      setName("");
      setSaved(null);
    }
    onOpenChange(v);
  };

  const q = quizQuestions[idx];
  const current = answers[idx];
  const isLast = idx === quizQuestions.length - 1;
  const progress = ((idx + (current ? 1 : 0)) / quizQuestions.length) * 100;

  const finish = (finalName: string) => {
    const filled = answers.filter(Boolean) as DiscKey[];
    const { primary, secondary } = computeResult(filled);
    const record: SavedProfile = { primary, secondary, date: new Date().toISOString(), answers: filled, name: finalName.trim() || undefined };
    saveProfile(record);
    setSaved(record);
    onSaved?.(record);
    setPhase("result");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        {phase === "intro" && (
          <div className="p-6">
            <DialogHeader><DialogTitle className="text-xl">Qual é o seu DISC?</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              8 perguntas rápidas. Sem certo ou errado — escolha a frase que <strong>mais combina com você</strong>.
            </p>
            <Button className="w-full mt-5 h-12" onClick={() => setPhase("quiz")}>
              Começar teste <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {phase === "quiz" && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pergunta {idx + 1} de {quizQuestions.length}
              </span>
              <button onClick={() => handleOpenChange(false)} className="text-muted-foreground hover:text-foreground" aria-label="Fechar">
                <X className="h-4 w-4" />
              </button>
            </div>
            <Progress value={progress} className="h-1.5 mb-5" />
            <h3 className="text-base font-bold text-foreground mb-4 leading-snug">{q.prompt}</h3>
            <div className="space-y-2">
              {q.options.map((opt, i) => {
                const active = current === opt.key;
                return (
                  <button
                    key={i}
                    onClick={() => setAnswers(prev => { const next = [...prev]; next[idx] = opt.key; return next; })}
                    className={cn(
                      "w-full text-left rounded-xl border-2 p-3 text-sm leading-snug transition active:scale-[0.99]",
                      active ? "border-primary bg-primary/10 text-foreground font-medium" : "border-border bg-card text-foreground/80 hover:border-primary/40"
                    )}
                  >
                    {opt.text}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 mt-5">
              {idx > 0 && <Button variant="outline" className="flex-1" onClick={() => setIdx(i => i - 1)}>Voltar</Button>}
              <Button className="flex-1" disabled={!current} onClick={() => { if (isLast) setPhase("name"); else setIdx(i => i + 1); }}>
                {isLast ? "Ver resultado" : "Próxima"} <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {phase === "name" && (
          <div className="p-6">
            <DialogHeader><DialogTitle className="text-xl">Quase lá!</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">Seu nome (opcional — usado no relatório em PDF):</p>
            <Input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Ex: João Silva" className="mt-3 h-11"
              onKeyDown={e => { if (e.key === "Enter") finish(name); }} />
            <Button className="w-full mt-4 h-12" onClick={() => finish(name)}>
              Ver meu perfil <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {phase === "result" && saved && (
          <ResultView saved={saved}
            onRetake={() => { setPhase("intro"); setIdx(0); setAnswers(Array(quizQuestions.length).fill(null)); }}
            onClose={() => handleOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ResultView({ saved, onRetake, onClose }: { saved: SavedProfile; onRetake: () => void; onClose: () => void }) {
  const keys = useMemo<DiscKey[]>(() => (saved.secondary ? [saved.primary, saved.secondary] : [saved.primary]), [saved]);
  const downloadPdf = () => generatePdf(saved);

  return (
    <div className="p-0">
      {keys.map(k => {
        const p = profiles[k];
        const r = profileResults[k];
        const Icon = discIcons[k];
        return (
          <div key={k}>
            <div className="p-6 text-white" style={{ backgroundColor: HEX[k] }}>
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/20"><Icon className="h-6 w-6" /></div>
                <div>
                  <div className="text-xs uppercase tracking-wider opacity-80">{keys.length > 1 ? "Perfil misto" : "Seu perfil"}</div>
                  <div className="text-2xl font-black leading-tight">{p.name}</div>
                </div>
              </div>
              <p className="text-sm mt-3 opacity-90 leading-relaxed">{p.focus}</p>
            </div>
            <div className="p-6 space-y-5 bg-card">
              <Section title="Seus pontos fortes na venda" items={r.strengths} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} />
              <Section title="Pontos de atenção" items={r.watchOut} icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} />
              <div className="rounded-xl border-2 border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-rose-700 dark:text-rose-300" />
                  <div className="text-[11px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-200">Nunca use isso contra você</div>
                </div>
                <div className="text-sm font-bold text-rose-900 dark:text-rose-100 mb-1">{r.neverUse.title}</div>
                <p className="text-sm text-rose-900/90 dark:text-rose-100/90 leading-relaxed">{r.neverUse.text}</p>
              </div>
              <div className="rounded-xl bg-foreground text-background p-4">
                <div className="text-[11px] font-bold uppercase tracking-wider opacity-60 mb-1.5">Conclusão</div>
                <p className="text-sm leading-relaxed">{r.conclusion}</p>
              </div>
            </div>
          </div>
        );
      })}
      <div className="p-6 pt-2 border-t border-border bg-card sticky bottom-0 space-y-2">
        <Button className="w-full h-11" onClick={downloadPdf}>
          <Download className="h-4 w-4 mr-2" /> Baixar meu perfil em PDF
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onRetake}><RotateCcw className="h-4 w-4 mr-1" /> Refazer</Button>
          <Button variant="outline" className="flex-1" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, items, icon }: { title: string; items: string[]; icon: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">{icon}
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</div>
      </div>
      <ul className="space-y-1.5">
        {items.map((s, i) => (
          <li key={i} className="flex gap-2 text-sm text-foreground/80 leading-snug">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function generatePdf(saved: SavedProfile) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;
  let y = margin;
  const ensureSpace = (h: number) => { if (y + h > pageH - margin) { doc.addPage(); y = margin; } };
  const writeWrapped = (text: string, size: number, opts?: { bold?: boolean; color?: [number, number, number] }) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    if (opts?.color) doc.setTextColor(...opts.color); else doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(text, contentW) as string[];
    const lh = size * 1.35;
    for (const line of lines) { ensureSpace(lh); doc.text(line, margin, y); y += lh; }
  };
  doc.setFillColor(15, 23, 42); doc.rect(0, 0, pageW, 70, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(18);
  doc.text("Closer — Relatório de Perfil DISC", margin, 32);
  doc.setFont("helvetica", "normal"); doc.setFontSize(11);
  doc.text(saved.name || "Vendedor(a)", margin, 52);
  y = 100;
  const keys: DiscKey[] = saved.secondary ? [saved.primary, saved.secondary] : [saved.primary];
  for (const k of keys) {
    const p = profiles[k]; const r = profileResults[k];
    const [rC, gC, bC] = hexToRgb(HEX[k]);
    ensureSpace(60);
    doc.setFillColor(rC, gC, bC); doc.roundedRect(margin, y, contentW, 50, 8, 8, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(20);
    doc.text(`${k} — ${p.name}`, margin + 16, y + 22);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text(p.focus, margin + 16, y + 40);
    y += 70;
    writeWrapped("Seus pontos fortes na venda", 12, { bold: true, color: [22, 163, 74] }); y += 4;
    for (const s of r.strengths) writeWrapped(`-  ${s}`, 10); y += 10;
    writeWrapped("Pontos de atenção", 12, { bold: true, color: [217, 119, 6] }); y += 4;
    for (const s of r.watchOut) writeWrapped(`-  ${s}`, 10); y += 10;
    writeWrapped("Nunca use isso contra você", 12, { bold: true, color: [190, 18, 60] }); y += 4;
    writeWrapped(r.neverUse.title, 11, { bold: true });
    writeWrapped(r.neverUse.text, 10); y += 10;
    writeWrapped("Conclusão", 12, { bold: true, color: [15, 23, 42] }); y += 4;
    writeWrapped(r.conclusion, 10); y += 16;
  }
  const date = new Date(saved.date).toLocaleDateString("pt-BR");
  doc.setFontSize(9); doc.setTextColor(100, 116, 139);
  doc.text(`Teste realizado em ${date} — Closer`, margin, pageH - 24);
  const slug = (saved.name || "vendedor").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  doc.save(`perfil-disc-${slug}.pdf`);
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}

export { loadProfile };
