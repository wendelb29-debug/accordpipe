import { useState, useRef, useEffect } from "react";
import { Wand2, X, Check, Lightbulb, Rocket, Loader2, Sparkles, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/orbit-ai-resolve`;

interface ResolveResult {
  corrected: string;
  optimized: string;
  suggestions: string;
}

function getPageContext(pathname: string): string {
  if (pathname.startsWith("/documentos")) return "Documentos";
  if (pathname.startsWith("/relatorios")) return "Relatórios";
  if (pathname.startsWith("/contratos")) return "Contratos";
  if (pathname.startsWith("/gestao-vendas") || pathname.startsWith("/atendimento")) return "Gestão de Vendas / CRM";
  if (pathname.startsWith("/cadastrados") || pathname.startsWith("/clientes")) return "Cadastros";
  if (pathname.startsWith("/empresas")) return "Empresas";
  if (pathname.startsWith("/financeiro") || pathname.startsWith("/boletos")) return "Financeiro";
  if (pathname.startsWith("/dashboard")) return "Dashboard";
  if (pathname.startsWith("/atividades")) return "Atividades";
  if (pathname.startsWith("/formularios")) return "Formulários";
  return "Sistema";
}

export function ResolverComIA() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"corrected" | "optimized" | "suggestions">("corrected");
  const [hasGlow, setHasGlow] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { profile, activeCompany } = useAuth();
  const location = useLocation();
  const pageName = getPageContext(location.pathname);

  // Pulse glow effect every 10s
  useEffect(() => {
    const interval = setInterval(() => setHasGlow(true), 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (hasGlow) {
      const timeout = setTimeout(() => setHasGlow(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [hasGlow]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [result]);

  const collectPageData = (): string => {
    // Collect visible text content from the main area
    const main = document.querySelector("main");
    if (!main) return "Nenhum conteúdo visível na página.";

    const elements: string[] = [];

    // Get form inputs
    const inputs = main.querySelectorAll("input, textarea, select");
    inputs.forEach((el) => {
      const input = el as HTMLInputElement;
      const label = input.closest("label")?.textContent?.trim() ||
        input.getAttribute("placeholder") ||
        input.getAttribute("name") || "";
      if (input.value) {
        elements.push(`Campo "${label}": ${input.value}`);
      }
    });

    // Get table data
    const tables = main.querySelectorAll("table");
    tables.forEach((table) => {
      const headers = Array.from(table.querySelectorAll("th")).map(th => th.textContent?.trim());
      const rows = Array.from(table.querySelectorAll("tbody tr")).slice(0, 10);
      if (headers.length > 0) {
        elements.push(`Tabela: ${headers.join(" | ")}`);
        rows.forEach(row => {
          const cells = Array.from(row.querySelectorAll("td")).map(td => td.textContent?.trim());
          elements.push(`  ${cells.join(" | ")}`);
        });
      }
    });

    // Get cards / badges / key text
    const cards = main.querySelectorAll("[class*='card'], [class*='Card']");
    cards.forEach((card, i) => {
      if (i < 10) {
        const text = card.textContent?.trim().slice(0, 200);
        if (text) elements.push(`Card: ${text}`);
      }
    });

    // Fallback: get visible text
    if (elements.length === 0) {
      const text = main.textContent?.trim().slice(0, 2000);
      if (text) elements.push(text);
    }

    return elements.join("\n").slice(0, 3000);
  };

  const handleResolve = async () => {
    setLoading(true);
    setResult(null);
    setOpen(true);

    const pageData = collectPageData();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          pageContext: pageName,
          pageData,
          context: {
            usuario: profile?.name,
            empresa: activeCompany?.razao_social || activeCompany?.nome_fantasia,
            pagina: pageName,
          },
        }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      // Stream the response
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullContent = "";

      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, idx);
          textBuffer = textBuffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              setResult(fullContent);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e: any) {
      setResult(`⚠️ ${e.message || "Erro ao analisar a página"}`);
    } finally {
      setLoading(false);
    }
  };

  const copyResult = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      toast.success("Resultado copiado!");
    }
  };

  return (
    <>
      {/* Floating Resolve Button */}
      {!open && (
        <button
          onClick={handleResolve}
          className={cn(
            "fixed bottom-24 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg transition-all duration-300 hover:scale-105",
            "bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium text-sm",
            hasGlow && "animate-pulse shadow-amber-500/40 shadow-xl"
          )}
          title="Resolver com IA"
        >
          <Wand2 className="h-4 w-4" />
          Resolver com IA
        </button>
      )}

      {/* Result Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[440px] max-h-[520px] rounded-2xl shadow-2xl border border-border bg-background flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
            <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
              <Wand2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">⚡ Resolver com IA</p>
              <p className="text-[11px] opacity-80">Analisando: {pageName}</p>
            </div>
            <div className="flex items-center gap-1">
              {result && (
                <button
                  onClick={copyResult}
                  className="text-[10px] opacity-70 hover:opacity-100 bg-white/10 rounded-full p-1.5 transition-opacity"
                  title="Copiar resultado"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => { setOpen(false); setResult(null); }}
                className="text-[10px] opacity-70 hover:opacity-100 bg-white/10 rounded-full p-1.5 transition-opacity"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-3 min-h-[200px] max-h-[400px]">
            {loading && !result && (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="relative">
                  <Loader2 className="h-10 w-10 text-amber-500 animate-spin" />
                  <Sparkles className="h-4 w-4 text-amber-400 absolute -top-1 -right-1 animate-pulse" />
                </div>
                <p className="text-sm text-muted-foreground animate-pulse">Analisando a página...</p>
                <p className="text-xs text-muted-foreground/60">Identificando problemas e oportunidades</p>
              </div>
            )}

            {result && (
              <div className="space-y-3">
                {/* Tabs */}
                <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
                  <button
                    onClick={() => setActiveTab("corrected")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-md transition-all",
                      activeTab === "corrected" ? "bg-green-500/10 text-green-600 dark:text-green-400 shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Check className="h-3 w-3" /> Corrigido
                  </button>
                  <button
                    onClick={() => setActiveTab("optimized")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-md transition-all",
                      activeTab === "optimized" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Rocket className="h-3 w-3" /> Otimizado
                  </button>
                  <button
                    onClick={() => setActiveTab("suggestions")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-md transition-all",
                      activeTab === "suggestions" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Lightbulb className="h-3 w-3" /> Sugestões
                  </button>
                </div>

                {/* Result content */}
                <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0 text-sm">
                  <ReactMarkdown>{result}</ReactMarkdown>
                </div>
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border bg-muted/30">
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setOpen(false); setResult(null); }}
              className="flex-1 text-xs"
            >
              Fechar
            </Button>
            <Button
              size="sm"
              onClick={handleResolve}
              disabled={loading}
              className="flex-1 text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
              Reanalisar
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
