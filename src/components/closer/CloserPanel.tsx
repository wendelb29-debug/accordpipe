import { useState, useEffect } from "react";
import { 
  Phone, MessageSquare, AlertCircle, Copy, Check, Sparkles, 
  RotateCcw, Rocket, CheckCircle2, Zap, Shield, ListChecks, MessageCircle,
  TrendingUp, Briefcase, FileSpreadsheet, Download, Layout, ListChecks as ListChecksIcon,
  User, Car, CheckCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { profiles, stages, scripts as discScripts, objections, followUp, type DiscKey } from "@/lib/closer/disc-data";
import { discIcons, discPractice } from "@/lib/closer/disc-practice";
import { DiscQuizDialog } from "@/components/closer/DiscQuizDialog";
import { loadProfile, type SavedProfile } from "@/lib/closer/disc-quiz";
import { bantItems, spinItems } from "@/lib/closer/metodologias";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
      className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border bg-background hover:bg-accent active:scale-95 transition">
      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
    </button>
  );
}

export function CloserPanel() {
  const [nome, setNome] = useState("");
  const [veiculo, setVeiculo] = useState("");
  const [activeTab, setActiveTab] = useState("atendimento");

  const scripts = [
    {
      title: "Etapa 1 — Abertura",
      text: `Oi, [Nome], tudo bem? Sou Head na Save Car. Vi que você já foi nosso associado, Você continua com o veículo [Placa/Modelo]?`
    },
    {
      title: "Etapa 2 — Identificação",
      text: `Entendo perfeitamente, [Nome]. A Save Car passou por uma reformulação completa e hoje somos a proteção veicular que mais cresce no Brasil, com selo ICP-Brasil e foco total na agilidade do associado.`
    },
    {
      title: "Etapa 3 — Oferta de Retomada",
      text: `Estou entrando em contato pois abrimos uma condição especial de reativação para ex-associados Save Car. Conseguimos isenção total da taxa de adesão e um desconto exclusivo na primeira mensalidade.`
    }
  ];

  const getProcessedText = (text: string) => {
    let processed = text;
    if (nome) processed = processed.replace(/\[Nome\]/g, nome);
    if (veiculo) processed = processed.replace(/\[Placa\/Modelo\]/g, veiculo);
    return processed;
  };

  const openWhatsApp = (text: string) => {
    const url = `https://wa.me/?text=${encodeURIComponent(getProcessedText(text))}`;
    window.open(url, "_blank");
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background font-sans">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Closer — Painel de Apoio ao Vendedor</h1>
          <div className="flex items-center gap-1 rounded-full bg-slate-900 text-white px-2 py-0.5 text-[10px] font-bold">
            <Zap className="h-3 w-3 fill-current" /> SDR OS
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-9 px-3 gap-2 rounded-xl border border-border bg-slate-900 text-white hover:bg-slate-800">
          <Phone className="h-4 w-4 fill-current" /> Ligação
        </Button>
      </div>

      {/* Sub Tabs */}
      <div className="px-4 py-2 flex items-center gap-1 border-b border-border/50 overflow-x-auto no-scrollbar">
        {["Atendimento", "DISC", "Metodologias", "Save Car", "iGreen"].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t.toLowerCase())}
            className={cn(
              "px-6 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap",
              activeTab === t.toLowerCase() ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-700"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-4xl mx-auto w-full">
        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" className="h-10 px-6 gap-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800">
            <User className="h-4 w-4" /> Individual
          </Button>
          <Button variant="ghost" className="h-10 px-4 gap-2 rounded-xl border border-border text-slate-600 hover:bg-slate-50">
            <FileSpreadsheet className="h-4 w-4" /> Importar Planilha
          </Button>
          <Button variant="ghost" className="h-10 px-4 gap-2 rounded-xl border border-border text-slate-600 hover:bg-slate-50">
            <Layout className="h-4 w-4" /> Sorteio
          </Button>
          <Button variant="ghost" className="h-10 px-4 gap-2 rounded-xl border border-border text-slate-600 hover:bg-slate-50">
            <ListChecksIcon className="h-4 w-4" /> Cadastro
          </Button>
        </div>

        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-[24px] bg-[#0F172A] p-8 text-white shadow-xl">
          <div className="relative z-10">
            <h2 className="text-3xl font-black mb-2">Recuperação de Associados</h2>
            <p className="text-slate-300 text-lg opacity-90">Fluxo consultivo de alto impacto para contratos inativos.</p>
          </div>
          <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
            <Shield className="h-32 w-32" />
            <div className="absolute inset-0 flex items-center justify-center">
              <CheckCircle className="h-12 w-12" />
            </div>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Input
              placeholder="Nome do associado"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="h-14 rounded-2xl border-border bg-card px-4 text-base focus-visible:ring-slate-900"
            />
          </div>
          <div className="relative">
            <Input
              placeholder="Veículo anterior"
              value={veiculo}
              onChange={(e) => setVeiculo(e.target.value)}
              className="h-14 rounded-2xl border-border bg-card px-4 text-base focus-visible:ring-slate-900"
            />
          </div>
        </div>

        {/* Scripts List */}
        <div className="space-y-4">
          {scripts.map((script, i) => (
            <div key={i} className="group rounded-[20px] border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <User className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">{script.title}</h3>
                </div>
                <Button 
                  onClick={() => openWhatsApp(script.text)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-10 gap-2 px-4 font-bold"
                >
                  <MessageCircle className="h-4 w-4 fill-current" /> WhatsApp
                </Button>
              </div>
              
              <div className="relative rounded-2xl bg-emerald-50/30 border border-emerald-100/50 p-5">
                <p className="text-base leading-relaxed text-slate-700 dark:text-slate-300 pr-10">
                  {getProcessedText(script.text)}
                </p>
                <div className="absolute bottom-4 right-4">
                  <CopyButton text={getProcessedText(script.text)} />
                </div>
              </div>
              
              <div className="mt-4 flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider cursor-pointer hover:opacity-80">
                <Copy className="h-3.5 w-3.5" /> Copiar Script
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Closer() {
  return (
    <div className="h-full w-full">
      <CloserPanel />
    </div>
  );
}
