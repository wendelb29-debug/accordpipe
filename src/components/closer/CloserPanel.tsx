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
  const [methodology, setMethodology] = useState<string>("save-car");
  const [saveCarTab, setSaveCarTab] = useState<string>("individual");
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
          <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Closer — Painel de Apoio</h1>
          <div className="flex items-center gap-1 rounded-full bg-slate-900 text-white px-2 py-0.5 text-[10px] font-bold">
            <Zap className="h-3 w-3 fill-current" /> SDR OS
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

      {/* Sub Tabs */}
      <div className="px-4 py-2 flex items-center gap-1 border-b border-border/50 overflow-x-auto no-scrollbar bg-slate-50/50">
        {["Atendimento", "DISC", "Metodologias", "Save Car", "iGreen", "Objeções"].map((t) => (
          <button
            key={t}
            onClick={() => {
              setMethodology(t.toLowerCase().replace(" ", "-"));
              if (t === "Save Car") setSaveCarTab("individual");
            }}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap",
              methodology === t.toLowerCase().replace(" ", "-") 
                ? "bg-slate-900 text-white" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {methodology === 'save-car' && (
        <div className="px-4 py-2 flex items-center gap-1 border-b border-border/50 overflow-x-auto no-scrollbar bg-white">
          {["Individual", "Importar Planilha", "Sorteio", "Cadência", "Accord Sales"].map((t) => (
            <button
              key={t}
              onClick={() => setSaveCarTab(t.toLowerCase().replace(" ", "-"))}
              className={cn(
                "px-3 py-1.5 text-[10px] font-bold rounded-lg transition-colors whitespace-nowrap",
                saveCarTab === t.toLowerCase().replace(" ", "-") 
                  ? "bg-blue-100 text-blue-700" 
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {methodology === 'save-car' && saveCarTab === 'individual' ? (
          <SaveCarIndividual />
        ) : (
          <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto w-full">
            {/* Hero Card */}
            <div className="relative overflow-hidden rounded-[24px] bg-[#0F172A] p-6 sm:p-8 text-white shadow-xl">
              <div className="relative z-10">
                <h2 className="text-2xl sm:text-3xl font-black mb-2">Recuperação de Associados</h2>
                <p className="text-slate-300 text-sm sm:text-base opacity-90 max-w-lg">Fluxo consultivo de alto impacto para contratos inativos.</p>
              </div>
              <div className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 opacity-10">
                <Shield className="h-24 w-24 sm:h-32 w-32" />
              </div>
            </div>

            {/* Client Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input
                placeholder="Nome do associado"
                value={clientData.name}
                onChange={(e) => setClientData(prev => ({ ...prev, name: e.target.value }))}
                className="h-12 rounded-xl"
              />
              <Input
                placeholder="Veículo (Placa/Modelo)"
                value={clientData.vehicle}
                onChange={(e) => setClientData(prev => ({ ...prev, vehicle: e.target.value }))}
                className="h-12 rounded-xl"
              />
              <Input
                placeholder="WhatsApp (com DDD)"
                value={clientData.phone}
                onChange={(e) => setClientData(prev => ({ ...prev, phone: e.target.value }))}
                className="h-12 rounded-xl"
              />
            </div>

            {/* Flow Steps */}
            <div className="space-y-4">
              {sortedScripts.map((script) => {
                const isActive = activeStepKey === script.step_key;
                const selectedBranchKey = selectedBranches[script.step_key];
                
                return (
                  <div 
                    key={script.id} 
                    className={cn(
                      "group rounded-[20px] border p-5 sm:p-6 transition-all",
                      isActive ? "border-slate-900 bg-white shadow-md ring-1 ring-slate-900/5" : "border-border bg-card opacity-80"
                    )}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl font-bold",
                          isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400"
                        )}>
                          {script.sort_order + 1}
                        </div>
                        <h3 className="text-lg font-black text-slate-900">{script.title}</h3>
                      </div>
                      
                      {isActive && (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <CopyButton 
                            text={getProcessedText(script.content)} 
                            onCopy={() => handleAction('copy', script)}
                          />
                          {channel === 'whatsapp' && (
                            <Button 
                              onClick={() => handleAction('whatsapp', script)}
                              className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-9 gap-2 px-4 font-bold"
                            >
                              <MessageCircle className="h-4 w-4 fill-current" /> WhatsApp
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="relative rounded-2xl bg-slate-50 border border-slate-100 p-4 sm:p-5">
                      <p className="text-sm sm:text-base leading-relaxed text-slate-700">
                        {getProcessedText(script.content)}
                      </p>
                    </div>

                    {/* Branches */}
                    {script.branches && script.branches.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {script.branches.map((branch) => (
                          <button
                            key={branch.id}
                            onClick={() => handleAction('branch', script, branch)}
                            className={cn(
                              "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                              selectedBranchKey === branch.branch_key 
                                ? "bg-slate-900 border-slate-900 text-white" 
                                : "bg-white border-border text-slate-600 hover:border-slate-300"
                            )}
                          >
                            {branch.label}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Branch Content (if selected) */}
                    {selectedBranchKey && script.branches?.find(b => b.branch_key === selectedBranchKey)?.branch_content && (
                      <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-100 relative group/branch">
                          <p className="text-sm text-blue-900 pr-8">
                            {getProcessedText(script.branches.find(b => b.branch_key === selectedBranchKey)!.branch_content!)}
                          </p>
                          <div className="absolute top-3 right-3 flex gap-1">
                            <CopyButton 
                              text={getProcessedText(script.branches.find(b => b.branch_key === selectedBranchKey)!.branch_content!)}
                            />
                            {channel === 'whatsapp' && (
                              <Button 
                                size="icon"
                                variant="ghost"
                                onClick={() => handleAction('whatsapp', script, script.branches?.find(b => b.branch_key === selectedBranchKey))}
                                className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-border/50">
              <Button 
                variant="ghost" 
                onClick={resetSession}
                className="text-slate-400 hover:text-slate-600"
              >
                <RotateCcw className="h-4 w-4 mr-2" /> Limpar Atendimento
              </Button>
              
              <Button 
                className="bg-slate-900 text-white rounded-xl px-8"
                disabled={!currentSessionId}
                onClick={() => {
                  updateSession.mutate({ id: currentSessionId!, status: 'completed' });
                  toast.success("Atendimento concluído e registrado!");
                  resetSession();
                }}
              >
                Registrar e Finalizar
              </Button>
            </div>
          </div>
        )}
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
