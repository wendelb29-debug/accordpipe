import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Paperclip, Loader2, X, ChevronsUpDown, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkspaceLite {
  id: string;
  name: string;
}
interface ColumnLite {
  id: string;
  name: string;
  workspace_id: string;
  position: number;
  color?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  workspaces: WorkspaceLite[];
  columnsByWs: Record<string, ColumnLite[]>;
  onCreated: () => void;
}

interface RegOpt { id: string; name: string; document: string | null; email: string | null; }
interface TagOpt { id: string; name: string; color: string; }

const MAX_FILE = 15 * 1024 * 1024;

// Simple CPF/CNPJ heuristic: 11 or 14 digits after stripping non-digits
function looksLikeDoc(s: string): boolean {
  const d = s.replace(/\D/g, "");
  return d.length === 11 || d.length === 14;
}
function norm(s: string) {
  return s.trim().toLowerCase();
}

interface ComboProps {
  label: string;
  placeholder: string;
  value: string;
  options: RegOpt[];
  onSelect: (name: string) => void;
  onCreate: (typed: string) => Promise<void>;
  creating: boolean;
}

function EntityCombobox({ label, placeholder, value, options, onSelect, onCreate, creating }: ComboProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = norm(query);
    if (!q) return options.slice(0, 50);
    const digits = q.replace(/\D/g, "");
    return options
      .filter(o =>
        norm(o.name).includes(q)
        || norm(o.email || "").includes(q)
        || (digits && (o.document || "").replace(/\D/g, "").includes(digits))
      )
      .slice(0, 50);
  }, [options, query]);

  const exactMatch = useMemo(() => {
    const q = norm(query);
    if (!q) return false;
    return options.some(o => norm(o.name) === q);
  }, [options, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal"
          type="button"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Buscar ${label.toLowerCase()}...`}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {query.trim() && !exactMatch && (
              <CommandGroup>
                <CommandItem
                  disabled={creating}
                  onSelect={async () => {
                    await onCreate(query.trim());
                    setQuery("");
                    setOpen(false);
                  }}
                  className="text-primary"
                >
                  {creating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  NOVO "{query.trim()}"
                </CommandItem>
              </CommandGroup>
            )}
            {filtered.length === 0 && !query.trim() && (
              <CommandEmpty>Digite para buscar...</CommandEmpty>
            )}
            {filtered.length > 0 && (
              <CommandGroup>
                {filtered.map((o) => (
                  <CommandItem
                    key={o.id}
                    value={o.name}
                    onSelect={() => {
                      onSelect(o.name);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === o.name ? "opacity-100" : "opacity-0")} />
                    <div className="flex flex-col">
                      <span className="text-sm">{o.name}</span>
                      {o.document && (
                        <span className="text-xs text-muted-foreground">{o.document}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function NewRequestDialog({ open, onOpenChange, workspaces, columnsByWs, onCreated }: Props) {
  const { profile } = useAuth();
  const companyId = useActiveCompanyId();

  const [workspaceId, setWorkspaceId] = useState("");
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [forecastDate, setForecastDate] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [stage, setStage] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const [registrations, setRegistrations] = useState<RegOpt[]>([]);
  const [tags, setTags] = useState<TagOpt[]>([]);
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [creatingPerson, setCreatingPerson] = useState(false);

  const loadRegistrations = async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from("crm_client_registrations")
      .select("id,nome_completo,cpf")
      .eq("servidor_id", companyId)
      .order("nome_completo")
      .limit(1000);
    const list: RegOpt[] = (data || [])
      .map((c: any) => ({ id: c.id, name: c.nome_completo || "", document: c.cpf || null }))
      .filter((c) => c.name);
    setRegistrations(list);
  };

  useEffect(() => {
    if (!open || !companyId) return;
    (async () => {
      const { data: tgs } = await supabase
        .from("crm_tags")
        .select("id,name,color")
        .eq("servidor_id", companyId)
        .order("name");
      setTags((tgs || []) as TagOpt[]);
      await loadRegistrations();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, companyId]);

  const wsCols = useMemo(() => (workspaceId ? (columnsByWs[workspaceId] || []) : []), [workspaceId, columnsByWs]);

  useEffect(() => {
    if (wsCols.length > 0 && !wsCols.find(c => c.id === stage)) {
      setStage(wsCols[0].id);
    }
  }, [wsCols, stage]);

  const reset = () => {
    setWorkspaceId(""); setTitle(""); setCompanyName(""); setContactName("");
    setForecastDate(""); setSelectedTags([]); setStage(""); setNotes(""); setFile(null);
  };

  const toggleTag = (name: string) => {
    setSelectedTags((prev) => prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]);
  };

  const createRegistration = async (typed: string, setBusy: (b: boolean) => void, onDone: (name: string) => void) => {
    if (!companyId) {
      toast.error("Tenant não identificado");
      return;
    }
    const text = typed.trim();
    if (!text) return;
    setBusy(true);
    try {
      // De-dup case-insensitive within tenant
      const existing = registrations.find((r) => norm(r.name) === norm(text));
      if (existing) {
        onDone(existing.name);
        return;
      }
      const isDoc = looksLikeDoc(text);
      const payload: any = {
        servidor_id: companyId,
        nome_completo: isDoc ? "" : text,
        cpf: isDoc ? text : null,
        created_by_user_id: profile?.user_id || null,
        created_by_name: profile?.name || null,
      };
      // If typed value is a document, still use it as name too (fallback)
      if (isDoc) payload.nome_completo = text;
      const { data, error } = await supabase
        .from("crm_client_registrations")
        .insert(payload)
        .select("id,nome_completo,cpf")
        .single();
      if (error) throw error;
      const newOpt: RegOpt = { id: (data as any).id, name: (data as any).nome_completo || text, document: (data as any).cpf || null };
      setRegistrations((prev) => [newOpt, ...prev]);
      onDone(newOpt.name);
    } catch (err: any) {
      toast.error("Erro ao criar registro: " + (err?.message || ""));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!workspaceId) return toast.error("Escolha um workspace");
    if (!title.trim()) return toast.error("Informe um título");
    if (!companyName.trim()) return toast.error("Escolha uma empresa");
    if (!contactName.trim()) return toast.error("Escolha uma pessoa");
    if (!stage) return toast.error("Escolha uma etapa");
    if (!notes.trim()) return toast.error("Descreva a solicitação em observações");
    if (!companyId) return toast.error("Tenant não identificado");
    if (file && file.size > MAX_FILE) return toast.error("Arquivo maior que 15MB");

    setSaving(true);
    try {
      const { data: lead, error } = await supabase
        .from("crm_leads")
        .insert({
          servidor_id: companyId,
          workspace_id: workspaceId,
          stage,
          stage_entered_at: new Date().toISOString(),
          source: "Solicitação",
          company_name: companyName,
          contact_name: contactName,
          forecast_date: forecastDate || null,
          tags: selectedTags,
          notes: notes,
          request_title: title,
          request_notes: notes,
          is_request: true,
          created_by_user_id: profile?.user_id || null,
          created_by_name: profile?.name || null,
        } as any)
        .select()
        .single();

      if (error) throw error;

      if (file && lead) {
        const ext = file.name.split(".").pop();
        const filePath = `lead-docs/${lead.id}/solicitacao_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("contract-pdfs").upload(filePath, file, { contentType: file.type });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage.from("contract-pdfs").createSignedUrl(filePath, 86400);
        await (supabase as any).from("lead_documents").insert({
          lead_id: lead.id,
          servidor_id: companyId,
          doc_type: "solicitacao",
          file_name: file.name,
          file_url: signed?.signedUrl || "",
          file_path: filePath,
          file_size: file.size,
          uploaded_by_name: profile?.name || null,
          uploaded_by_user_id: profile?.user_id || null,
        });
      }

      await supabase.from("crm_lead_activities").insert({
        lead_id: lead.id,
        servidor_id: companyId,
        type: "note",
        title: "Solicitação aberta",
        description: `Solicitação "${title}" aberta por ${profile?.name || "usuário"}.`,
        created_by_user_id: profile?.user_id || null,
        created_by_name: profile?.name || null,
      } as any);

      toast.success("Solicitação criada!");
      reset();
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      toast.error("Erro ao criar solicitação: " + (err?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Solicitação</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Workspace *</Label>
            <Select value={workspaceId} onValueChange={setWorkspaceId}>
              <SelectTrigger><SelectValue placeholder="Selecione um workspace" /></SelectTrigger>
              <SelectContent>
                {workspaces.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Emissão de nota fiscal" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Empresa *</Label>
              <EntityCombobox
                label="Empresa"
                placeholder="Selecione uma empresa"
                value={companyName}
                options={registrations}
                onSelect={setCompanyName}
                onCreate={(t) => createRegistration(t, setCreatingCompany, setCompanyName)}
                creating={creatingCompany}
              />
            </div>
            <div>
              <Label>Pessoa *</Label>
              <EntityCombobox
                label="Pessoa"
                placeholder="Selecione uma pessoa"
                value={contactName}
                options={registrations}
                onSelect={setContactName}
                onCreate={(t) => createRegistration(t, setCreatingPerson, setContactName)}
                creating={creatingPerson}
              />
            </div>
          </div>

          <div>
            <Label>Data de Entrega</Label>
            <Input type="date" value={forecastDate} onChange={(e) => setForecastDate(e.target.value)} />
          </div>

          {tags.length > 0 && (
            <div>
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {tags.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTag(t.name)}
                    className={cn(
                      "text-xs px-2 py-1 rounded-full border transition",
                      selectedTags.includes(t.name) ? "text-white" : "text-foreground bg-transparent"
                    )}
                    style={selectedTags.includes(t.name) ? { backgroundColor: t.color, borderColor: t.color } : { borderColor: t.color }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {workspaceId && wsCols.length > 0 && (
            <div>
              <Label>Etapa *</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {wsCols.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setStage(c.id)}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-full border transition",
                      stage === c.id ? "text-white" : "bg-transparent"
                    )}
                    style={stage === c.id
                      ? { backgroundColor: c.color || "#3b82f6", borderColor: c.color || "#3b82f6" }
                      : { borderColor: c.color || "hsl(var(--border))" }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label>Observações *</Label>
            <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Descreva a solicitação..." />
          </div>

          <div>
            <Label>Anexar Documento (opcional, máx. 15MB)</Label>
            <div className="flex items-center gap-2 mt-1">
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background hover:bg-accent text-sm">
                  <Paperclip className="h-4 w-4" />
                  {file ? "Trocar arquivo" : "Escolher arquivo"}
                </span>
              </label>
              {file && (
                <Badge variant="secondary" className="gap-1">
                  {file.name}
                  <button type="button" onClick={() => setFile(null)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar Solicitação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
