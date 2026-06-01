import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { BarChart3, Plus, Trash2, Loader2 } from "lucide-react";

interface CreatePollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  servidorId: string;
  userId: string;
  onCreated?: (messageId: string, pollId: string) => void;
}
interface OptionDraft { id: string; text: string; }
const uid = () => Math.random().toString(36).slice(2, 10);

export function CreatePollDialog({ open, onOpenChange, conversationId, servidorId, userId, onCreated }: CreatePollDialogProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<OptionDraft[]>([{ id: uid(), text: "" }, { id: uid(), text: "" }]);
  const [multi, setMulti] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setQuestion("");
    setOptions([{ id: uid(), text: "" }, { id: uid(), text: "" }]);
    setMulti(false); setAnonymous(false);
  };

  const handleCreate = async () => {
    const q = question.trim();
    const opts = options.map((o) => ({ id: o.id, text: o.text.trim() })).filter((o) => o.text);
    if (!q) return toast.error("Adicione uma pergunta");
    if (opts.length < 2) return toast.error("Adicione pelo menos 2 opções");

    setBusy(true);
    try {
      const { data: msg, error: e1 } = await supabase
        .from("collab_messages")
        .insert({
          conversation_id: conversationId,
          servidor_id: servidorId,
          sender_id: userId,
          content: "[[poll]]",
          attachments: [],
        } as any)
        .select()
        .single();
      if (e1 || !msg) throw e1 || new Error("Falha ao criar mensagem");

      const { data: poll, error: e2 } = await supabase
        .from("collab_polls" as any)
        .insert({
          servidor_id: servidorId,
          conversation_id: conversationId,
          message_id: (msg as any).id,
          created_by: userId,
          question: q,
          options: opts,
          multi,
          anonymous,
          show_voters: !anonymous,
        })
        .select()
        .single();
      if (e2 || !poll) throw e2 || new Error("Falha ao criar enquete");

      toast.success("Enquete criada!");
      onCreated?.((msg as any).id, (poll as any).id);
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro ao criar enquete", { description: err?.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" /> Criar enquete
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <label className="text-[12px] font-semibold text-gray-700 uppercase tracking-wider mb-1.5 block">Pergunta</label>
            <input
              autoFocus value={question} onChange={(e) => setQuestion(e.target.value)}
              placeholder="O que você quer perguntar?" maxLength={200}
              className="w-full h-10 px-3.5 rounded-lg border border-gray-200 bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-[14px] text-gray-800 placeholder:text-gray-400 transition"
            />
          </div>

          <div>
            <label className="text-[12px] font-semibold text-gray-700 uppercase tracking-wider mb-1.5 block">Opções</label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-gray-400 w-5 shrink-0">{i + 1}.</span>
                  <input
                    value={opt.text}
                    onChange={(e) => setOptions((prev) => prev.map((o) => (o.id === opt.id ? { ...o, text: e.target.value } : o)))}
                    placeholder={`Opção ${i + 1}`} maxLength={120}
                    className="flex-1 h-9 px-3 rounded-lg border border-gray-200 bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-[13.5px] text-gray-800 placeholder:text-gray-400 transition"
                  />
                  {options.length > 2 && (
                    <button onClick={() => setOptions((prev) => prev.filter((o) => o.id !== opt.id))} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition" title="Remover">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 10 && (
              <button onClick={() => setOptions((prev) => [...prev, { id: uid(), text: "" }])} className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-emerald-600 hover:text-emerald-700">
                <Plus className="w-3.5 h-3.5" /> Adicionar opção
              </button>
            )}
          </div>

          <div className="border-t border-gray-100 pt-3 space-y-2">
            <Toggle label="Permitir múltipla escolha" sub="Cada pessoa pode votar em mais de uma opção" checked={multi} onChange={setMulti} />
            <Toggle label="Votação anônima" sub="Não mostra quem votou em cada opção" checked={anonymous} onChange={setAnonymous} />
          </div>
        </div>

        <DialogFooter className="mt-2">
          <button onClick={() => onOpenChange(false)} className="h-9 px-4 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-gray-100 transition">Cancelar</button>
          <button onClick={handleCreate} disabled={busy} className="h-9 px-4 rounded-lg text-[13px] font-semibold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 inline-flex items-center gap-1.5 transition">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Criar enquete
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Toggle({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void; }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1">
        <div className="text-[13px] font-medium text-gray-800">{label}</div>
        {sub && <div className="text-[11.5px] text-gray-500">{sub}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-[38px] h-[22px] rounded-full transition shrink-0 ${checked ? "bg-emerald-500" : "bg-gray-300"}`}
        aria-pressed={checked}
      >
        <span className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-[2px]"}`} />
      </button>
    </div>
  );
}
