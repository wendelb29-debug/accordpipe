import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Zap, Loader2, RefreshCw, Check, Copy, X,
  Briefcase, Smile, Sparkles, Heart, TrendingUp, Target,
  SpellCheck, Wand2, Minimize2, Flame, HandshakeIcon, Clock,
  MessageCircleHeart, User, Gift,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AiImprovePopoverProps {
  text: string;
  onApply: (newText: string) => void;
  disabled?: boolean;
}

interface StyleOpt {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const GROUPS: { title: string; items: StyleOpt[] }[] = [
  {
    title: "Tom",
    items: [
      { id: "professional", label: "Mais profissional", icon: <Briefcase size={13} /> },
      { id: "formal", label: "Mais formal", icon: <Sparkles size={13} /> },
      { id: "informal", label: "Mais informal", icon: <Smile size={13} /> },
      { id: "friendly", label: "Mais amigável", icon: <Heart size={13} /> },
      { id: "persuasive", label: "Mais persuasivo", icon: <TrendingUp size={13} /> },
      { id: "direct", label: "Mais direto", icon: <Target size={13} /> },
    ],
  },
  {
    title: "Correção",
    items: [
      { id: "spelling", label: "Corrigir ortografia", icon: <SpellCheck size={13} /> },
      { id: "clarity", label: "Melhorar clareza", icon: <Wand2 size={13} /> },
      { id: "simplify", label: "Simplificar", icon: <Minimize2 size={13} /> },
    ],
  },
  {
    title: "Vendas",
    items: [
      { id: "convincing", label: "Mais convincente", icon: <Flame size={13} /> },
      { id: "closing", label: "Foco em fechamento", icon: <HandshakeIcon size={13} /> },
      { id: "urgency", label: "Senso de urgência", icon: <Clock size={13} /> },
    ],
  },
  {
    title: "Atendimento",
    items: [
      { id: "polite", label: "Mais educado", icon: <Gift size={13} /> },
      { id: "human", label: "Humanizar", icon: <User size={13} /> },
      { id: "welcoming", label: "Melhor acolhimento", icon: <MessageCircleHeart size={13} /> },
    ],
  },
];

export function AiImprovePopover({ text, onApply, disabled }: AiImprovePopoverProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [improved, setImproved] = useState<string | null>(null);
  const [currentStyle, setCurrentStyle] = useState<string | null>(null);

  const hasText = text.trim().length > 0;

  const reset = () => {
    setImproved(null);
    setCurrentStyle(null);
  };

  const run = async (styleId: string) => {
    if (!hasText) {
      toast.error("Digite algo para melhorar com IA");
      return;
    }
    setLoading(true);
    setCurrentStyle(styleId);
    try {
      const { data, error } = await supabase.functions.invoke("improve-message", {
        body: { text, style: styleId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const out = (data as any)?.improved as string;
      if (!out) throw new Error("Resposta vazia da IA");
      setImproved(out);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao melhorar mensagem");
      setCurrentStyle(null);
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    if (!improved) return;
    onApply(improved);
    setOpen(false);
    reset();
    toast.success("Mensagem atualizada");
  };

  const copy = async () => {
    if (!improved) return;
    await navigator.clipboard.writeText(improved);
    toast.success("Copiado");
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          title={hasText ? "Melhorar com IA" : "Digite algo para melhorar com IA"}
          className={cn(
            "h-7 w-7 rounded-md flex items-center justify-center transition-all",
            hasText
              ? "text-primary hover:bg-primary/10"
              : "text-muted-foreground/50 hover:bg-muted/40"
          )}
        >
          <Zap size={14} className={hasText ? "fill-primary/20" : ""} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-[360px] p-0 border-border/60 shadow-2xl animate-in fade-in-0 zoom-in-95"
      >
        <div className="p-3 border-b border-border/50 flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center">
            <Sparkles size={14} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">Assistente de escrita</div>
            <div className="text-[11px] text-muted-foreground">Melhore sua mensagem com IA</div>
          </div>
        </div>

        {!improved && !loading && (
          <div className="p-3 max-h-[400px] overflow-y-auto space-y-3">
            {GROUPS.map((g) => (
              <div key={g.title}>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1.5 px-1">
                  {g.title}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {g.items.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => run(opt.id)}
                      disabled={!hasText}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left hover:bg-muted/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className="text-primary flex-shrink-0">{opt.icon}</span>
                      <span className="truncate">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {!hasText && (
              <div className="text-[11px] text-muted-foreground text-center py-2 border-t border-border/40">
                Digite algo para melhorar com IA
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="p-6 flex flex-col items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div className="text-xs text-muted-foreground">Reescrevendo com IA...</div>
          </div>
        )}

        {improved && !loading && (
          <div className="p-3 space-y-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">
                Original
              </div>
              <div className="text-xs text-muted-foreground bg-muted/40 rounded-md p-2 border border-border/40 max-h-20 overflow-y-auto whitespace-pre-wrap">
                {text}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1 flex items-center gap-1">
                <Sparkles size={10} /> Versão melhorada
              </div>
              <div className="text-sm text-foreground bg-primary/5 rounded-md p-2 border border-primary/20 max-h-40 overflow-y-auto whitespace-pre-wrap">
                {improved}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button size="sm" onClick={apply} className="flex-1 h-8 text-xs gap-1">
                <Check size={12} /> Substituir
              </Button>
              <Button size="sm" variant="outline" onClick={copy} className="h-8 text-xs gap-1" title="Copiar">
                <Copy size={12} />
              </Button>
              <Button
                size="sm" variant="outline"
                onClick={() => currentStyle && run(currentStyle)}
                className="h-8 text-xs gap-1" title="Regenerar"
              >
                <RefreshCw size={12} />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setOpen(false); reset(); }} className="h-8 text-xs gap-1" title="Cancelar">
                <X size={12} />
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
