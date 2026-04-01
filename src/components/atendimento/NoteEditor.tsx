import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Bold, Italic, List, Sparkles, Loader2, Wand2, PenLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NoteEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  leadContext?: string;
}

export function NoteEditor({ value, onChange, placeholder, leadContext }: NoteEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const wrapSelection = useCallback((before: string, after: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    if (selectedText) {
      // Check if already wrapped - if so, unwrap
      const beforeCheck = value.substring(start - before.length, start);
      const afterCheck = value.substring(end, end + after.length);

      if (beforeCheck === before && afterCheck === after) {
        const newValue = value.substring(0, start - before.length) + selectedText + value.substring(end + after.length);
        onChange(newValue);
        setTimeout(() => {
          textarea.selectionStart = start - before.length;
          textarea.selectionEnd = end - before.length;
          textarea.focus();
        }, 0);
      } else {
        const newValue = value.substring(0, start) + before + selectedText + after + value.substring(end);
        onChange(newValue);
        setTimeout(() => {
          textarea.selectionStart = start + before.length;
          textarea.selectionEnd = end + before.length;
          textarea.focus();
        }, 0);
      }
    } else {
      // No selection - insert markers and place cursor between them
      const newValue = value.substring(0, start) + before + after + value.substring(end);
      onChange(newValue);
      setTimeout(() => {
        textarea.selectionStart = start + before.length;
        textarea.selectionEnd = start + before.length;
        textarea.focus();
      }, 0);
    }
  }, [value, onChange]);

  const handleBold = () => wrapSelection("**", "**");
  const handleItalic = () => wrapSelection("_", "_");
  const handleList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const newValue = value.substring(0, lineStart) + "• " + value.substring(lineStart);
    onChange(newValue);
    setTimeout(() => {
      textarea.selectionStart = start + 2;
      textarea.selectionEnd = start + 2;
      textarea.focus();
    }, 0);
  };

  const handleAiAction = async (action: "improve" | "complete" | "suggest") => {
    if (action !== "suggest" && !value.trim()) {
      toast.error("Escreva algo primeiro para a IA melhorar.");
      return;
    }

    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("note-ai-assist", {
        body: {
          text: value,
          action,
          leadContext: leadContext || "",
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.content) {
        onChange(data.content);
        toast.success(
          action === "improve" ? "Nota melhorada pela IA!" :
          action === "complete" ? "Nota completada pela IA!" :
          "Sugestão gerada pela IA!"
        );
      }
    } catch (err: any) {
      console.error("AI assist error:", err);
      toast.error("Erro ao usar IA. Tente novamente.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      {/* Formatting toolbar */}
      <div className="flex items-center gap-0.5 border-b pb-1.5">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={handleBold}>
                <Bold className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p className="text-xs">Negrito (selecione o texto)</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={handleItalic}>
                <Italic className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p className="text-xs">Itálico (selecione o texto)</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={handleList}>
                <List className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p className="text-xs">Lista com marcadores</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex-1" />

        {/* AI Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[11px] gap-1.5 px-2.5"
              disabled={aiLoading}
            >
              {aiLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3 text-primary" />
              )}
              IA
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => handleAiAction("improve")} className="text-xs gap-2">
              <Wand2 className="h-3.5 w-3.5" /> Melhorar redação
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAiAction("complete")} className="text-xs gap-2">
              <PenLine className="h-3.5 w-3.5" /> Completar texto
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAiAction("suggest")} className="text-xs gap-2">
              <Sparkles className="h-3.5 w-3.5" /> Sugerir nota
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Textarea
        ref={textareaRef}
        className="text-xs min-h-[80px] border-0 p-0 focus-visible:ring-0 resize-y"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Escreva sua nota aqui..."}
      />
    </div>
  );
}
