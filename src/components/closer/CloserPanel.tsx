import { useState, useEffect, useMemo } from "react";
import { 
  Phone, MessageSquare, Copy, Check, Zap, Shield, 
  MessageCircle, User, CheckCircle, RotateCcw, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCloser, type Script, type ScriptBranch } from "@/hooks/useCloser";
import { toast } from "sonner";
import { SaveCarIndividual } from "./SaveCarIndividual";

function CopyButton({ text, onCopy }: { text: string; onCopy?: () => void }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    try { 
      await navigator.clipboard.writeText(text); 
      setCopied(true); 
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
      toast.success("Script copiado!");
    } catch {
      toast.error("Erro ao copiar script");
    }
  };
  return (
    <Button 
      variant="outline" 
      size="icon" 
      onClick={handle}
      className="h-8 w-8 rounded-lg"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
    </Button>
  );
}

export function CloserPanel() {
  const [methodology] = useState<string>("save-car");
  const [saveCarTab] = useState<string>("individual");
  const [channel, setChannel] = useState<'whatsapp' | 'call'>('whatsapp');
  const [clientData, setClientData] = useState({
    name: "",
    vehicle: "",
    phone: "",
    notes: ""
  });
  
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [activeStepKey, setActiveStepKey] = useState<string>("abertura");
  const [selectedBranches, setSelectedBranches] = useState<Record<string, string>>({});

  const { playbooks, scripts, createSession, logEvent, updateSession } = useCloser();

  const currentPlaybook = useMemo(() => 
    playbooks?.find(p => p.name.toLowerCase().includes(methodology)),
    [playbooks, methodology]
  );

  const { scripts: playbookScripts } = useCloser(currentPlaybook?.id);

  const sortedScripts = useMemo(() => 
    playbookScripts?.sort((a, b) => a.sort_order - b.sort_order) || [],
    [playbookScripts]
  );

  const startSession = async () => {
    if (!currentPlaybook) return;
    try {
      const session = await createSession.mutateAsync({
        playbook_id: currentPlaybook.id,
        client_name: clientData.name,
        client_phone: clientData.phone,
        metadata: { vehicle: clientData.vehicle, methodology }
      });
      setCurrentSessionId(session.id);
      setActiveStepKey("abertura");
      toast.success("Atendimento iniciado");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao iniciar sessão");
    }
  };

  const handleAction = async (type: 'copy' | 'whatsapp' | 'branch', script: Script, branch?: ScriptBranch) => {
    if (!currentSessionId) {
      // Auto-start session if not started
      await startSession();
    }

    if (currentSessionId) {
      logEvent.mutate({
        session_id: currentSessionId,
        event_type: type,
        step_key: script.step_key,
        branch_key: branch?.branch_key,
        content: getProcessedText(branch?.branch_content || script.content)
      });
    }

    if (type === 'whatsapp') {
      const phone = clientData.phone.replace(/\D/g, "");
      if (!phone) {
        toast.error("Informe o WhatsApp do associado.");
        return;
      }
      const text = branch ? branch.branch_content || script.content : script.content;
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(getProcessedText(text))}`;
      window.open(url, "_blank");
    }
    
    if (type === 'branch' && branch) {
      setSelectedBranches(prev => ({ ...prev, [script.step_key]: branch.branch_key }));
      if (branch.next_step_key) {
        setActiveStepKey(branch.next_step_key);
      }
    }
  };

  const getProcessedText = (text: string) => {
    if (!text) return "";
    return text
      .replace(/\[Nome\]/g, clientData.name || "[Nome]")
      .replace(/\[Placa\/Modelo\]/g, clientData.vehicle || "[Placa/Modelo]")
      .replace(/\[Empresa\]/g, "Save Car")
      .replace(/\[ValorIndicação\]/g, "R$ 50,00");
  };

  const resetSession = () => {
    if (window.confirm("Limpar atendimento atual?")) {
      setCurrentSessionId(null);
      setClientData({ name: "", vehicle: "", phone: "", notes: "" });
      setSelectedBranches({});
      setActiveStepKey("abertura");
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background font-sans">
      {/* Header */}
      <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border/50 gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Closer — Individual</h1>
          <div className="flex items-center gap-1 rounded-full bg-slate-900 text-white px-2 py-0.5 text-[10px] font-bold">
            <Zap className="h-3 w-3 fill-current" /> Recuperação de Associados
          </div>
        </div>
        
        <div className="flex items-center bg-slate-100 rounded-xl p-1 w-full sm:w-auto">
          <button 
            onClick={() => setChannel('call')}
            className={cn(
              "flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2",
              channel === 'call' ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
            )}
          >
            <Phone className="h-3.5 w-3.5" /> Ligação
          </button>
          <button 
            onClick={() => setChannel('whatsapp')}
            className={cn(
              "flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2",
              channel === 'whatsapp' ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
          </button>
        </div>
      </div>

      {/* Main Content - Only Individual Recovery */}
      <div className="flex-1 overflow-y-auto">
        <SaveCarIndividual />
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
