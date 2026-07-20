import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Search, Plus, Upload, RefreshCcw, MoreHorizontal, Ban, Check, Users2, Trash2, MessageCircle } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { useContacts, useContactGroups, useContactMutations, useContactGroupMutations, normalizePhone, type Contact } from "@/hooks/useContacts";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";

export default function Contatos() {
  const [tab, setTab] = useState("contacts");
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "blocked" | "all">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showNew, setShowNew] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showGroupDlg, setShowGroupDlg] = useState(false);

  const companyId = useActiveCompanyId();
  const { data: contacts = [], isLoading } = useContacts({
    search, groupId: groupFilter === "all" ? null : groupFilter, status: statusFilter,
  });
  const { data: groups = [] } = useContactGroups();
  const { toggleBlock, bulkGroup } = useContactMutations();

  const toggleOne = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };
  const toggleAll = () => {
    if (selected.size === contacts.length) setSelected(new Set());
    else setSelected(new Set(contacts.map(c => c.id)));
  };

  const groupById = useMemo(() => new Map(groups.map(g => [g.id, g])), [groups]);

  const syncContacts = async () => {
    if (!companyId) return;
    toast.loading("Sincronizando com WhatsApp...", { id: "sync" });
    const { data, error } = await supabase.functions.invoke("uazapi-contacts-sync", { body: { tenant_id: companyId } });
    toast.dismiss("sync");
    if (error) toast.error("Falha na sincronização"); else toast.success(`Sincronizado: ${data?.inserted ?? 0} novos, ${data?.updated ?? 0} atualizados`);
  };

  return (
    <PageContainer title="Contatos" subtitle="Registro unificado de contatos do WhatsApp">
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="contacts">Contatos</TabsTrigger>
          <TabsTrigger value="groups">Grupos de contatos</TabsTrigger>
          <TabsTrigger value="imports">Histórico de importações</TabsTrigger>
        </TabsList>

        {/* ================= CONTACTS ================= */}
        <TabsContent value="contacts" className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou telefone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Grupo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os grupos</SelectItem>
                {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="blocked">Bloqueados</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={syncContacts}><RefreshCcw className="h-4 w-4 mr-1.5" />Sincronizar</Button>
              <Button variant="outline" size="sm" onClick={() => setShowImport(true)}><Upload className="h-4 w-4 mr-1.5" />Importar</Button>
              <Button size="sm" onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-1.5" />Novo contato</Button>
            </div>
          </div>

          {selected.size > 0 && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2 text-sm">
              <span>{selected.size} selecionado(s)</span>
              <div className="ml-auto flex gap-2">
                <Select onValueChange={(v) => bulkGroup.mutate({ ids: [...selected], groupId: v === "none" ? null : v })}>
                  <SelectTrigger className="h-8 w-[180px]"><SelectValue placeholder="Aplicar grupo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Remover grupo</SelectItem>
                    {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Limpar</Button>
              </div>
            </div>
          )}

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox checked={selected.size > 0 && selected.size === contacts.length} onCheckedChange={toggleAll} />
                    </TableHead>
                    <TableHead>Nome / Telefone</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Última interação</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Carregando...</TableCell></TableRow>
                  )}
                  {!isLoading && contacts.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Nenhum contato encontrado</TableCell></TableRow>
                  )}
                  {contacts.map((c) => {
                    const g = c.contact_group_id ? groupById.get(c.contact_group_id) : null;
                    const isBlocked = c.status === "blocked";
                    return (
                      <TableRow key={c.id} className={isBlocked ? "opacity-60" : ""}>
                        <TableCell><Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleOne(c.id)} /></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              {c.avatar_url && <AvatarImage src={c.avatar_url} />}
                              <AvatarFallback className="text-[10px]">{c.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">{c.name}</div>
                              <div className="text-xs text-muted-foreground">{c.phone}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {g ? (
                            <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: g.color }}>{g.name}</span>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {c.last_interaction_at ? formatDistanceToNow(new Date(c.last_interaction_at), { locale: ptBR, addSuffix: true }) : "—"}
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{sourceLabel(c.source)}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={isBlocked ? "destructive" : "default"} className="text-[10px]">
                            {isBlocked ? "Bloqueado" : "Ativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => toggleBlock.mutate({ phone: c.phone, block: !isBlocked })}>
                                {isBlocked ? <><Check className="h-4 w-4 mr-2" />Desbloquear</> : <><Ban className="h-4 w-4 mr-2" />Bloquear</>}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem disabled={isBlocked} onClick={() => window.location.href = `/accord-stack?phone=${c.phone}`}>
                                <MessageCircle className="h-4 w-4 mr-2" />Abrir conversa
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= GROUPS ================= */}
        <TabsContent value="groups" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowGroupDlg(true)}><Plus className="h-4 w-4 mr-1.5" />Novo grupo</Button>
          </div>
          <GroupsList onCountFor={(id) => contacts.filter(c => c.contact_group_id === id).length} />
        </TabsContent>

        {/* ================= IMPORTS ================= */}
        <TabsContent value="imports">
          <ImportsHistory />
        </TabsContent>
      </Tabs>

      {showNew && <NewContactDialog open onClose={() => setShowNew(false)} groups={groups} />}
      {showImport && <ImportDialog open onClose={() => setShowImport(false)} groups={groups} />}
      {showGroupDlg && <NewGroupDialog open onClose={() => setShowGroupDlg(false)} />}
    </PageContainer>
  );
}

function sourceLabel(s: string) {
  return { whatsapp_auto: "Auto", manual: "Manual", import: "Import", crm_lead: "CRM" }[s] ?? s;
}

// =============== Groups tab ===============
function GroupsList({ onCountFor }: { onCountFor: (id: string) => number }) {
  const { data: groups = [] } = useContactGroups();
  const { remove, update } = useContactGroupMutations();
  const [editing, setEditing] = useState<{ id: string; name: string; color: string } | null>(null);

  return (
    <>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Cor</TableHead><TableHead>Contatos</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
          <TableBody>
            {groups.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">Nenhum grupo</TableCell></TableRow>}
            {groups.map(g => (
              <TableRow key={g.id}>
                <TableCell className="font-medium">{g.name}</TableCell>
                <TableCell><span className="inline-block w-6 h-6 rounded-full border" style={{ backgroundColor: g.color }} /></TableCell>
                <TableCell>{onCountFor(g.id)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditing({ id: g.id, name: g.name, color: g.color })}>Editar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => remove.mutate(g.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
      {editing && (
        <Dialog open onOpenChange={() => setEditing(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar grupo</DialogTitle><DialogDescription>Renomear e alterar cor.</DialogDescription></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>Cor</Label><Input type="color" value={editing.color} onChange={(e) => setEditing({ ...editing, color: e.target.value })} className="h-10 w-20" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={() => { update.mutate({ id: editing.id, name: editing.name, color: editing.color }, { onSuccess: () => setEditing(null) }); }}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// =============== Imports History ===============
function ImportsHistory() {
  const companyId = useActiveCompanyId();
  const { data: imports = [] } = useQuery({
    queryKey: ["contact-imports", companyId], enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase.from("contact_imports").select("*").eq("company_id", companyId!).order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });
  return (
    <Card><CardContent className="p-0">
      <Table>
        <TableHeader><TableRow><TableHead>Arquivo</TableHead><TableHead>Data</TableHead><TableHead>Total</TableHead><TableHead>Sucesso</TableHead><TableHead>Erros</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>
          {imports.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Nenhuma importação</TableCell></TableRow>}
          {imports.map((imp: any) => (
            <TableRow key={imp.id}>
              <TableCell className="font-medium text-sm">{imp.file_name}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{new Date(imp.created_at).toLocaleString("pt-BR")}</TableCell>
              <TableCell>{imp.total_rows}</TableCell>
              <TableCell className="text-emerald-500">{imp.success_count}</TableCell>
              <TableCell className={imp.error_count > 0 ? "text-destructive" : ""}>{imp.error_count}</TableCell>
              <TableCell><Badge variant="outline" className="text-[10px]">{imp.status}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent></Card>
  );
}

// =============== Dialogs ===============
function NewContactDialog({ open, onClose, groups }: { open: boolean; onClose: () => void; groups: any[] }) {
  const { create } = useContactMutations();
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const [groupId, setGroupId] = useState<string>("none"); const [addToWa, setAddToWa] = useState(true);
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo contato</DialogTitle><DialogDescription>Adicionar contato ao registro do tenant.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome *</Label><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
          <div><Label>Telefone (com DDI/DDD) *</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="5511999999999" /></div>
          <div><Label>Grupo</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem grupo</SelectItem>
                {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={addToWa} onCheckedChange={(v) => setAddToWa(!!v)} />
            Salvar também na agenda do WhatsApp conectado
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!name || !phone} onClick={() => create.mutate({
            name, phone, group_id: groupId === "none" ? null : groupId, alsoAddToWhatsApp: addToWa,
          }, { onSuccess: onClose })}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewGroupDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { create } = useContactGroupMutations();
  const [name, setName] = useState(""); const [color, setColor] = useState("#8B5CF6");
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo grupo de contatos</DialogTitle><DialogDescription>Tag interna para segmentar contatos.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
          <div><Label>Cor</Label><Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-20" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!name} onClick={() => create.mutate({ name, color }, { onSuccess: onClose })}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportDialog({ open, onClose, groups }: { open: boolean; onClose: () => void; groups: any[] }) {
  const companyId = useActiveCompanyId();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Array<{ name: string; phone: string; group?: string }>>([]);
  const [groupId, setGroupId] = useState<string>("none");
  const [busy, setBusy] = useState(false);

  const parseFile = async (f: File) => {
    const buf = await f.arrayBuffer();
    const wb = XLSX.read(buf);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
    const parsed = raw.map((r) => ({
      name: String(r.name ?? r.nome ?? r.Nome ?? r.NAME ?? "").trim(),
      phone: normalizePhone(String(r.phone ?? r.telefone ?? r.Telefone ?? r.PHONE ?? "")),
      group: String(r.group ?? r.grupo ?? r.Grupo ?? "").trim() || undefined,
    })).filter(r => r.name && r.phone);
    setFile(f);
    setRows(parsed);
  };

  const doImport = async () => {
    if (!companyId || rows.length === 0) return;
    setBusy(true);
    let success = 0; const errors: any[] = [];
    for (const r of rows) {
      try {
        const gid = groupId === "none" ? null : groupId;
        const { error } = await supabase.from("whatsapp_contacts").upsert({
          company_id: companyId, name: r.name, phone: r.phone,
          source: "import", status: "active", contact_group_id: gid, name_manually_edited: true,
        }, { onConflict: "company_id,phone" as any });
        if (error) throw error;
        success++;
      } catch (e: any) {
        errors.push({ row: r, error: e.message });
      }
    }
    await supabase.from("contact_imports").insert({
      company_id: companyId, file_name: file?.name ?? "import.csv",
      total_rows: rows.length, success_count: success, error_count: errors.length,
      errors, contact_group_id: groupId === "none" ? null : groupId, status: errors.length === 0 ? "completed" : "partial",
    });
    setBusy(false);
    qc.invalidateQueries({ queryKey: ["contacts"] });
    qc.invalidateQueries({ queryKey: ["contact-imports"] });
    toast.success(`${success}/${rows.length} contatos importados`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Importar contatos</DialogTitle><DialogDescription>CSV ou XLSX com colunas: nome, telefone, grupo (opcional).</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <Input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => e.target.files?.[0] && parseFile(e.target.files[0])} />
          {rows.length > 0 && (
            <>
              <div className="text-sm text-muted-foreground">{rows.length} linhas válidas encontradas</div>
              <div>
                <Label>Aplicar grupo (opcional)</Label>
                <Select value={groupId} onValueChange={setGroupId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem grupo</SelectItem>
                    {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="max-h-48 overflow-auto rounded border">
                <Table>
                  <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Telefone</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {rows.slice(0, 20).map((r, i) => (
                      <TableRow key={i}><TableCell className="text-sm">{r.name}</TableCell><TableCell className="text-xs text-muted-foreground">{r.phone}</TableCell></TableRow>
                    ))}
                    {rows.length > 20 && <TableRow><TableCell colSpan={2} className="text-center text-xs text-muted-foreground">... +{rows.length - 20} linhas</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button disabled={rows.length === 0 || busy} onClick={doImport}>{busy ? "Importando..." : `Importar ${rows.length}`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
