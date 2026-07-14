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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Paperclip, Loader2, X, ChevronsUpDown, Plus, Check, AlertTriangle } from "lucide-react";
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

function looksLikeDoc(s: string): boolean {
  const d = s.replace(/\D/g, "");
  return d.length === 11 || d.length === 14;
}
function norm(s: string) {
  return s.trim().toLowerCase();
}

interface ComboProps {
  label: string;
  entityLabel: "empresa" | "pessoa";
  placeholder: string;
  value: string;
  isNew: boolean;
  options: RegOpt[];
  onSelect: (name: string) => void;
  onClear: () => void;
  onRequestCreate: (typed: string) => void;
}

function EntityCombobox({ label, entityLabel, placeholder, value, isNew, options, onSelect, onClear, onRequestCreate }: ComboProps) {
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

  if (value) {
    return (
      <div className="flex items-center gap-2 w-full h-10 px-3 rounded-md border border-input bg-background">
        <span className="truncate flex-1 text-sm">{value}</span>
        {isNew && (
          <Badge className="h-5 px-1.5 text-[10px] uppercase tracking-wide">Novo</Badge>
        )}
        <button
          type="button"
          onClick={onClear}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Limpar seleção"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal"
          type="button"
        >
          <span className="truncate text-muted-foreground">{placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Buscar ${entityLabel}...`}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {query.trim() && !exactMatch && (
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    onRequestCreate(query.trim());
                    setOpen(false);
                    setQuery("");
                  }}
                  className="text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
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
                      {(o.email || o.document) && (
                        <span className="text-xs text-muted-foreground">{o.email || o.document}</span>
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
  const [companyIsNew, setCompanyIsNew] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactIsNew, setContactIsNew] = useState(false);
  const [forecastDate, setForecastDate] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [stage, setStage] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const [registrations, setRegistrations] = useState<RegOpt[]>([]);
  const [tags, setTags] = useState<TagOpt[]>([]);

  // Confirm-create dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmKind, setConfirmKind] = useState<"empresa" | "pessoa">("empresa");
  const [confirmText, setConfirmText] = useState("");
  const [confirmSaving, setConfirmSaving] = useState(false);

  const loadRegistrations = async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from("crm_client_registrations")
      .select("id,nome_completo,cpf,email")
      .eq("servidor_id", companyId)
      .order("nome_completo")
      .limit(1000);
    const list: RegOpt[] = (data || [])
      .map((c: any) => ({ id: c.id, name: c.nome_completo || "", document: c.cpf || null, email: c.email || null }))
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
    setWorkspaceId(""); setTitle(""); setCompanyName(""); setCompanyIsNew(false);
    setContactName(""); setContactIsNew(false);
    setForecastDate(""); setSelectedTags([]); setStage(""); setNotes(""); setFile(null);
  };

  const toggleTag = (name: string) => {
    setSelectedTags((prev) => prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]);
  };

  const requestCreate = (kind: "empresa" | "pessoa", typed: string) => {
    setConfirmKind(kind);
    setConfirmText(typed);
    setConfirmOpen(true);
  };

  const confirmCreate = async () => {
    if (!companyId) {
      toast.error("Tenant não identificado");
      return;
    }
    const text = confirmText.trim();
    if (!text) return;
    setConfirmSaving(true);
    try {
      const isDoc = looksLikeDoc(text);
      const digits = text.replace(/\D/g, "");

      const { data: existing, error: qErr } = await supabase
        .from("crm_client_registrations")
        .select("id,nome_completo,cpf,email")
        .eq("servidor_id", companyId)
        .or(
          isDoc
            ? `nome_completo.ilike.%${text}%,cpf.eq.${digits}`
            : `nome_completo.ilike.%${text}%`
        );
      if (qErr) throw qErr;

      const dup = (existing || []).find((r: any) =>
        norm(r.nome_completo || "") === norm(text) ||
        (isDoc && (r.cpf || "").replace(/\D/g, "") === digits)
      );

      if (dup) {
        const existingOpt: RegOpt = {
          id: (dup as any).id,
          name: (dup as any).nome_completo || text,
          document: (dup as any).cpf || null,
          email: (dup as any).email || null,
        };
        setRegistrations((prev) => prev.find(p => p.id === existingOpt.id) ? prev : [existingOpt, ...prev]);
        if (confirmKind === "empresa") {
          setCompanyName(existingOpt.name);
          setCompanyIsNew(false);
        } else {
          setContactName(existingOpt.name);
          setContactIsNew(false);
        }
        toast.success(`${confirmKind === "empresa" ? "Empresa" : "Pessoa"} já cadastrada — selecionada automaticamente`);
        setConfirmOpen(false);
        return;
      }

      // Defer real insert until the lead exists (crm_client_registrations.lead_id is NOT NULL).
      // Mark it locally as a pending new entry so the field shows the "Novo" badge.
      const tempOpt: RegOpt = {
        id: `pending-${Date.now()}`,
        name: text,
        document: isDoc ? digits : null,
        email: null,
      };
      setRegistrations((prev) => [tempOpt, ...prev]);
      if (confirmKind === "empresa") {
        setCompanyName(tempOpt.name);
        setCompanyIsNew(true);
      } else {
        setContactName(tempOpt.name);
        setContactIsNew(true);
      }
      toast.success(`${confirmKind === "empresa" ? "Empresa" : "Pessoa"} pronta para cadastro`);
      setConfirmOpen(false);
    } catch (err: any) {
      toast.error("Erro ao verificar cadastro: " + (err?.message || ""));
    } finally {
      setConfirmSaving(false);
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
    <>
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => {
          const t = e.target as HTMLElement | null;
          if (t?.closest('[role="alertdialog"]')) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          const t = e.target as HTMLElement | null;
          if (t?.closest('[role="alertdialog"]') || confirmOpen) e.preventDefault();
        }}
      >
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
                entityLabel="empresa"
                placeholder="Selecione uma empresa"
                value={companyName}
                isNew={companyIsNew}
                options={registrations}
                onSelect={(n) => { setCompanyName(n); setCompanyIsNew(false); }}
                onClear={() => { setCompanyName(""); setCompanyIsNew(false); }}
                onRequestCreate={(t) => requestCreate("empresa", t)}
              />
            </div>
            <div>
              <Label>Pessoa *</Label>
              <EntityCombobox
                label="Pessoa"
                entityLabel="pessoa"
                placeholder="Selecione uma pessoa"
                value={contactName}
                isNew={contactIsNew}
                options={registrations}
                onSelect={(n) => { setContactName(n); setContactIsNew(false); }}
                onClear={() => { setContactName(""); setContactIsNew(false); }}
                onRequestCreate={(t) => requestCreate("pessoa", t)}
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

    <AlertDialog open={confirmOpen} onOpenChange={(o) => { if (!confirmSaving) setConfirmOpen(o); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <AlertDialogTitle>
              {confirmKind === "empresa" ? "Cadastrar nova empresa?" : "Cadastrar nova pessoa?"}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-2">
              <p>
                Tem certeza que esta {confirmKind === "empresa" ? "empresa" : "pessoa"} não está cadastrada no sistema?
              </p>
              <div className="rounded-md bg-muted px-3 py-2 text-sm font-medium text-foreground break-words">
                {confirmText}
              </div>
              <p className="text-xs text-muted-foreground">
                Verifique no cadastro antes de criar um novo registro.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={confirmSaving}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={confirmSaving}
            onClick={(e) => { e.preventDefault(); confirmCreate(); }}
          >
            {confirmSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Sim, cadastrar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
